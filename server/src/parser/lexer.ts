import { createToken, Lexer, ITokenConfig } from 'chevrotain';

// =============================================================================
// WHITESPACE AND COMMENTS
// =============================================================================

export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED
});

export const LineComment = createToken({
  name: 'LineComment',
  pattern: /\/\/[^\n\r]*/,
  group: 'comments'
});

export const BlockComment = createToken({
  name: 'BlockComment',
  pattern: /\/\*[\s\S]*?\*\//,
  group: 'comments'
});

// =============================================================================
// KEYWORDS (must be defined before Identifier)
// =============================================================================

const keywordTokens: Record<string, ReturnType<typeof createToken>> = {};

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
  keywordTokens[keyword] = createToken({
    name: tokenName,
    pattern: new RegExp(`\\b${keyword}\\b`, 'i'),
    longer_alt: undefined // Will be set after Identifier is created
  });
});

// Export individual keywords for parser use
export const KwFor = keywordTokens['FOR'];
export const KwReturn = keywordTokens['RETURN'];
export const KwFilter = keywordTokens['FILTER'];
export const KwSearch = keywordTokens['SEARCH'];
export const KwSort = keywordTokens['SORT'];
export const KwLimit = keywordTokens['LIMIT'];
export const KwLet = keywordTokens['LET'];
export const KwCollect = keywordTokens['COLLECT'];
export const KwAsc = keywordTokens['ASC'];
export const KwDesc = keywordTokens['DESC'];
export const KwIn = keywordTokens['IN'];
export const KwInto = keywordTokens['INTO'];
export const KwWith = keywordTokens['WITH'];
export const KwAnd = keywordTokens['AND'];
export const KwOr = keywordTokens['OR'];
export const KwNot = keywordTokens['NOT'];
export const KwLike = keywordTokens['LIKE'];
export const KwInsert = keywordTokens['INSERT'];
export const KwUpdate = keywordTokens['UPDATE'];
export const KwRemove = keywordTokens['REMOVE'];
export const KwReplace = keywordTokens['REPLACE'];
export const KwUpsert = keywordTokens['UPSERT'];
export const KwOptions = keywordTokens['OPTIONS'];
export const KwDistinct = keywordTokens['DISTINCT'];
export const KwGraph = keywordTokens['GRAPH'];
export const KwShortestPath = keywordTokens['SHORTEST_PATH'];
export const KwKShortestPaths = keywordTokens['K_SHORTEST_PATHS'];
export const KwKPaths = keywordTokens['K_PATHS'];
export const KwAllShortestPaths = keywordTokens['ALL_SHORTEST_PATHS'];
export const KwOutbound = keywordTokens['OUTBOUND'];
export const KwInbound = keywordTokens['INBOUND'];
export const KwAny = keywordTokens['ANY'];
export const KwAll = keywordTokens['ALL'];
export const KwNone = keywordTokens['NONE'];
export const KwAggregate = keywordTokens['AGGREGATE'];
export const KwPrune = keywordTokens['PRUNE'];
export const KwWindow = keywordTokens['WINDOW'];
export const KwKeep = keywordTokens['KEEP'];
export const KwTo = keywordTokens['TO'];

// =============================================================================
// LITERALS
// =============================================================================

export const True = createToken({
  name: 'True',
  pattern: /\btrue\b/i
});

export const False = createToken({
  name: 'False',
  pattern: /\bfalse\b/i
});

export const Null = createToken({
  name: 'Null',
  pattern: /\bnull\b/i
});

// Numbers (including scientific notation) - minus is handled as separate operator
export const Number_ = createToken({
  name: 'Number',
  pattern: /(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/
});

// Strings
export const SingleQuoteString = createToken({
  name: 'SingleQuoteString',
  pattern: /'(?:[^'\\]|\\.)*'/
});

export const DoubleQuoteString = createToken({
  name: 'DoubleQuoteString',
  pattern: /"(?:[^"\\]|\\.)*"/
});

export const TemplateString = createToken({
  name: 'TemplateString',
  pattern: /`(?:[^`\\]|\\.)*`/
});

// =============================================================================
// IDENTIFIERS AND BIND PARAMETERS
// =============================================================================

// Bind parameters: @name or @@name (collection bind)
export const CollectionBind = createToken({
  name: 'CollectionBind',
  pattern: /@@[a-zA-Z_][a-zA-Z0-9_]*/
});

export const BindParameter = createToken({
  name: 'BindParameter',
  pattern: /@[a-zA-Z_][a-zA-Z0-9_]*/
});

// Backtick quoted identifier (for reserved words as identifiers)
export const QuotedIdentifier = createToken({
  name: 'QuotedIdentifier',
  pattern: /`[^`]+`/
});

// Forward tick quoted identifier
export const ForwardTickIdentifier = createToken({
  name: 'ForwardTickIdentifier',
  pattern: /´[^´]+´/
});

