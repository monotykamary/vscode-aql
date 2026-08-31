import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  Hover,
  SignatureHelp,
  SignatureInformation,
  ParameterInformation,
  Diagnostic,
  DiagnosticSeverity,
  DocumentSymbol,
  SymbolKind,
  Definition,
  Location,
  Range,
  Position,
  MarkupKind,
  InsertTextFormat,
  DidChangeConfigurationNotification
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { analyzer, CompletionContext } from './parser';
import { functionDocs, getKeywordInfo, getAllKeywordNames, getKeywordMarkdown } from './docs';
import {
  getConfig,
  getArangoClient,
  ArangoClient,
  CollectionInfo,
  ViewInfo,
  GraphInfo,
  ExtensionSettings
} from './arango';
import {
  extractEmbeddedAql,
  isPositionInRegion,
  EmbeddedRegion,
  toAbsolutePosition
} from './embedded';
import { IToken } from 'chevrotain';

// Create connection and document manager
const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// ArangoDB client and cached metadata
let arangoClient: ArangoClient | null = null;
let workspaceRoot: string | null = null;
let hasConfigurationCapability = false;

// Cached ArangoDB metadata
interface ArangoMetadata {
  collections: CollectionInfo[];
  views: ViewInfo[];
  graphs: GraphInfo[];
  connected: boolean;
}
let arangoMetadata: ArangoMetadata = {
  collections: [],
  views: [],
  graphs: [],
  connected: false
};

// Cache for parsed documents
interface ParsedRegion {
  tokens: IToken[];
  errors: { message: string; line: number; column: number; length: number }[];
  region?: EmbeddedRegion; // Present for embedded regions
}

interface DocumentCache {
  version: number;
  languageId: string;
  tokens: IToken[]; // Main tokens (for .aql files)
  errors: { message: string; line: number; column: number; length: number }[];
  embeddedRegions: ParsedRegion[]; // Embedded AQL regions (for JS/TS)
}
const documentCache: Map<string, DocumentCache> = new Map();

// =============================================================================
// INITIALIZATION
// =============================================================================

connection.onInitialize((params: InitializeParams): InitializeResult => {
  // Extract workspace root
  if (params.workspaceFolders && params.workspaceFolders.length > 0) {
    workspaceRoot = params.workspaceFolders[0].uri.replace('file://', '');
  } else if (params.rootUri) {
    workspaceRoot = params.rootUri.replace('file://', '');
  }

  // Check for configuration capability
  hasConfigurationCapability = !!(
    params.capabilities.workspace &&
    params.capabilities.workspace.configuration
  );

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['.', '(', ',', '@', ':']
      },
      hoverProvider: true,
      signatureHelpProvider: {
        triggerCharacters: ['(', ',']
      },
      documentSymbolProvider: true,
      definitionProvider: true
    }
  };
});

connection.onInitialized(async () => {
  if (hasConfigurationCapability) {
    // Register for configuration changes
    connection.client.register(DidChangeConfigurationNotification.type, {
      section: 'aql'
    });
  }

  // Initialize ArangoDB connection with default/file config
  await initializeArangoConnection({});
});

// =============================================================================
// CONFIGURATION HANDLING
// =============================================================================

interface AqlSettings {
  connection?: {
    url?: string;
    database?: string;
    username?: string;
    password?: string;
  };
  validation?: {
    enabled?: boolean;
    validateWithServer?: boolean;
  };
}

let globalSettings: AqlSettings = {};

connection.onDidChangeConfiguration(async (change) => {
  if (hasConfigurationCapability) {
    // Get the new settings
    const settings = await connection.workspace.getConfiguration({
      section: 'aql'
    });
    globalSettings = settings || {};
  } else {
    globalSettings = (change.settings?.aql || {}) as AqlSettings;
  }

  // Reinitialize ArangoDB connection
  await initializeArangoConnection(globalSettings.connection || {});

  // Revalidate all open documents
  documents.all().forEach(validateDocument);
});

