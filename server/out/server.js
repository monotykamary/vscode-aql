"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
const documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
const aqlKeywords = [
    'FOR', 'RETURN', 'FILTER', 'SEARCH', 'SORT', 'LIMIT', 'LET', 'COLLECT', 'ASC', 'DESC',
    'IN', 'INTO', 'INSERT', 'UPDATE', 'REMOVE', 'REPLACE', 'UPSERT', 'OPTIONS', 'WITH',
    'AND', 'OR', 'NOT', 'DISTINCT', 'GRAPH', 'SHORTEST_PATH', 'OUTBOUND', 'INBOUND',
    'ANY', 'ALL', 'NONE', 'AGGREGATE', 'LIKE', 'K_SHORTEST_PATHS', 'K_PATHS', 'PRUNE', 'WINDOW'
];
const aqlFunctions = [
    "OFFSET_INFO", "PRODUCT", "BIT_POPCOUNT", "VARIANCE", "SIN", "INTERSECTION", "SUM", "COUNT", "CURRENT_DATABASE", "LENGTH", "IS_KEY", "DATE_NOW", "VARIANCE_POPULATION", "MINUS", "UNION", "RANDOM", "BM25", "SLICE", "DATE_YEAR", "PHRASE", "BIT_SHIFT_LEFT", "WARN", "BIT_TEST", "BIT_DECONSTRUCT", "BIT_NEGATE", "BIT_AND", "NOOPT", "ATAN2", "ATAN", "COUNT_UNIQUE", "ACOS", "IS_STRING", "EXP", "RANGE", "RAND", "SHIFT", "BIT_FROM_STRING", "BIT_SHIFT_RIGHT", "GEO_INTERSECTS", "CONCAT_SEPARATOR", "JACCARD", "STDDEV_SAMPLE", "ABS", "CEIL", "ATTRIBUTES", "MIN", "DATE_UTCTOLOCAL", "EXP2", "UUID", "SUBSTRING", "RADIANS", "TRANSLATE", "MINHASH_MATCH", "REGEX_TEST", "IS_OBJECT", "DECAY_EXP", "TRIM", "RTRIM", "STDDEV_POPULATION", "SUBSTRING_BYTES", "MIN_MATCH", "CONTAINS", "RIGHT", "TFIDF", "FIND_FIRST", "TO_NUMBER", "DATE_HOUR", "LIKE", "CONCAT", "IS_DATESTRING", "MAX", "TO_STRING", "SCHEMA_GET", "SQRT", "SLEEP", "TO_ARRAY", "CHAR_LENGTH", "DATE_COMPARE", "MD5", "SCHEMA_VALIDATE", "UPPER", "IS_NULL", "MERGE", "SHARD_ID", "AVG", "NEAR", "PI", "SOUNDEX", "FLATTEN", "UNION_DISTINCT", "COUNT_DISTINCT", "TO_BASE64", "TO_BOOL", "ASIN", "PARSE_KEY", "UNIQUE", "TO_HEX", "IS_BOOL", "GEO_CONTAINS", "NOEVAL", "POW", "IS_NUMBER", "FLOOR", "POSITION", "IS_DOCUMENT", "GEO_MULTIPOLYGON", "BIT_OR", "FAIL", "SHA1", "APPEND", "IS_IPV4", "BIT_TO_STRING", "CRC32", "GEO_POINT", "STDDEV", "LTRIM", "DEGREES", "HASH", "TO_LIST", "IS_LIST", "TYPENAME", "FIND_LAST", "RANDOM_TOKEN", "IS_ARRAY", "SUBSTITUTE", "MEDIAN", "LEVENSHTEIN_MATCH", "DATE_DAY", "PARSE_COLLECTION", "SPLIT", "LEVENSHTEIN_DISTANCE", "NGRAM_POSITIONAL_SIMILARITY", "COS", "NOT_NULL", "IPV4_FROM_NUMBER", "REMOVE_VALUE", "DATE_DIFF", "REPEAT", "ENCODE_URI_COMPONENT", "NGRAM_MATCH", "IPV4_TO_NUMBER", "AVERAGE", "BIT_XOR", "DECODE_REV", "FNV64", "NGRAM_SIMILARITY", "SORTED_UNIQUE", "ROUND", "ENTRIES", "GEO_AREA", "REVERSE", "DECAY_LINEAR", "FIRST", "LAST", "DATE_QUARTER", "WITHIN_RECTANGLE", "FULLTEXT", "NTH", "TO_CHAR", "LEFT", "CONTAINS_ARRAY", "SHA256", "PUSH", "POP", "UNSHIFT", "REMOVE_VALUES", "ANALYZER", "BOOSTSCORE", "REMOVE_NTH", "REPLACE_NTH", "INTERLEAVE", "DECAY_GAUSS", "BIT_CONSTRUCT", "HAS", "MINHASH", "DATE_LOCALTOUTC", "UNSET", "DATE_FORMAT", "ASSERT", "SHA512", "L2_DISTANCE", "CALL", "APPLY", "VALUES", "VERSION", "VALUE", "MERGE_RECURSIVE", "REGEX_SPLIT", "MATCHES", "GEO_EQUALS", "LOG10", "COLLECTION_COUNT", "REGEX_REPLACE", "UNSET_RECURSIVE", "KEEP", "KEEP_RECURSIVE", "ZIP", "REGEX_MATCHES", "JSON_PARSE", "DOCUMENT", "DISTANCE", "IS_IN_POLYGON", "LOG2", "GEO_DISTANCE", "GEO_IN_RANGE", "GEO_MULTIPOINT", "GEO_POLYGON", "GEO_LINESTRING", "DATE_DAYOFYEAR", "L1_DISTANCE", "BOOST", "GEO_MULTILINESTRING", "DATE_TIMESTAMP", "DATE_ISO8601", "DATE_DAYOFWEEK", "DATE_MONTH", "DATE_MINUTE", "MINHASH_ERROR", "DATE_SECOND", "DATE_MILLISECOND", "DATE_ISOWEEK", "SORTED", "DATE_SUBTRACT", "DATE_ISOWEEKYEAR", "LOWER", "DATE_LEAPYEAR", "DATE_DAYS_IN_MONTH", "TAN", "DATE_TRUNC", "IN_RANGE", "DATE_TIMEZONE", "JSON_STRINGIFY", "DATE_TIMEZONES", "MINHASH_COUNT", "COSINE_SIMILARITY", "FIRST_LIST", "FIRST_DOCUMENT", "LOG", "VARIANCE_SAMPLE", "PASSTHRU", "PARSE_IDENTIFIER", "OUTERSECTION", "IS_SAME_COLLECTION", "PERCENTILE", "DATE_ROUND", "V8", "COLLECTIONS", "CURRENT_USER", "CHECK_DOCUMENT", "DATE_ADD", "WITHIN", "KEYS", "TOKENS", "EXISTS", "STARTS_WITH"
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