import { CstParser, CstNode, IToken } from 'chevrotain';
import {
  allTokens,
  // Keywords
  KwFor, KwReturn, KwFilter, KwSearch, KwSort, KwLimit, KwLet, KwCollect,
  KwAsc, KwDesc, KwIn, KwInto, KwWith, KwAnd, KwOr, KwNot, KwLike,
  KwInsert, KwUpdate, KwRemove, KwReplace, KwUpsert, KwOptions,
  KwDistinct, KwGraph, KwShortestPath, KwKShortestPaths, KwKPaths, KwAllShortestPaths,
  KwOutbound, KwInbound, KwAny, KwAll, KwNone, KwAggregate, KwPrune, KwWindow, KwKeep, KwTo,
  // Literals
  True, False, Null, Number_, SingleQuoteString, DoubleQuoteString, TemplateString,
  // Identifiers
  Identifier, QuotedIdentifier, ForwardTickIdentifier, BindParameter, CollectionBind,
  // Operators
  Eq, Ne, Gte, Lte, Gt, Lt, RegexMatch, RegexNotMatch,
  LogicalAnd, LogicalOr, LogicalNot,
  Plus, Minus, Star, Slash, Percent,
  Range, Assign, Question, Colon, NullishCoalescing,
  // Punctuation
  LParen, RParen, LBracket, RBracket, LBrace, RBrace, Comma, Dot, DoubleColon
} from './lexer';

export class AqlParser extends CstParser {
  constructor() {
    super(allTokens, {
      recoveryEnabled: true,
      nodeLocationTracking: 'full'
    });
    this.performSelfAnalysis();
  }

  // ==========================================================================
  // TOP LEVEL: Query
  // ==========================================================================

  public query = this.RULE('query', () => {
    this.MANY(() => {
      this.SUBRULE(this.queryBlock);
    });
  });

