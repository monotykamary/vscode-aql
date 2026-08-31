import { IToken, CstNode } from 'chevrotain';

// =============================================================================
// AST Node Types
// =============================================================================

export interface Position {
  line: number;
  column: number;
  offset: number;
}

export interface Location {
  start: Position;
  end: Position;
}

export interface BaseNode {
  type: string;
  location?: Location;
}

// Variable/Identifier nodes
export interface IdentifierNode extends BaseNode {
  type: 'Identifier';
  name: string;
  quoted?: boolean;
}

export interface VariableDeclaration extends BaseNode {
  type: 'VariableDeclaration';
  name: string;
}

export interface BindParameterNode extends BaseNode {
  type: 'BindParameter';
  name: string;
  isCollection: boolean;
}

// Literal nodes
export interface NumberLiteral extends BaseNode {
  type: 'NumberLiteral';
  value: number;
  raw: string;
}

export interface StringLiteral extends BaseNode {
  type: 'StringLiteral';
  value: string;
  raw: string;
  quoteType: 'single' | 'double' | 'template';
}

export interface BooleanLiteral extends BaseNode {
  type: 'BooleanLiteral';
  value: boolean;
}

export interface NullLiteral extends BaseNode {
  type: 'NullLiteral';
}

export interface ArrayLiteral extends BaseNode {
  type: 'ArrayLiteral';
  elements: Expression[];
}

export interface ObjectLiteral extends BaseNode {
  type: 'ObjectLiteral';
  properties: ObjectProperty[];
}

export interface ObjectProperty extends BaseNode {
  type: 'ObjectProperty';
  key: Expression;
  value: Expression;
  computed: boolean;
  shorthand: boolean;
}

