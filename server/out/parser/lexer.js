"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionBind = exports.TemplateString = exports.DoubleQuoteString = exports.SingleQuoteString = exports.Number_ = exports.Null = exports.False = exports.True = exports.KwTo = exports.KwKeep = exports.KwWindow = exports.KwPrune = exports.KwAggregate = exports.KwNone = exports.KwAll = exports.KwAny = exports.KwInbound = exports.KwOutbound = exports.KwAllShortestPaths = exports.KwKPaths = exports.KwKShortestPaths = exports.KwShortestPath = exports.KwGraph = exports.KwDistinct = exports.KwOptions = exports.KwUpsert = exports.KwReplace = exports.KwRemove = exports.KwUpdate = exports.KwInsert = exports.KwLike = exports.KwNot = exports.KwOr = exports.KwAnd = exports.KwWith = exports.KwInto = exports.KwIn = exports.KwDesc = exports.KwAsc = exports.KwCollect = exports.KwLet = exports.KwLimit = exports.KwSort = exports.KwSearch = exports.KwFilter = exports.KwReturn = exports.KwFor = exports.BlockComment = exports.LineComment = exports.WhiteSpace = void 0;
exports.AllKeywords = exports.AqlLexer = exports.allTokens = exports.DoubleColon = exports.Dot = exports.Comma = exports.RBrace = exports.LBrace = exports.RBracket = exports.LBracket = exports.RParen = exports.LParen = exports.NullishCoalescing = exports.Colon = exports.Question = exports.Assign = exports.Range = exports.Percent = exports.Slash = exports.Star = exports.Minus = exports.Plus = exports.LogicalNot = exports.LogicalOr = exports.LogicalAnd = exports.RegexNotMatch = exports.RegexMatch = exports.Lt = exports.Gt = exports.Lte = exports.Gte = exports.Ne = exports.Eq = exports.Identifier = exports.ForwardTickIdentifier = exports.QuotedIdentifier = exports.BindParameter = void 0;
const chevrotain_1 = require("chevrotain");
// =============================================================================
// WHITESPACE AND COMMENTS
// =============================================================================
exports.WhiteSpace = (0, chevrotain_1.createToken)({
    name: 'WhiteSpace',
    pattern: /\s+/,
    group: chevrotain_1.Lexer.SKIPPED
});
exports.LineComment = (0, chevrotain_1.createToken)({
    name: 'LineComment',
    pattern: /\/\/[^\n\r]*/,
    group: 'comments'
});
exports.BlockComment = (0, chevrotain_1.createToken)({
    name: 'BlockComment',
    pattern: /\/\*[\s\S]*?\*\//,
    group: 'comments'
});
// =============================================================================
// KEYWORDS (must be defined before Identifier)
// =============================================================================
const keywordTokens = {};
const keywords = [
    // Query structure
    'FOR', 'RETURN', 'FILTER', 'SEARCH', 'SORT', 'LIMIT', 'LET', 'COLLECT',
    // Sort modifiers
    'ASC', 'DESC',
    // Operators
    'IN', 'INTO', 'WITH', 'AND', 'OR', 'NOT', 'LIKE',
    // Data modification
    'INSERT', 'UPDATE', 'REMOVE', 'REPLACE', 'UPSERT',
    // Options
    'OPTIONS',
    // Distinct
    'DISTINCT',
    // Graph
    'GRAPH', 'SHORTEST_PATH', 'K_SHORTEST_PATHS', 'K_PATHS', 'ALL_SHORTEST_PATHS',
    'OUTBOUND', 'INBOUND', 'ANY',
    // Quantifiers
    'ALL', 'NONE',
    // Aggregation
    'AGGREGATE',
    // Prune and window
    'PRUNE', 'WINDOW',
    // Keep
    'KEEP',
    // To (for ranges)
    'TO'
];
// Create keyword tokens (case-insensitive)
keywords.forEach(keyword => {
    const tokenName = `Kw${keyword.charAt(0)}${keyword.slice(1).toLowerCase()}`;
    keywordTokens[keyword] = (0, chevrotain_1.createToken)({
        name: tokenName,
        pattern: new RegExp(`\\b${keyword}\\b`, 'i'),
        longer_alt: undefined // Will be set after Identifier is created
    });
});
// Export individual keywords for parser use
exports.KwFor = keywordTokens['FOR'];
exports.KwReturn = keywordTokens['RETURN'];
exports.KwFilter = keywordTokens['FILTER'];
exports.KwSearch = keywordTokens['SEARCH'];
exports.KwSort = keywordTokens['SORT'];
exports.KwLimit = keywordTokens['LIMIT'];
exports.KwLet = keywordTokens['LET'];
exports.KwCollect = keywordTokens['COLLECT'];
exports.KwAsc = keywordTokens['ASC'];
exports.KwDesc = keywordTokens['DESC'];
exports.KwIn = keywordTokens['IN'];
exports.KwInto = keywordTokens['INTO'];
exports.KwWith = keywordTokens['WITH'];
exports.KwAnd = keywordTokens['AND'];
exports.KwOr = keywordTokens['OR'];
exports.KwNot = keywordTokens['NOT'];
exports.KwLike = keywordTokens['LIKE'];
exports.KwInsert = keywordTokens['INSERT'];
exports.KwUpdate = keywordTokens['UPDATE'];
exports.KwRemove = keywordTokens['REMOVE'];
exports.KwReplace = keywordTokens['REPLACE'];
exports.KwUpsert = keywordTokens['UPSERT'];
exports.KwOptions = keywordTokens['OPTIONS'];
exports.KwDistinct = keywordTokens['DISTINCT'];
exports.KwGraph = keywordTokens['GRAPH'];
exports.KwShortestPath = keywordTokens['SHORTEST_PATH'];
exports.KwKShortestPaths = keywordTokens['K_SHORTEST_PATHS'];
exports.KwKPaths = keywordTokens['K_PATHS'];
exports.KwAllShortestPaths = keywordTokens['ALL_SHORTEST_PATHS'];
exports.KwOutbound = keywordTokens['OUTBOUND'];
exports.KwInbound = keywordTokens['INBOUND'];
exports.KwAny = keywordTokens['ANY'];
exports.KwAll = keywordTokens['ALL'];
exports.KwNone = keywordTokens['NONE'];
exports.KwAggregate = keywordTokens['AGGREGATE'];
exports.KwPrune = keywordTokens['PRUNE'];
exports.KwWindow = keywordTokens['WINDOW'];
exports.KwKeep = keywordTokens['KEEP'];
exports.KwTo = keywordTokens['TO'];
// =============================================================================
// LITERALS
// =============================================================================
exports.True = (0, chevrotain_1.createToken)({
    name: 'True',
    pattern: /\btrue\b/i
});
exports.False = (0, chevrotain_1.createToken)({
    name: 'False',
    pattern: /\bfalse\b/i
});
exports.Null = (0, chevrotain_1.createToken)({
    name: 'Null',
    pattern: /\bnull\b/i
});
// Numbers (including scientific notation) - minus is handled as separate operator
exports.Number_ = (0, chevrotain_1.createToken)({
    name: 'Number',
    pattern: /(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/
});
// Strings
exports.SingleQuoteString = (0, chevrotain_1.createToken)({
    name: 'SingleQuoteString',
    pattern: /'(?:[^'\\]|\\.)*'/
});
exports.DoubleQuoteString = (0, chevrotain_1.createToken)({
    name: 'DoubleQuoteString',
    pattern: /"(?:[^"\\]|\\.)*"/
});
exports.TemplateString = (0, chevrotain_1.createToken)({
    name: 'TemplateString',
    pattern: /`(?:[^`\\]|\\.)*`/
});
// =============================================================================
// IDENTIFIERS AND BIND PARAMETERS
// =============================================================================
// Bind parameters: @name or @@name (collection bind)
exports.CollectionBind = (0, chevrotain_1.createToken)({
    name: 'CollectionBind',
    pattern: /@@[a-zA-Z_][a-zA-Z0-9_]*/
});
exports.BindParameter = (0, chevrotain_1.createToken)({
    name: 'BindParameter',
    pattern: /@[a-zA-Z_][a-zA-Z0-9_]*/
});
// Backtick quoted identifier (for reserved words as identifiers)
exports.QuotedIdentifier = (0, chevrotain_1.createToken)({
    name: 'QuotedIdentifier',
    pattern: /`[^`]+`/
});
// Forward tick quoted identifier
exports.ForwardTickIdentifier = (0, chevrotain_1.createToken)({
    name: 'ForwardTickIdentifier',
    pattern: /´[^´]+´/
});
// Regular identifier
exports.Identifier = (0, chevrotain_1.createToken)({
    name: 'Identifier',
    pattern: /[a-zA-Z_][a-zA-Z0-9_]*/
});
// =============================================================================
// OPERATORS
// =============================================================================
// Comparison operators
exports.Eq = (0, chevrotain_1.createToken)({ name: 'Eq', pattern: /==/ });
exports.Ne = (0, chevrotain_1.createToken)({ name: 'Ne', pattern: /!=/ });
exports.Gte = (0, chevrotain_1.createToken)({ name: 'Gte', pattern: />=/ });
exports.Lte = (0, chevrotain_1.createToken)({ name: 'Lte', pattern: /<=/ });
exports.Gt = (0, chevrotain_1.createToken)({ name: 'Gt', pattern: />/ });
exports.Lt = (0, chevrotain_1.createToken)({ name: 'Lt', pattern: /</ });
// Regex operators
exports.RegexMatch = (0, chevrotain_1.createToken)({ name: 'RegexMatch', pattern: /=~/ });
exports.RegexNotMatch = (0, chevrotain_1.createToken)({ name: 'RegexNotMatch', pattern: /!~/ });
// Logical operators
exports.LogicalAnd = (0, chevrotain_1.createToken)({ name: 'LogicalAnd', pattern: /&&/ });
exports.LogicalOr = (0, chevrotain_1.createToken)({ name: 'LogicalOr', pattern: /\|\|/ });
exports.LogicalNot = (0, chevrotain_1.createToken)({ name: 'LogicalNot', pattern: /!/ });
// Arithmetic operators
exports.Plus = (0, chevrotain_1.createToken)({ name: 'Plus', pattern: /\+/ });
exports.Minus = (0, chevrotain_1.createToken)({ name: 'Minus', pattern: /-/ });
exports.Star = (0, chevrotain_1.createToken)({ name: 'Star', pattern: /\*/ });
exports.Slash = (0, chevrotain_1.createToken)({ name: 'Slash', pattern: /\// });
exports.Percent = (0, chevrotain_1.createToken)({ name: 'Percent', pattern: /%/ });
// Range operator
exports.Range = (0, chevrotain_1.createToken)({ name: 'Range', pattern: /\.\./ });
// Assignment
exports.Assign = (0, chevrotain_1.createToken)({ name: 'Assign', pattern: /=/ });
// Ternary
exports.Question = (0, chevrotain_1.createToken)({ name: 'Question', pattern: /\?/ });
exports.Colon = (0, chevrotain_1.createToken)({ name: 'Colon', pattern: /:/ });
// Nullish coalescing (added in newer AQL versions)
exports.NullishCoalescing = (0, chevrotain_1.createToken)({ name: 'NullishCoalescing', pattern: /\?\?/ });
// =============================================================================
// PUNCTUATION
// =============================================================================
exports.LParen = (0, chevrotain_1.createToken)({ name: 'LParen', pattern: /\(/ });
exports.RParen = (0, chevrotain_1.createToken)({ name: 'RParen', pattern: /\)/ });
exports.LBracket = (0, chevrotain_1.createToken)({ name: 'LBracket', pattern: /\[/ });
exports.RBracket = (0, chevrotain_1.createToken)({ name: 'RBracket', pattern: /\]/ });
exports.LBrace = (0, chevrotain_1.createToken)({ name: 'LBrace', pattern: /\{/ });
exports.RBrace = (0, chevrotain_1.createToken)({ name: 'RBrace', pattern: /\}/ });
exports.Comma = (0, chevrotain_1.createToken)({ name: 'Comma', pattern: /,/ });
exports.Dot = (0, chevrotain_1.createToken)({ name: 'Dot', pattern: /\./ });
exports.DoubleColon = (0, chevrotain_1.createToken)({ name: 'DoubleColon', pattern: /::/ });
// =============================================================================
// TOKEN ORDER (critical for correct lexing)
// =============================================================================
// Tokens are matched in order - longer/more specific patterns first
exports.allTokens = [
    // Whitespace and comments first
    exports.WhiteSpace,
    exports.BlockComment,
    exports.LineComment,
    // Multi-character operators before single-character
    exports.NullishCoalescing,
    exports.Range,
    exports.DoubleColon,
    exports.LogicalAnd,
    exports.LogicalOr,
    exports.Eq,
    exports.Ne,
    exports.Gte,
    exports.Lte,
    exports.RegexMatch,
    exports.RegexNotMatch,
    // Single-character operators
    exports.Gt,
    exports.Lt,
    exports.LogicalNot,
    exports.Plus,
    exports.Minus,
    exports.Star,
    exports.Slash,
    exports.Percent,
    exports.Assign,
    exports.Question,
    exports.Colon,
    // Punctuation
    exports.LParen,
    exports.RParen,
    exports.LBracket,
    exports.RBracket,
    exports.LBrace,
    exports.RBrace,
    exports.Comma,
    exports.Dot,
    // Keywords (before Identifier)
    ...Object.values(keywordTokens),
    // Boolean and null literals (before Identifier)
    exports.True,
    exports.False,
    exports.Null,
    // Bind parameters (before Identifier)
    exports.CollectionBind,
    exports.BindParameter,
    // Quoted identifiers
    exports.QuotedIdentifier,
    exports.ForwardTickIdentifier,
    // Strings
    exports.SingleQuoteString,
    exports.DoubleQuoteString,
    exports.TemplateString,
    // Numbers
    exports.Number_,
    // Identifier last (catch-all for names)
    exports.Identifier
];
// Set longer_alt for keywords to handle cases like "FOREST" not matching "FOR"
Object.values(keywordTokens).forEach(token => {
    token.LONGER_ALT = exports.Identifier;
});
// Also set for boolean/null literals
exports.True.LONGER_ALT = exports.Identifier;
exports.False.LONGER_ALT = exports.Identifier;
exports.Null.LONGER_ALT = exports.Identifier;
// =============================================================================
// CREATE LEXER
// =============================================================================
exports.AqlLexer = new chevrotain_1.Lexer(exports.allTokens, {
    ensureOptimizations: true,
    positionTracking: 'full' // Track line/column for error reporting
});
// Export all keyword tokens for the parser
exports.AllKeywords = keywordTokens;
//# sourceMappingURL=lexer.js.map