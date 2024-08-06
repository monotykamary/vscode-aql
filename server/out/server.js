"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
const documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
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
connection.onInitialize((params) => {
    const result = {
        capabilities: {
            textDocumentSync: node_1.TextDocumentSyncKind.Incremental,
            completionProvider: {
                resolveProvider: true
            }
        }
    };
    return result;
});
connection.onCompletion((_textDocumentPosition) => {
    return [
        ...aqlKeywords.map((keyword, index) => ({
            label: keyword,
            kind: node_1.CompletionItemKind.Keyword,
            data: index
        })),
        ...aqlFunctions.map((func, index) => ({
            label: func,
            kind: node_1.CompletionItemKind.Function,
            data: aqlKeywords.length + index
        }))
    ];
});
connection.onCompletionResolve((item) => {
    if (item.data !== undefined) {
        if (item.data < aqlKeywords.length) {
            item.detail = 'AQL Keyword';
            item.documentation = `Keyword: ${aqlKeywords[item.data]}`;
        }
        else {
            const funcIndex = item.data - aqlKeywords.length;
            item.detail = 'AQL Function';
            item.documentation = `Function: ${aqlFunctions[funcIndex]}`;
        }
    }
    return item;
});
documents.listen(connection);
connection.listen();
//# sourceMappingURL=server.js.map