// Expression nodes
export interface BinaryExpression extends BaseNode {
  type: 'BinaryExpression';
  operator: string;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression extends BaseNode {
  type: 'UnaryExpression';
  operator: string;
  argument: Expression;
}

export interface TernaryExpression extends BaseNode {
  type: 'TernaryExpression';
  condition: Expression;
  consequent: Expression;
  alternate: Expression;
}

export interface MemberExpression extends BaseNode {
  type: 'MemberExpression';
  object: Expression;
  property: Expression;
  computed: boolean;
}

export interface CallExpression extends BaseNode {
  type: 'CallExpression';
  callee: Expression;
  arguments: Expression[];
}

export interface RangeExpression extends BaseNode {
  type: 'RangeExpression';
  start: Expression;
  end: Expression;
}

export interface ArrayAccessExpression extends BaseNode {
  type: 'ArrayAccessExpression';
  array: Expression;
  index: Expression | null; // null for [*]
  isExpansion: boolean;
  filter?: ArrayFilter;
}

export interface ArrayFilter extends BaseNode {
  type: 'ArrayFilter';
  condition: Expression;
  limit?: Expression;
  offset?: Expression;
  returnExpr?: Expression;
}

export interface SubqueryExpression extends BaseNode {
  type: 'SubqueryExpression';
  query: Query;
}

// Statement nodes
export interface ForStatement extends BaseNode {
  type: 'ForStatement';
  variable: VariableDeclaration;
  expression: Expression;
  isGraphTraversal: boolean;
  traversal?: GraphTraversal;
  options?: ObjectLiteral;
}

export interface GraphTraversal extends BaseNode {
  type: 'GraphTraversal';
  direction: 'OUTBOUND' | 'INBOUND' | 'ANY';
  pathType?: 'SHORTEST_PATH' | 'K_SHORTEST_PATHS' | 'K_PATHS' | 'ALL_SHORTEST_PATHS';
  startVertex: Expression;
  targetVertex?: Expression;
  graph?: Expression;
  edgeCollections?: EdgeCollection[];
  pruneCondition?: Expression;
  options?: ObjectLiteral;
}

export interface EdgeCollection extends BaseNode {
  type: 'EdgeCollection';
  name: string;
  direction?: 'OUTBOUND' | 'INBOUND' | 'ANY';
}

export interface LetStatement extends BaseNode {
  type: 'LetStatement';
  variable: VariableDeclaration;
  expression: Expression;
}

export interface FilterStatement extends BaseNode {
  type: 'FilterStatement';
  condition: Expression;
}

export interface SearchStatement extends BaseNode {
  type: 'SearchStatement';
  condition: Expression;
  options?: ObjectLiteral;
}

export interface SortStatement extends BaseNode {
  type: 'SortStatement';
  expressions: SortExpression[];
}

export interface SortExpression extends BaseNode {
  type: 'SortExpression';
  expression: Expression;
  direction: 'ASC' | 'DESC';
}

export interface LimitStatement extends BaseNode {
  type: 'LimitStatement';
  offset?: Expression;
  count: Expression;
}

export interface CollectStatement extends BaseNode {
  type: 'CollectStatement';
  groups?: CollectVariable[];
  into?: VariableDeclaration;
  intoExpression?: Expression;
  keep?: string[];
  withCount?: VariableDeclaration;
  aggregate?: CollectVariable[];
  options?: ObjectLiteral;
}

export interface CollectVariable extends BaseNode {
  type: 'CollectVariable';
  variable: VariableDeclaration;
  expression: Expression;
}

export interface WindowStatement extends BaseNode {
  type: 'WindowStatement';
  variable: VariableDeclaration;
  options: ObjectLiteral;
}

export interface ReturnStatement extends BaseNode {
  type: 'ReturnStatement';
  expression: Expression;
  distinct: boolean;
}

export interface InsertStatement extends BaseNode {
  type: 'InsertStatement';
  document: Expression;
  collection: Expression;
  options?: ObjectLiteral;
}

export interface UpdateStatement extends BaseNode {
  type: 'UpdateStatement';
  document: Expression;
  with?: Expression;
  collection: Expression;
  options?: ObjectLiteral;
}

export interface ReplaceStatement extends BaseNode {
  type: 'ReplaceStatement';
  document: Expression;
  with?: Expression;
  collection: Expression;
  options?: ObjectLiteral;
}

export interface RemoveStatement extends BaseNode {
  type: 'RemoveStatement';
  document: Expression;
  collection: Expression;
  options?: ObjectLiteral;
}

export interface UpsertStatement extends BaseNode {
  type: 'UpsertStatement';
  search: Expression;
  insert: Expression;
  updateOrReplace: Expression;
  isReplace: boolean;
  collection: Expression;
  options?: ObjectLiteral;
}

export interface WithStatement extends BaseNode {
  type: 'WithStatement';
  collections: string[];
}

// Query (top-level)
export interface Query extends BaseNode {
  type: 'Query';
  statements: Statement[];
}

// Union types
export type Literal =
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | NullLiteral
  | ArrayLiteral
  | ObjectLiteral;

export type Expression =
  | IdentifierNode
  | BindParameterNode
  | Literal
  | BinaryExpression
  | UnaryExpression
  | TernaryExpression
  | MemberExpression
  | CallExpression
  | RangeExpression
  | ArrayAccessExpression
  | SubqueryExpression;

export type Statement =
  | ForStatement
  | LetStatement
  | FilterStatement
  | SearchStatement
  | SortStatement
  | LimitStatement
  | CollectStatement
  | WindowStatement
  | ReturnStatement
  | InsertStatement
  | UpdateStatement
  | ReplaceStatement
  | RemoveStatement
  | UpsertStatement
  | WithStatement;

// =============================================================================
// Parse Result Types
// =============================================================================

export interface ParseError {
  message: string;
  line: number;
  column: number;
  offset: number;
  length: number;
  token?: IToken;
}

export interface ParseResult {
  cst: CstNode | null;
  ast: Query | null;
  errors: ParseError[];
  tokens: IToken[];
}

// =============================================================================
// Symbol Information
// =============================================================================

export interface SymbolInfo {
  name: string;
  kind: 'variable' | 'collection' | 'function' | 'bindParameter';
  location: Location;
  definition?: Location;
  references: Location[];
  type?: string;
}

export interface DocumentSymbols {
  variables: SymbolInfo[];
  collections: SymbolInfo[];
  functions: SymbolInfo[];
  bindParameters: SymbolInfo[];
}