  private queryBlock = this.RULE('queryBlock', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.forStatement) },
      { ALT: () => this.SUBRULE(this.letStatement) },
      { ALT: () => this.SUBRULE(this.filterStatement) },
      { ALT: () => this.SUBRULE(this.searchStatement) },
      { ALT: () => this.SUBRULE(this.collectStatement) },
      { ALT: () => this.SUBRULE(this.sortStatement) },
      { ALT: () => this.SUBRULE(this.limitStatement) },
      { ALT: () => this.SUBRULE(this.windowStatement) },
      { ALT: () => this.SUBRULE(this.returnStatement) },
      { ALT: () => this.SUBRULE(this.insertStatement) },
      { ALT: () => this.SUBRULE(this.updateStatement) },
      { ALT: () => this.SUBRULE(this.replaceStatement) },
      { ALT: () => this.SUBRULE(this.removeStatement) },
      { ALT: () => this.SUBRULE(this.upsertStatement) },
      { ALT: () => this.SUBRULE(this.withStatement) }
    ]);
  });

  // ==========================================================================
  // STATEMENTS
  // ==========================================================================

  private forStatement = this.RULE('forStatement', () => {
    this.CONSUME(KwFor);
    this.SUBRULE(this.variableDeclaration);
    // Optional additional variables for graph traversal (v, e, p)
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.variableDeclaration);
    });
    this.CONSUME(KwIn);
    // Parse the expression/traversal source
    this.SUBRULE(this.forSource);
    this.OPTION(() => {
      this.SUBRULE(this.optionsClause);
    });
  });

  // For source can be a graph traversal or regular expression
  // Graph traversal is identified by direction keywords (OUTBOUND, INBOUND, ANY)
  private forSource = this.RULE('forSource', () => {
    this.OR([
      {
        // Graph traversal starting with direction keyword (no depth specified)
        GATE: () => this.LA(1).tokenType === KwOutbound ||
                    this.LA(1).tokenType === KwInbound ||
                    this.LA(1).tokenType === KwAny,
        ALT: () => this.SUBRULE(this.graphTraversalNoDepth)
      },
      {
        // Graph traversal with explicit depth: 1..3 OUTBOUND or 1 OUTBOUND
        // Use lookahead to check if number/range is followed by direction
        GATE: () => {
          const t1 = this.LA(1);
          if (t1.tokenType !== Number_) return false;
          const t2 = this.LA(2);
          // If second token is Range (..), check third token
          if (t2.tokenType === Range) {
            const t4 = this.LA(4); // After Number, Range, Number
            return t4.tokenType === KwOutbound ||
                   t4.tokenType === KwInbound ||
                   t4.tokenType === KwAny;
          }
          // Otherwise check if second token is direction
          return t2.tokenType === KwOutbound ||
                 t2.tokenType === KwInbound ||
                 t2.tokenType === KwAny;
        },
        ALT: () => this.SUBRULE(this.graphTraversalWithDepth)
      },
      {
        // Regular expression (catch-all)
        ALT: () => this.SUBRULE(this.expression)
      }
    ]);
  });

  private graphTraversalWithDepth = this.RULE('graphTraversalWithDepth', () => {
    // Depth: number or range
    this.CONSUME(Number_);
    this.OPTION(() => {
      this.CONSUME(Range);
      this.CONSUME2(Number_);
    });
    // Must be followed by direction to be valid graph traversal
    this.SUBRULE(this.graphTraversalRest);
  });

  private graphTraversalNoDepth = this.RULE('graphTraversalNoDepth', () => {
    this.SUBRULE(this.graphTraversalRest);
  });

  private graphTraversalRest = this.RULE('graphTraversalRest', () => {
    // Direction keyword
    this.OR([
      { ALT: () => this.CONSUME(KwOutbound) },
      { ALT: () => this.CONSUME(KwInbound) },
      { ALT: () => this.CONSUME(KwAny) }
    ]);
    // Optional path type
    this.OPTION(() => {
      this.OR2([
        { ALT: () => this.CONSUME(KwShortestPath) },
        { ALT: () => this.CONSUME(KwKShortestPaths) },
        { ALT: () => this.CONSUME(KwKPaths) },
        { ALT: () => this.CONSUME(KwAllShortestPaths) }
      ]);
    });
    this.SUBRULE(this.expression); // start vertex
    // Optional target vertex for shortest path
    this.OPTION2(() => {
      this.CONSUME(KwTo);
      this.SUBRULE2(this.expression);
    });
    // Graph name or edge collections
    this.OR3([
      { ALT: () => {
        this.CONSUME(KwGraph);
        this.SUBRULE3(this.expression); // graph name
      }},
      { ALT: () => this.SUBRULE(this.edgeCollections) }
    ]);
    // Optional PRUNE
    this.OPTION3(() => {
      this.CONSUME(KwPrune);
      this.SUBRULE4(this.expression);
    });
    // Optional OPTIONS for traversal
    this.OPTION4(() => {
      this.SUBRULE2(this.optionsClause);
    });
  });

  private edgeCollections = this.RULE('edgeCollections', () => {
    this.SUBRULE(this.edgeCollection);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.edgeCollection);
    });
  });

  private edgeCollection = this.RULE('edgeCollection', () => {
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(KwOutbound) },
        { ALT: () => this.CONSUME(KwInbound) },
        { ALT: () => this.CONSUME(KwAny) }
      ]);
    });
    this.SUBRULE(this.identifier);
  });

  private letStatement = this.RULE('letStatement', () => {
    this.CONSUME(KwLet);
    this.SUBRULE(this.variableDeclaration);
    this.CONSUME(Assign);
    this.SUBRULE(this.expression);
  });

  private filterStatement = this.RULE('filterStatement', () => {
    this.CONSUME(KwFilter);
    this.SUBRULE(this.expression);
  });

  private searchStatement = this.RULE('searchStatement', () => {
    this.CONSUME(KwSearch);
    this.SUBRULE(this.expression);
    this.OPTION(() => {
      this.SUBRULE(this.optionsClause);
    });
  });

  private collectStatement = this.RULE('collectStatement', () => {
    this.CONSUME(KwCollect);
    this.OPTION(() => {
      this.SUBRULE(this.collectVariables);
    });
    this.OPTION2(() => {
      this.CONSUME(KwInto);
      this.SUBRULE(this.variableDeclaration);
      this.OPTION3(() => {
        this.CONSUME(Assign);
        this.SUBRULE(this.expression);
      });
    });
    this.OPTION4(() => {
      this.CONSUME(KwKeep);
      this.SUBRULE2(this.identifierList);
    });
    this.OPTION5(() => {
      this.CONSUME(KwWith);
      this.CONSUME2(Identifier); // COUNT
      this.CONSUME2(KwInto);
      this.SUBRULE2(this.variableDeclaration);
    });
    this.OPTION6(() => {
      this.CONSUME(KwAggregate);
      this.SUBRULE(this.aggregateVariables);
    });
    this.OPTION7(() => {
      this.SUBRULE(this.optionsClause);
    });
  });

  private collectVariables = this.RULE('collectVariables', () => {
    this.SUBRULE(this.collectVariable);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.collectVariable);
    });
  });

  private collectVariable = this.RULE('collectVariable', () => {
    this.SUBRULE(this.variableDeclaration);
    this.CONSUME(Assign);
    this.SUBRULE(this.expression);
  });

  private aggregateVariables = this.RULE('aggregateVariables', () => {
    this.SUBRULE(this.aggregateVariable);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.aggregateVariable);
    });
  });

  private aggregateVariable = this.RULE('aggregateVariable', () => {
    this.SUBRULE(this.variableDeclaration);
    this.CONSUME(Assign);
    this.SUBRULE(this.expression);
  });

  private sortStatement = this.RULE('sortStatement', () => {
    this.CONSUME(KwSort);
    this.SUBRULE(this.sortExpression);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.sortExpression);
    });
  });

  private sortExpression = this.RULE('sortExpression', () => {
    this.SUBRULE(this.expression);
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(KwAsc) },
        { ALT: () => this.CONSUME(KwDesc) }
      ]);
    });
  });

  private limitStatement = this.RULE('limitStatement', () => {
    this.CONSUME(KwLimit);
    this.SUBRULE(this.expression);
    this.OPTION(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.expression);
    });
  });

  private windowStatement = this.RULE('windowStatement', () => {
    this.CONSUME(KwWindow);
    this.SUBRULE(this.variableDeclaration);
    this.CONSUME(KwWith);
    this.CONSUME(LBrace);
    this.SUBRULE(this.objectContent);
    this.CONSUME(RBrace);
  });

  private returnStatement = this.RULE('returnStatement', () => {
    this.CONSUME(KwReturn);
    this.OPTION(() => {
      this.CONSUME(KwDistinct);
    });
    this.SUBRULE(this.expression);
  });

  private insertStatement = this.RULE('insertStatement', () => {
    this.CONSUME(KwInsert);
    this.SUBRULE(this.documentExpression);
    this.OR([
      { ALT: () => this.CONSUME(KwInto) },
      { ALT: () => this.CONSUME(KwIn) }
    ]);
    this.SUBRULE(this.collectionExpression); // collection
    this.OPTION(() => {
      this.SUBRULE(this.optionsClause);
    });
  });

  private updateStatement = this.RULE('updateStatement', () => {
    this.CONSUME(KwUpdate);
    this.SUBRULE(this.documentExpression);
    this.OPTION(() => {
      this.CONSUME(KwWith);
      this.SUBRULE2(this.documentExpression);
    });
    this.CONSUME(KwIn);
    this.SUBRULE(this.collectionExpression); // collection
    this.OPTION2(() => {
      this.SUBRULE(this.optionsClause);
    });
  });

  private replaceStatement = this.RULE('replaceStatement', () => {
    this.CONSUME(KwReplace);
    this.SUBRULE(this.documentExpression);
    this.OPTION(() => {
      this.CONSUME(KwWith);
      this.SUBRULE2(this.documentExpression);
    });
    this.CONSUME(KwIn);
    this.SUBRULE(this.collectionExpression); // collection
    this.OPTION2(() => {
      this.SUBRULE(this.optionsClause);
    });
  });

  private removeStatement = this.RULE('removeStatement', () => {
    this.CONSUME(KwRemove);
    this.SUBRULE(this.documentExpression);
    this.CONSUME(KwIn);
    this.SUBRULE(this.collectionExpression); // collection
    this.OPTION(() => {
      this.SUBRULE(this.optionsClause);
    });
  });

  private upsertStatement = this.RULE('upsertStatement', () => {
    this.CONSUME(KwUpsert);
    this.SUBRULE(this.documentExpression); // search expression
    this.CONSUME(KwInsert);
    this.SUBRULE2(this.documentExpression); // insert expression
    this.OR([
      { ALT: () => this.CONSUME(KwUpdate) },
      { ALT: () => this.CONSUME(KwReplace) }
    ]);
    this.SUBRULE3(this.documentExpression); // update/replace expression
    this.CONSUME(KwIn);
    this.SUBRULE(this.collectionExpression); // collection
    this.OPTION(() => {
      this.SUBRULE(this.optionsClause);
    });
  });

  // Collection expression - simple identifier or bind parameter for collection names
  private collectionExpression = this.RULE('collectionExpression', () => {
    this.OR([
      { ALT: () => this.CONSUME(CollectionBind) },
      { ALT: () => this.SUBRULE(this.identifier) }
    ]);
  });

  private withStatement = this.RULE('withStatement', () => {
    this.CONSUME(KwWith);
    this.SUBRULE(this.identifierList);
  });

  private optionsClause = this.RULE('optionsClause', () => {
    this.CONSUME(KwOptions);
    this.SUBRULE(this.objectLiteral);
  });

  // ==========================================================================
  // EXPRESSIONS
  // ==========================================================================

  private expression = this.RULE('expression', () => {
    this.SUBRULE(this.ternaryExpression);
  });

  // Document expression - used in data modification statements
  // Does NOT include the IN operator to avoid consuming statement-level IN
  private documentExpression = this.RULE('documentExpression', () => {
    this.SUBRULE(this.rangeExpression);
  });

  private ternaryExpression = this.RULE('ternaryExpression', () => {
    this.SUBRULE(this.nullishExpression);
    this.OPTION(() => {
      this.CONSUME(Question);
      this.SUBRULE2(this.expression);
      this.CONSUME(Colon);
      this.SUBRULE3(this.expression);
    });
  });

  private nullishExpression = this.RULE('nullishExpression', () => {
    this.SUBRULE(this.orExpression);
    this.MANY(() => {
      this.CONSUME(NullishCoalescing);
      this.SUBRULE2(this.orExpression);
    });
  });

  private orExpression = this.RULE('orExpression', () => {
    this.SUBRULE(this.andExpression);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(LogicalOr) },
        { ALT: () => this.CONSUME(KwOr) }
      ]);
      this.SUBRULE2(this.andExpression);
    });
  });

  private andExpression = this.RULE('andExpression', () => {
    this.SUBRULE(this.notExpression);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(LogicalAnd) },
        { ALT: () => this.CONSUME(KwAnd) }
      ]);
      this.SUBRULE2(this.notExpression);
    });
  });

  private notExpression = this.RULE('notExpression', () => {
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(LogicalNot) },
        { ALT: () => this.CONSUME(KwNot) }
      ]);
    });
    this.SUBRULE(this.comparisonExpression);
  });

  private comparisonExpression = this.RULE('comparisonExpression', () => {
    this.SUBRULE(this.inExpression);
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(Eq) },
        { ALT: () => this.CONSUME(Ne) },
        { ALT: () => this.CONSUME(Lt) },
        { ALT: () => this.CONSUME(Lte) },
        { ALT: () => this.CONSUME(Gt) },
        { ALT: () => this.CONSUME(Gte) },
        { ALT: () => this.CONSUME(RegexMatch) },
        { ALT: () => this.CONSUME(RegexNotMatch) },
        { ALT: () => this.CONSUME(KwLike) }
      ]);
      this.SUBRULE2(this.inExpression);
    });
  });

  private inExpression = this.RULE('inExpression', () => {
    this.SUBRULE(this.rangeExpression);
    this.OPTION(() => {
      this.OPTION2(() => {
        this.CONSUME(KwNot);
      });
      this.CONSUME(KwIn);
      this.SUBRULE2(this.rangeExpression);
    });
  });

  private rangeExpression = this.RULE('rangeExpression', () => {
    this.SUBRULE(this.additiveExpression);
    this.OPTION(() => {
      this.CONSUME(Range);
      this.SUBRULE2(this.additiveExpression);
    });
  });

  private additiveExpression = this.RULE('additiveExpression', () => {
    this.SUBRULE(this.multiplicativeExpression);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(Plus) },
        { ALT: () => this.CONSUME(Minus) }
      ]);
      this.SUBRULE2(this.multiplicativeExpression);
    });
  });

  private multiplicativeExpression = this.RULE('multiplicativeExpression', () => {
    this.SUBRULE(this.unaryExpression);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(Star) },
        { ALT: () => this.CONSUME(Slash) },
        { ALT: () => this.CONSUME(Percent) }
      ]);
      this.SUBRULE2(this.unaryExpression);
    });
  });

  private unaryExpression = this.RULE('unaryExpression', () => {
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(Plus) },
        { ALT: () => this.CONSUME(Minus) }
      ]);
    });
    this.SUBRULE(this.postfixExpression);
  });

  private postfixExpression = this.RULE('postfixExpression', () => {
    this.SUBRULE(this.primaryExpression);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.memberAccess) },
        { ALT: () => this.SUBRULE(this.arrayAccess) },
        { ALT: () => this.SUBRULE(this.functionCall) }
      ]);
    });
  });

  private memberAccess = this.RULE('memberAccess', () => {
    this.CONSUME(Dot);
    this.OR([
      { ALT: () => this.SUBRULE(this.identifier) },
      { ALT: () => this.CONSUME(Star) } // for [*] expansion
    ]);
  });

  private arrayAccess = this.RULE('arrayAccess', () => {
    this.CONSUME(LBracket);
    this.OR([
      { ALT: () => {
        this.CONSUME(Star);
        this.OPTION(() => {
          this.SUBRULE(this.arrayFilter);
        });
      }},
      { ALT: () => this.SUBRULE(this.expression) }
    ]);
    this.CONSUME(RBracket);
  });

  private arrayFilter = this.RULE('arrayFilter', () => {
    this.CONSUME(KwFilter);
    this.SUBRULE(this.expression);
    this.OPTION(() => {
      this.CONSUME(KwLimit);
      this.SUBRULE2(this.expression);
      this.OPTION2(() => {
        this.CONSUME(Comma);
        this.SUBRULE3(this.expression);
      });
    });
    this.OPTION3(() => {
      this.CONSUME(KwReturn);
      this.SUBRULE4(this.expression);
    });
  });

  private functionCall = this.RULE('functionCall', () => {
    this.CONSUME(LParen);
    this.OPTION(() => {
      this.SUBRULE(this.argumentList);
    });
    this.CONSUME(RParen);
  });

  private argumentList = this.RULE('argumentList', () => {
    this.SUBRULE(this.argumentExpression);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.argumentExpression);
    });
  });

  // An argument can be an expression OR a subquery directly (without extra parens)
  private argumentExpression = this.RULE('argumentExpression', () => {
    this.OR([
      {
        // Subquery directly in function argument: LENGTH(FOR x IN y RETURN 1)
        GATE: () => {
          const t1 = this.LA(1);
          return t1.tokenType === KwFor ||
                 t1.tokenType === KwLet ||
                 t1.tokenType === KwReturn ||
                 t1.tokenType === KwWith;
        },
        ALT: () => this.SUBRULE(this.query)
      },
      {
        ALT: () => this.SUBRULE(this.expression)
      }
    ]);
  });

  // ==========================================================================
  // PRIMARY EXPRESSIONS
  // ==========================================================================

  private primaryExpression = this.RULE('primaryExpression', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.literal) },
      { ALT: () => this.SUBRULE(this.arrayLiteral) },
      { ALT: () => this.SUBRULE(this.objectLiteral) },
      {
        // Subquery: (FOR ...) or (LET ...) etc.
        GATE: () => {
          if (this.LA(1).tokenType !== LParen) return false;
          const t2 = this.LA(2);
          // Check if second token is a query-starting keyword
          return t2.tokenType === KwFor ||
                 t2.tokenType === KwLet ||
                 t2.tokenType === KwReturn ||
                 t2.tokenType === KwWith;
        },
        ALT: () => this.SUBRULE(this.subquery)
      },
      { ALT: () => this.SUBRULE(this.reference) },
      { ALT: () => this.SUBRULE(this.parenthesizedExpression) }
    ]);
  });

  private literal = this.RULE('literal', () => {
    this.OR([
      { ALT: () => this.CONSUME(Number_) },
      { ALT: () => this.CONSUME(SingleQuoteString) },
      { ALT: () => this.CONSUME(DoubleQuoteString) },
      { ALT: () => this.CONSUME(TemplateString) },
      { ALT: () => this.CONSUME(True) },
      { ALT: () => this.CONSUME(False) },
      { ALT: () => this.CONSUME(Null) }
    ]);
  });

  private arrayLiteral = this.RULE('arrayLiteral', () => {
    this.CONSUME(LBracket);
    this.OPTION(() => {
      this.SUBRULE(this.arrayContent);
    });
    this.CONSUME(RBracket);
  });

  private arrayContent = this.RULE('arrayContent', () => {
    this.SUBRULE(this.expression);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.expression);
    });
  });

  private objectLiteral = this.RULE('objectLiteral', () => {
    this.CONSUME(LBrace);
    this.OPTION(() => {
      this.SUBRULE(this.objectContent);
    });
    this.CONSUME(RBrace);
  });

  private objectContent = this.RULE('objectContent', () => {
    this.SUBRULE(this.objectEntry);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.objectEntry);
    });
  });

  private objectEntry = this.RULE('objectEntry', () => {
    this.OR([
      { ALT: () => {
        // Computed property: [expr]: value
        this.CONSUME(LBracket);
        this.SUBRULE(this.expression);
        this.CONSUME(RBracket);
        this.CONSUME(Colon);
        this.SUBRULE2(this.expression);
      }},
      { ALT: () => {
        // Regular property: key: value or shorthand: key
        this.SUBRULE(this.propertyKey);
        this.OPTION(() => {
          this.CONSUME2(Colon);
          this.SUBRULE3(this.expression);
        });
      }}
    ]);
  });

  private propertyKey = this.RULE('propertyKey', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.identifier) },
      { ALT: () => this.CONSUME(SingleQuoteString) },
      { ALT: () => this.CONSUME(DoubleQuoteString) }
    ]);
  });

  private subquery = this.RULE('subquery', () => {
    this.CONSUME(LParen);
    this.SUBRULE(this.query);
    this.CONSUME(RParen);
  });

  private reference = this.RULE('reference', () => {
    this.OR([
      { ALT: () => this.CONSUME(BindParameter) },
      { ALT: () => this.CONSUME(CollectionBind) },
      { ALT: () => {
        // Function call or identifier with optional namespace
        this.SUBRULE(this.qualifiedIdentifier);
        this.OPTION(() => {
          this.SUBRULE(this.functionCall);
        });
      }}
    ]);
  });

  private qualifiedIdentifier = this.RULE('qualifiedIdentifier', () => {
    this.SUBRULE(this.identifier);
    this.MANY(() => {
      this.CONSUME(DoubleColon);
      this.SUBRULE2(this.identifier);
    });
  });

  private parenthesizedExpression = this.RULE('parenthesizedExpression', () => {
    this.CONSUME(LParen);
    this.SUBRULE(this.expression);
    this.CONSUME(RParen);
  });

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private identifier = this.RULE('identifier', () => {
    this.OR([
      { ALT: () => this.CONSUME(Identifier) },
      { ALT: () => this.CONSUME(QuotedIdentifier) },
      { ALT: () => this.CONSUME(ForwardTickIdentifier) }
    ]);
  });

  private variableDeclaration = this.RULE('variableDeclaration', () => {
    this.SUBRULE(this.identifier);
  });

  private identifierList = this.RULE('identifierList', () => {
    this.SUBRULE(this.identifier);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.identifier);
    });
  });
}

// Singleton parser instance - created lazily to avoid circular dependency issues
let _aqlParser: AqlParser | null = null;

export function getAqlParser(): AqlParser {
  if (!_aqlParser) {
    _aqlParser = new AqlParser();
  }
  return _aqlParser;
}

// For backwards compatibility
export const aqlParser = {
  get input() { return getAqlParser().input; },
  set input(value) { getAqlParser().input = value; },
  query() { return getAqlParser().query(); },
  get errors() { return getAqlParser().errors; }
};
