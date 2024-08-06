import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

const aqlKeywords = [
  'FOR', 'RETURN', 'FILTER', 'SORT', 'LIMIT', 'LET', 'COLLECT', 'INSERT', 'UPDATE', 'REPLACE', 'REMOVE',
  'UPSERT', 'WITH', 'INTO', 'IN', 'AND', 'OR', 'NOT', 'LIKE', 'GRAPH', 'SHORTEST_PATH', 'OUTBOUND', 'INBOUND',
  'ANY', 'ALL', 'NONE', 'AGGREGATE', 'DISTINCT', 'PRUNE'
];

const aqlFunctions = [
  'LENGTH', 'CONCAT', 'LOWER', 'UPPER', 'SUBSTRING', 'COUNT', 'SUM', 'MIN', 'MAX', 'AVG',
  'DOCUMENT', 'MATCHES', 'MERGE', 'PARSE_IDENTIFIER', 'TO_NUMBER', 'TO_STRING', 'TO_BOOL',
  'FIRST', 'LAST', 'NTH', 'POSITION', 'REVERSE', 'CONTAINS', 'APPEND', 'PUSH', 'UNSHIFT',
  'POP', 'SHIFT', 'REMOVE_VALUE', 'REMOVE_VALUES', 'REMOVE_NTH'
];

connection.onInitialize((params: InitializeParams) => {
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true
      }
    }
  };
  return result;
});

connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    return [
      ...aqlKeywords.map((keyword, index) => ({
        label: keyword,
        kind: CompletionItemKind.Keyword,
        data: index
      })),
      ...aqlFunctions.map((func, index) => ({
        label: func,
        kind: CompletionItemKind.Function,
        data: aqlKeywords.length + index
      }))
    ];
  }
);

connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    if (item.data !== undefined) {
      if (item.data < aqlKeywords.length) {
        item.detail = 'AQL Keyword';
        item.documentation = `Keyword: ${aqlKeywords[item.data]}`;
      } else {
        const funcIndex = item.data - aqlKeywords.length;
        item.detail = 'AQL Function';
        item.documentation = `Function: ${aqlFunctions[funcIndex]}`;
      }
    }
    return item;
  }
);

documents.listen(connection);
connection.listen();