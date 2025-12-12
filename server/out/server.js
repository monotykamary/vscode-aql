"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const parser_1 = require("./parser");
const docs_1 = require("./docs");
const arango_1 = require("./arango");
const embedded_1 = require("./embedded");
// Create connection and document manager
const connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
const documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
// ArangoDB client and cached metadata
let arangoClient = null;
let workspaceRoot = null;
let hasConfigurationCapability = false;
let arangoMetadata = {
    collections: [],
    views: [],
    graphs: [],
    connected: false
};
const documentCache = new Map();
// =============================================================================
// INITIALIZATION
// =============================================================================
connection.onInitialize((params) => {
    // Extract workspace root
    if (params.workspaceFolders && params.workspaceFolders.length > 0) {
        workspaceRoot = params.workspaceFolders[0].uri.replace('file://', '');
    }
    else if (params.rootUri) {
        workspaceRoot = params.rootUri.replace('file://', '');
    }
    // Check for configuration capability
    hasConfigurationCapability = !!(params.capabilities.workspace &&
        params.capabilities.workspace.configuration);
    return {
        capabilities: {
            textDocumentSync: node_1.TextDocumentSyncKind.Incremental,
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
        connection.client.register(node_1.DidChangeConfigurationNotification.type, {
            section: 'aql'
        });
    }
    // Initialize ArangoDB connection with default/file config
    await initializeArangoConnection({});
});
let globalSettings = {};
connection.onDidChangeConfiguration(async (change) => {
    if (hasConfigurationCapability) {
        // Get the new settings
        const settings = await connection.workspace.getConfiguration({
            section: 'aql'
        });
        globalSettings = settings || {};
    }
    else {
        globalSettings = (change.settings?.aql || {});
    }
    // Reinitialize ArangoDB connection
    await initializeArangoConnection(globalSettings.connection || {});
    // Revalidate all open documents
    documents.all().forEach(validateDocument);
});
async function initializeArangoConnection(settings) {
    try {
        const config = (0, arango_1.getConfig)(workspaceRoot, settings);
        arangoClient = (0, arango_1.getArangoClient)(config);
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
        }
        else {
            connection.console.log(`ArangoDB connection failed: ${result.error}`);
        }
    }
    catch (error) {
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
function validateDocument(document) {
    const text = document.getText();
    const languageId = document.languageId;
    const isAqlFile = languageId === 'aql';
    const cache = {
        version: document.version,
        languageId,
        tokens: [],
        errors: [],
        embeddedRegions: []
    };
    const diagnostics = [];
    if (isAqlFile) {
        // Parse the entire document as AQL
        const result = parser_1.analyzer.parse(text);
        cache.tokens = result.tokens;
        cache.errors = result.errors;
        // Convert errors to diagnostics
        for (const error of result.errors) {
            diagnostics.push({
                severity: node_1.DiagnosticSeverity.Error,
                range: {
                    start: { line: error.line - 1, character: error.column - 1 },
                    end: { line: error.line - 1, character: error.column - 1 + error.length }
                },
                message: error.message,
                source: 'aql'
            });
        }
    }
    else {
        // Extract and parse embedded AQL regions
        const embeddedRegions = (0, embedded_1.extractEmbeddedAql)(text, languageId);
        for (const region of embeddedRegions) {
            const result = parser_1.analyzer.parse(region.content);
            cache.embeddedRegions.push({
                tokens: result.tokens,
                errors: result.errors,
                region
            });
            // Convert errors with adjusted positions
            for (const error of result.errors) {
                const absPos = (0, embedded_1.toAbsolutePosition)(region, error.line, error.column);
                diagnostics.push({
                    severity: node_1.DiagnosticSeverity.Error,
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
connection.onCompletion((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document)
        return [];
    const cache = documentCache.get(document.uri);
    if (!cache)
        return [];
    // For non-AQL files, check if we're in an embedded region
    if (cache.languageId !== 'aql') {
        const offset = document.offsetAt(params.position);
        const embeddedRegion = findEmbeddedRegionAtOffset(cache, offset);
        if (!embeddedRegion) {
            // Not in an AQL region, don't provide completions
            return [];
        }
        // Calculate relative position within the region
        const relativeOffset = offset - embeddedRegion.region.startOffset;
        const { line, column } = offsetToLineColumn(embeddedRegion.region.content, relativeOffset);
        const context = parser_1.analyzer.getContextAtPosition(embeddedRegion.tokens, line, column);
        return buildCompletionItems(context);
    }
    const tokens = cache.tokens;
    // Get context at cursor position
    const context = parser_1.analyzer.getContextAtPosition(tokens, params.position.line + 1, params.position.character + 1);
    return buildCompletionItems(context);
});
/**
 * Find embedded region at a given offset
 */
function findEmbeddedRegionAtOffset(cache, offset) {
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
function offsetToLineColumn(text, offset) {
    let line = 1;
    let column = 1;
    for (let i = 0; i < offset && i < text.length; i++) {
        if (text[i] === '\n') {
            line++;
            column = 1;
        }
        else {
            column++;
        }
    }
    return { line, column };
}
/**
 * Build completion items based on context
 */
function buildCompletionItems(context) {
    const items = [];
    // Add context-aware completions
    if (context.inFunctionCall && context.currentFunction) {
        // Inside a function call - suggest based on function parameters
        const func = docs_1.functionDocs.getFunction(context.currentFunction);
        if (func && func.parameters[context.argumentIndex]) {
            // Could add type-specific suggestions here
        }
    }
    // Add keywords (with context awareness)
    const keywords = (0, docs_1.getAllKeywordNames)();
    for (const keyword of keywords) {
        const info = (0, docs_1.getKeywordInfo)(keyword);
        if (!info)
            continue;
        // Filter keywords based on context
        if (context.inForLoop && keyword === 'FOR')
            continue; // Less likely to nest FOR immediately
        if (context.previousKeyword === 'FOR' && keyword !== 'IN')
            continue; // After FOR, IN is expected
        items.push({
            label: keyword,
            kind: node_1.CompletionItemKind.Keyword,
            detail: info.description,
            insertText: keyword,
            data: { type: 'keyword', name: keyword }
        });
    }
    // Add functions with snippets
    const functions = docs_1.functionDocs.getAllFunctions();
    for (const func of functions) {
        const snippet = generateFunctionSnippet(func.name);
        items.push({
            label: func.name,
            kind: node_1.CompletionItemKind.Function,
            detail: `${func.category} function`,
            documentation: {
                kind: node_1.MarkupKind.Markdown,
                value: func.description
            },
            insertText: snippet,
            insertTextFormat: node_1.InsertTextFormat.Snippet,
            data: { type: 'function', name: func.name }
        });
    }
    // Add available variables
    for (const variable of context.availableVariables) {
        items.push({
            label: variable,
            kind: node_1.CompletionItemKind.Variable,
            detail: 'Variable',
            data: { type: 'variable', name: variable }
        });
    }
    // Add special variables
    items.push({
        label: 'CURRENT',
        kind: node_1.CompletionItemKind.Variable,
        detail: 'Current element in array operations',
        data: { type: 'special', name: 'CURRENT' }
    });
    items.push({
        label: 'NEW',
        kind: node_1.CompletionItemKind.Variable,
        detail: 'New document after INSERT/UPDATE/REPLACE',
        data: { type: 'special', name: 'NEW' }
    });
    items.push({
        label: 'OLD',
        kind: node_1.CompletionItemKind.Variable,
        detail: 'Original document before UPDATE/REPLACE/REMOVE',
        data: { type: 'special', name: 'OLD' }
    });
    // Add ArangoDB collections (if connected)
    if (arangoMetadata.connected) {
        for (const collection of arangoMetadata.collections) {
            if (collection.isSystem)
                continue; // Skip system collections by default
            items.push({
                label: collection.name,
                kind: collection.type === 'edge' ? node_1.CompletionItemKind.Interface : node_1.CompletionItemKind.Class,
                detail: `${collection.type} collection`,
                data: { type: 'collection', name: collection.name }
            });
        }
        // Add views
        for (const view of arangoMetadata.views) {
            items.push({
                label: view.name,
                kind: node_1.CompletionItemKind.Module,
                detail: `${view.type} view`,
                data: { type: 'view', name: view.name }
            });
        }
        // Add graphs
        for (const graph of arangoMetadata.graphs) {
            items.push({
                label: `"${graph.name}"`,
                kind: node_1.CompletionItemKind.Reference,
                detail: 'Named graph',
                insertText: `"${graph.name}"`,
                data: { type: 'graph', name: graph.name }
            });
        }
    }
    return items;
}
connection.onCompletionResolve((item) => {
    const data = item.data;
    if (!data)
        return item;
    if (data.type === 'keyword') {
        const markdown = (0, docs_1.getKeywordMarkdown)(data.name);
        if (markdown) {
            item.documentation = {
                kind: node_1.MarkupKind.Markdown,
                value: markdown
            };
        }
    }
    else if (data.type === 'function') {
        const markdown = docs_1.functionDocs.getMarkdownDoc(data.name);
        if (markdown) {
            item.documentation = {
                kind: node_1.MarkupKind.Markdown,
                value: markdown
            };
        }
    }
    return item;
});
function generateFunctionSnippet(name) {
    const func = docs_1.functionDocs.getFunction(name);
    if (!func)
        return `${name}($0)`;
    const params = func.parameters
        .filter(p => p.required || func.parameters.indexOf(p) === 0)
        .map((p, i) => `\${${i + 1}:${p.name}}`)
        .join(', ');
    return `${name}(${params})$0`;
}
// =============================================================================
// HOVER
// =============================================================================
connection.onHover((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document)
        return null;
    const cache = documentCache.get(document.uri);
    if (!cache)
        return null;
    // Find token at position
    const token = parser_1.analyzer.getTokenAtPosition(cache.tokens, params.position.line + 1, params.position.character + 1);
    if (!token)
        return null;
    const tokenName = token.tokenType.name;
    const tokenImage = token.image;
    // Handle keywords
    if (tokenName.startsWith('Kw')) {
        const keyword = tokenImage.toUpperCase();
        const markdown = (0, docs_1.getKeywordMarkdown)(keyword);
        if (markdown) {
            return {
                contents: {
                    kind: node_1.MarkupKind.Markdown,
                    value: markdown
                }
            };
        }
    }
    // Handle identifiers (could be functions)
    if (tokenName === 'Identifier') {
        const func = docs_1.functionDocs.getFunction(tokenImage);
        if (func) {
            return {
                contents: {
                    kind: node_1.MarkupKind.Markdown,
                    value: docs_1.functionDocs.getMarkdownDoc(tokenImage)
                }
            };
        }
    }
    // Handle bind parameters
    if (tokenName === 'BindParameter') {
        return {
            contents: {
                kind: node_1.MarkupKind.Markdown,
                value: `**Bind Parameter**\n\n\`${tokenImage}\`\n\nA placeholder for a value that will be provided at query execution time.`
            }
        };
    }
    if (tokenName === 'CollectionBind') {
        return {
            contents: {
                kind: node_1.MarkupKind.Markdown,
                value: `**Collection Bind Parameter**\n\n\`${tokenImage}\`\n\nA placeholder for a collection name that will be provided at query execution time.`
            }
        };
    }
    return null;
});
// =============================================================================
// SIGNATURE HELP
// =============================================================================
connection.onSignatureHelp((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document)
        return null;
    const cache = documentCache.get(document.uri);
    if (!cache)
        return null;
    // Get context to find current function call
    const context = parser_1.analyzer.getContextAtPosition(cache.tokens, params.position.line + 1, params.position.character + 1);
    if (!context.inFunctionCall || !context.currentFunction) {
        return null;
    }
    const func = docs_1.functionDocs.getFunction(context.currentFunction);
    if (!func)
        return null;
    // Build signature information
    const signature = docs_1.functionDocs.getSignatureString(context.currentFunction);
    const parameters = func.parameters.map(p => ({
        label: p.name,
        documentation: p.description || (p.required ? 'Required parameter' : 'Optional parameter')
    }));
    const signatureInfo = {
        label: signature,
        documentation: {
            kind: node_1.MarkupKind.Markdown,
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
connection.onDocumentSymbol((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document)
        return [];
    const cache = documentCache.get(document.uri);
    if (!cache)
        return [];
    const symbols = parser_1.analyzer.extractSymbols(cache.tokens);
    const result = [];
    // Add variables
    for (const variable of symbols.variables) {
        result.push({
            name: variable.name,
            kind: node_1.SymbolKind.Variable,
            range: locationToRange(variable.location),
            selectionRange: locationToRange(variable.location)
        });
    }
    // Add functions
    for (const func of symbols.functions) {
        result.push({
            name: func.name,
            kind: node_1.SymbolKind.Function,
            range: locationToRange(func.location),
            selectionRange: locationToRange(func.location)
        });
    }
    // Add bind parameters
    for (const param of symbols.bindParameters) {
        result.push({
            name: `@${param.name}`,
            kind: node_1.SymbolKind.Constant,
            range: locationToRange(param.location),
            selectionRange: locationToRange(param.location)
        });
    }
    return result;
});
// =============================================================================
// GO TO DEFINITION
// =============================================================================
connection.onDefinition((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document)
        return null;
    const cache = documentCache.get(document.uri);
    if (!cache)
        return null;
    // Find token at position
    const token = parser_1.analyzer.getTokenAtPosition(cache.tokens, params.position.line + 1, params.position.character + 1);
    if (!token || token.tokenType.name !== 'Identifier') {
        return null;
    }
    const symbols = parser_1.analyzer.extractSymbols(cache.tokens);
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
function locationToRange(location) {
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
//# sourceMappingURL=server.js.map