async function initializeArangoConnection(settings: ExtensionSettings): Promise<void> {
  try {
    const config = getConfig(workspaceRoot, settings);
    arangoClient = getArangoClient(config);

    // Test connection
    const result = await arangoClient.testConnection();
    arangoMetadata.connected = result.success;

    if (result.success) {
      // Fetch metadata
      const [collections, views, graphs] = await Promise.all([
        arangoClient.getCollections(),
        arangoClient.getViews(),
        arangoClient.getGraphs()
      ]);

      arangoMetadata.collections = collections;
      arangoMetadata.views = views;
      arangoMetadata.graphs = graphs;

      connection.console.log(`Connected to ArangoDB at ${config.url}/${config.database}`);
      connection.console.log(`Found ${collections.length} collections, ${views.length} views, ${graphs.length} graphs`);
    } else {
      connection.console.log(`ArangoDB connection failed: ${result.error}`);
    }
  } catch (error) {
    arangoMetadata.connected = false;
    connection.console.log(`ArangoDB initialization error: ${error}`);
  }
}

// =============================================================================
// DOCUMENT CHANGE HANDLING & DIAGNOSTICS
// =============================================================================

documents.onDidChangeContent(change => {
  validateDocument(change.document);
});

function validateDocument(document: TextDocument): void {
  const text = document.getText();
  const languageId = document.languageId;
  const isAqlFile = languageId === 'aql';

  const cache: DocumentCache = {
    version: document.version,
    languageId,
    tokens: [],
    errors: [],
    embeddedRegions: []
  };

  const diagnostics: Diagnostic[] = [];

  if (isAqlFile) {
    // Parse the entire document as AQL
    const result = analyzer.parse(text);
    cache.tokens = result.tokens;
    cache.errors = result.errors;

    // Convert errors to diagnostics
    for (const error of result.errors) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: error.line - 1, character: error.column - 1 },
          end: { line: error.line - 1, character: error.column - 1 + error.length }
        },
        message: error.message,
        source: 'aql'
      });
    }
  } else {
    // Extract and parse embedded AQL regions
    const embeddedRegions = extractEmbeddedAql(text, languageId);

    for (const region of embeddedRegions) {
      const result = analyzer.parse(region.content);

      cache.embeddedRegions.push({
        tokens: result.tokens,
        errors: result.errors,
        region
      });

      // Convert errors with adjusted positions
      for (const error of result.errors) {
        const absPos = toAbsolutePosition(region, error.line, error.column);

        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line: absPos.line - 1, character: absPos.column - 1 },
            end: { line: absPos.line - 1, character: absPos.column - 1 + error.length }
          },
          message: error.message,
          source: 'aql'
        });
      }
    }
  }

  documentCache.set(document.uri, cache);
  connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

// =============================================================================
// COMPLETION
// =============================================================================

connection.onCompletion((params: TextDocumentPositionParams): CompletionItem[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const cache = documentCache.get(document.uri);
  if (!cache) return [];

  // For non-AQL files, check if we're in an embedded region
  if (cache.languageId !== 'aql') {
    const offset = document.offsetAt(params.position);
    const embeddedRegion = findEmbeddedRegionAtOffset(cache, offset);

    if (!embeddedRegion) {
      // Not in an AQL region, don't provide completions
      return [];
    }

    // Calculate relative position within the region
    const relativeOffset = offset - embeddedRegion.region!.startOffset;
    const { line, column } = offsetToLineColumn(embeddedRegion.region!.content, relativeOffset);

    const context = analyzer.getContextAtPosition(embeddedRegion.tokens, line, column);
    return buildCompletionItems(context);
  }

  const tokens = cache.tokens;

  // Get context at cursor position
  const context = analyzer.getContextAtPosition(
    tokens,
    params.position.line + 1,
    params.position.character + 1
  );

  return buildCompletionItems(context);
});

/**
 * Find embedded region at a given offset
 */
function findEmbeddedRegionAtOffset(cache: DocumentCache, offset: number): ParsedRegion | null {
  for (const parsed of cache.embeddedRegions) {
    if (parsed.region &&
        offset >= parsed.region.startOffset &&
        offset <= parsed.region.endOffset) {
      return parsed;
    }
  }
  return null;
}

/**
 * Convert offset to line/column within a string
 */
function offsetToLineColumn(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let column = 1;

  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }

  return { line, column };
}

/**
 * Build completion items based on context
 */