// Regular identifier
export const Identifier = createToken({
  name: 'Identifier',
  pattern: /[a-zA-Z_][a-zA-Z0-9_]*/
});

// =============================================================================
// OPERATORS
// =============================================================================

// Comparison operators
export const Eq = createToken({ name: 'Eq', pattern: /==/ });
export const Ne = createToken({ name: 'Ne', pattern: /!=/ });
export const Gte = createToken({ name: 'Gte', pattern: />=/ });
export const Lte = createToken({ name: 'Lte', pattern: /<=/ });
export const Gt = createToken({ name: 'Gt', pattern: />/ });
export const Lt = createToken({ name: 'Lt', pattern: /</ });

// Regex operators
export const RegexMatch = createToken({ name: 'RegexMatch', pattern: /=~/ });
export const RegexNotMatch = createToken({ name: 'RegexNotMatch', pattern: /!~/ });

// Logical operators
export const LogicalAnd = createToken({ name: 'LogicalAnd', pattern: /&&/ });
export const LogicalOr = createToken({ name: 'LogicalOr', pattern: /\|\|/ });
export const LogicalNot = createToken({ name: 'LogicalNot', pattern: /!/ });

// Arithmetic operators
export const Plus = createToken({ name: 'Plus', pattern: /\+/ });
export const Minus = createToken({ name: 'Minus', pattern: /-/ });
export const Star = createToken({ name: 'Star', pattern: /\*/ });
export const Slash = createToken({ name: 'Slash', pattern: /\// });
export const Percent = createToken({ name: 'Percent', pattern: /%/ });

// Range operator
export const Range = createToken({ name: 'Range', pattern: /\.\./ });

// Assignment
export const Assign = createToken({ name: 'Assign', pattern: /=/ });

// Ternary
export const Question = createToken({ name: 'Question', pattern: /\?/ });
export const Colon = createToken({ name: 'Colon', pattern: /:/ });

// Nullish coalescing (added in newer AQL versions)
export const NullishCoalescing = createToken({ name: 'NullishCoalescing', pattern: /\?\?/ });

// =============================================================================
// PUNCTUATION
// =============================================================================

export const LParen = createToken({ name: 'LParen', pattern: /\(/ });
export const RParen = createToken({ name: 'RParen', pattern: /\)/ });
export const LBracket = createToken({ name: 'LBracket', pattern: /\[/ });
export const RBracket = createToken({ name: 'RBracket', pattern: /\]/ });
export const LBrace = createToken({ name: 'LBrace', pattern: /\{/ });
export const RBrace = createToken({ name: 'RBrace', pattern: /\}/ });
export const Comma = createToken({ name: 'Comma', pattern: /,/ });
export const Dot = createToken({ name: 'Dot', pattern: /\./ });
export const DoubleColon = createToken({ name: 'DoubleColon', pattern: /::/ });

// =============================================================================
// TOKEN ORDER (critical for correct lexing)
// =============================================================================

// Tokens are matched in order - longer/more specific patterns first
export const allTokens = [
  // Whitespace and comments first
  WhiteSpace,
  BlockComment,
  LineComment,

  // Multi-character operators before single-character
  NullishCoalescing,
  Range,
  DoubleColon,
  LogicalAnd,
  LogicalOr,
  Eq,
  Ne,
  Gte,
  Lte,
  RegexMatch,
  RegexNotMatch,

  // Single-character operators
  Gt,
  Lt,
  LogicalNot,
  Plus,
  Minus,
  Star,
  Slash,
  Percent,
  Assign,
  Question,
  Colon,

  // Punctuation
  LParen,
  RParen,
  LBracket,
  RBracket,
  LBrace,
  RBrace,
  Comma,
  Dot,

  // Keywords (before Identifier)
  ...Object.values(keywordTokens),

  // Boolean and null literals (before Identifier)
  True,
  False,
  Null,

  // Bind parameters (before Identifier)
  CollectionBind,
  BindParameter,

  // Quoted identifiers
  QuotedIdentifier,
  ForwardTickIdentifier,

  // Strings
  SingleQuoteString,
  DoubleQuoteString,
  TemplateString,

  // Numbers
  Number_,

  // Identifier last (catch-all for names)
  Identifier
];

// Set longer_alt for keywords to handle cases like "FOREST" not matching "FOR"
Object.values(keywordTokens).forEach(token => {
  (token as any).LONGER_ALT = Identifier;
});

// Also set for boolean/null literals
(True as any).LONGER_ALT = Identifier;
(False as any).LONGER_ALT = Identifier;
(Null as any).LONGER_ALT = Identifier;

// =============================================================================
// CREATE LEXER
// =============================================================================

export const AqlLexer = new Lexer(allTokens, {
  ensureOptimizations: true,
  positionTracking: 'full' // Track line/column for error reporting
});

// Export all keyword tokens for the parser
export const AllKeywords = keywordTokens;