function buildCompletionItems(context: CompletionContext): CompletionItem[] {

  const items: CompletionItem[] = [];

  // Add context-aware completions
  if (context.inFunctionCall && context.currentFunction) {
    // Inside a function call - suggest based on function parameters
    const func = functionDocs.getFunction(context.currentFunction);
    if (func && func.parameters[context.argumentIndex]) {
      // Could add type-specific suggestions here
    }
  }

  // Add keywords (with context awareness)
  const keywords = getAllKeywordNames();
  for (const keyword of keywords) {
    const info = getKeywordInfo(keyword);
    if (!info) continue;

    // Filter keywords based on context
    if (context.inForLoop && keyword === 'FOR') continue; // Less likely to nest FOR immediately
    if (context.previousKeyword === 'FOR' && keyword !== 'IN') continue; // After FOR, IN is expected

    items.push({
      label: keyword,
      kind: CompletionItemKind.Keyword,
      detail: info.description,
      insertText: keyword,
      data: { type: 'keyword', name: keyword }
    });
  }

  // Add functions with snippets
  const functions = functionDocs.getAllFunctions();
  for (const func of functions) {
    const snippet = generateFunctionSnippet(func.name);
    items.push({
      label: func.name,
      kind: CompletionItemKind.Function,
      detail: `${func.category} function`,
      documentation: {
        kind: MarkupKind.Markdown,
        value: func.description
      },
      insertText: snippet,
      insertTextFormat: InsertTextFormat.Snippet,
      data: { type: 'function', name: func.name }
    });
  }

  // Add available variables
  for (const variable of context.availableVariables) {
    items.push({
      label: variable,
      kind: CompletionItemKind.Variable,
      detail: 'Variable',
      data: { type: 'variable', name: variable }
    });
  }

  // Add special variables
  items.push({
    label: 'CURRENT',
    kind: CompletionItemKind.Variable,
    detail: 'Current element in array operations',
    data: { type: 'special', name: 'CURRENT' }
  });

  items.push({
    label: 'NEW',
    kind: CompletionItemKind.Variable,
    detail: 'New document after INSERT/UPDATE/REPLACE',
    data: { type: 'special', name: 'NEW' }
  });

  items.push({
    label: 'OLD',
    kind: CompletionItemKind.Variable,
    detail: 'Original document before UPDATE/REPLACE/REMOVE',
    data: { type: 'special', name: 'OLD' }
  });

  // Add ArangoDB collections (if connected)
  if (arangoMetadata.connected) {
    for (const collection of arangoMetadata.collections) {
      if (collection.isSystem) continue; // Skip system collections by default

      items.push({
        label: collection.name,
        kind: collection.type === 'edge' ? CompletionItemKind.Interface : CompletionItemKind.Class,
        detail: `${collection.type} collection`,
        data: { type: 'collection', name: collection.name }
      });
    }

    // Add views
    for (const view of arangoMetadata.views) {
      items.push({
        label: view.name,
        kind: CompletionItemKind.Module,
        detail: `${view.type} view`,
        data: { type: 'view', name: view.name }
      });
    }

    // Add graphs
    for (const graph of arangoMetadata.graphs) {
      items.push({
        label: `"${graph.name}"`,
        kind: CompletionItemKind.Reference,
        detail: 'Named graph',
        insertText: `"${graph.name}"`,
        data: { type: 'graph', name: graph.name }
      });
    }
  }

  return items;
}

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  const data = item.data;
  if (!data) return item;

  if (data.type === 'keyword') {
    const markdown = getKeywordMarkdown(data.name);
    if (markdown) {
      item.documentation = {
        kind: MarkupKind.Markdown,
        value: markdown
      };
    }
  } else if (data.type === 'function') {
    const markdown = functionDocs.getMarkdownDoc(data.name);
    if (markdown) {
      item.documentation = {
        kind: MarkupKind.Markdown,
        value: markdown
      };
    }
  }

  return item;
});

function generateFunctionSnippet(name: string): string {
  const func = functionDocs.getFunction(name);
  if (!func) return `${name}($0)`;

  const params = func.parameters
    .filter(p => p.required || func.parameters.indexOf(p) === 0)
    .map((p, i) => `\${${i + 1}:${p.name}}`)
    .join(', ');

  return `${name}(${params})$0`;
}

// =============================================================================
// HOVER
// =============================================================================

connection.onHover((params: TextDocumentPositionParams): Hover | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const cache = documentCache.get(document.uri);
  if (!cache) return null;

  // Find token at position
  const token = analyzer.getTokenAtPosition(
    cache.tokens,
    params.position.line + 1,
    params.position.character + 1
  );

  if (!token) return null;

  const tokenName = token.tokenType.name;
  const tokenImage = token.image;

  // Handle keywords
  if (tokenName.startsWith('Kw')) {
    const keyword = tokenImage.toUpperCase();
    const markdown = getKeywordMarkdown(keyword);
    if (markdown) {
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: markdown
        }
      };
    }
  }

  // Handle identifiers (could be functions)
  if (tokenName === 'Identifier') {
    const func = functionDocs.getFunction(tokenImage);
    if (func) {
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: functionDocs.getMarkdownDoc(tokenImage)
        }
      };
    }
  }

  // Handle bind parameters
  if (tokenName === 'BindParameter') {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**Bind Parameter**\n\n\`${tokenImage}\`\n\nA placeholder for a value that will be provided at query execution time.`
      }
    };
  }

  if (tokenName === 'CollectionBind') {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**Collection Bind Parameter**\n\n\`${tokenImage}\`\n\nA placeholder for a collection name that will be provided at query execution time.`
      }
    };
  }

  return null;
});

// =============================================================================
// SIGNATURE HELP
// =============================================================================

connection.onSignatureHelp((params: TextDocumentPositionParams): SignatureHelp | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const cache = documentCache.get(document.uri);
  if (!cache) return null;

  // Get context to find current function call
  const context = analyzer.getContextAtPosition(
    cache.tokens,
    params.position.line + 1,
    params.position.character + 1
  );

  if (!context.inFunctionCall || !context.currentFunction) {
    return null;
  }

  const func = functionDocs.getFunction(context.currentFunction);
  if (!func) return null;

  // Build signature information
  const signature = functionDocs.getSignatureString(context.currentFunction);
  const parameters: ParameterInformation[] = func.parameters.map(p => ({
    label: p.name,
    documentation: p.description || (p.required ? 'Required parameter' : 'Optional parameter')
  }));

  const signatureInfo: SignatureInformation = {
    label: signature,
    documentation: {
      kind: MarkupKind.Markdown,
      value: func.description
    },
    parameters
  };

  return {
    signatures: [signatureInfo],
    activeSignature: 0,
    activeParameter: Math.min(context.argumentIndex, parameters.length - 1)
  };
});

// =============================================================================
// DOCUMENT SYMBOLS
// =============================================================================

connection.onDocumentSymbol((params): DocumentSymbol[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const cache = documentCache.get(document.uri);
  if (!cache) return [];

  const symbols = analyzer.extractSymbols(cache.tokens);
  const result: DocumentSymbol[] = [];

  // Add variables
  for (const variable of symbols.variables) {
    result.push({
      name: variable.name,
      kind: SymbolKind.Variable,
      range: locationToRange(variable.location),
      selectionRange: locationToRange(variable.location)
    });
  }

  // Add functions
  for (const func of symbols.functions) {
    result.push({
      name: func.name,
      kind: SymbolKind.Function,
      range: locationToRange(func.location),
      selectionRange: locationToRange(func.location)
    });
  }

  // Add bind parameters
  for (const param of symbols.bindParameters) {
    result.push({
      name: `@${param.name}`,
      kind: SymbolKind.Constant,
      range: locationToRange(param.location),
      selectionRange: locationToRange(param.location)
    });
  }

  return result;
});

// =============================================================================
// GO TO DEFINITION
// =============================================================================

connection.onDefinition((params): Definition | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const cache = documentCache.get(document.uri);
  if (!cache) return null;

  // Find token at position
  const token = analyzer.getTokenAtPosition(
    cache.tokens,
    params.position.line + 1,
    params.position.character + 1
  );

  if (!token || token.tokenType.name !== 'Identifier') {
    return null;
  }

  const symbols = analyzer.extractSymbols(cache.tokens);

  // Find variable definition
  const variable = symbols.variables.find(v => v.name === token.image);
  if (variable) {
    return {
      uri: document.uri,
      range: locationToRange(variable.location)
    };
  }

  return null;
});

// =============================================================================
// HELPERS
// =============================================================================

function locationToRange(location: { start: { line: number; column: number }; end: { line: number; column: number } }): Range {
  return {
    start: { line: location.start.line - 1, character: location.start.column - 1 },
    end: { line: location.end.line - 1, character: location.end.column - 1 }
  };
}

// =============================================================================
// START SERVER
// =============================================================================

documents.listen(connection);
connection.listen();
