"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aqlParser = exports.AqlParser = void 0;
exports.getAqlParser = getAqlParser;
const chevrotain_1 = require("chevrotain");
const lexer_1 = require("./lexer");
class AqlParser extends chevrotain_1.CstParser {
    constructor() {
        super(lexer_1.allTokens, {
            recoveryEnabled: true,
            nodeLocationTracking: 'full'
        });
        // ==========================================================================
        // TOP LEVEL: Query
        // ==========================================================================
        this.query = this.RULE('query', () => {
            this.MANY(() => {
                this.SUBRULE(this.queryBlock);
            });
        });
        this.queryBlock = this.RULE('queryBlock', () => {
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
        this.forStatement = this.RULE('forStatement', () => {
            this.CONSUME(lexer_1.KwFor);
            this.SUBRULE(this.variableDeclaration);
            // Optional additional variables for graph traversal (v, e, p)
            this.MANY(() => {
                this.CONSUME(lexer_1.Comma);
                this.SUBRULE2(this.variableDeclaration);
            });
            this.CONSUME(lexer_1.KwIn);
            // Parse the expression/traversal source
            this.SUBRULE(this.forSource);
            this.OPTION(() => {
                this.SUBRULE(this.optionsClause);
            });
        });
        // For source can be a graph traversal or regular expression
        // Graph traversal is identified by direction keywords (OUTBOUND, INBOUND, ANY)
        this.forSource = this.RULE('forSource', () => {
            this.OR([
                {
                    // Graph traversal starting with direction keyword (no depth specified)
                    GATE: () => this.LA(1).tokenType === lexer_1.KwOutbound ||
                        this.LA(1).tokenType === lexer_1.KwInbound ||
                        this.LA(1).tokenType === lexer_1.KwAny,
                    ALT: () => this.SUBRULE(this.graphTraversalNoDepth)
                },
                {
                    // Graph traversal with explicit depth: 1..3 OUTBOUND or 1 OUTBOUND
                    // Use lookahead to check if number/range is followed by direction
                    GATE: () => {
                        const t1 = this.LA(1);
                        if (t1.tokenType !== lexer_1.Number_)
                            return false;
                        const t2 = this.LA(2);
                        // If second token is Range (..), check third token
                        if (t2.tokenType === lexer_1.Range) {
                            const t4 = this.LA(4); // After Number, Range, Number
                            return t4.tokenType === lexer_1.KwOutbound ||
                                t4.tokenType === lexer_1.KwInbound ||
                                t4.tokenType === lexer_1.KwAny;
                        }
                        // Otherwise check if second token is direction
                        return t2.tokenType === lexer_1.KwOutbound ||
                            t2.tokenType === lexer_1.KwInbound ||
                            t2.tokenType === lexer_1.KwAny;
                    },
                    ALT: () => this.SUBRULE(this.graphTraversalWithDepth)
                },
                {
                    // Regular expression (catch-all)
                    ALT: () => this.SUBRULE(this.expression)
                }
            ]);
        });
        this.graphTraversalWithDepth = this.RULE('graphTraversalWithDepth', () => {
            // Depth: number or range
            this.CONSUME(lexer_1.Number_);
            this.OPTION(() => {
                this.CONSUME(lexer_1.Range);
                this.CONSUME2(lexer_1.Number_);
            });
            // Must be followed by direction to be valid graph traversal
            this.SUBRULE(this.graphTraversalRest);
        });
        this.graphTraversalNoDepth = this.RULE('graphTraversalNoDepth', () => {
            this.SUBRULE(this.graphTraversalRest);
        });
        this.graphTraversalRest = this.RULE('graphTraversalRest', () => {
            // Direction keyword
            this.OR([
                { ALT: () => this.CONSUME(lexer_1.KwOutbound) },
                { ALT: () => this.CONSUME(lexer_1.KwInbound) },
                { ALT: () => this.CONSUME(lexer_1.KwAny) }
            ]);
            // Optional path type
            this.OPTION(() => {
                this.OR2([
                    { ALT: () => this.CONSUME(lexer_1.KwShortestPath) },
                    { ALT: () => this.CONSUME(lexer_1.KwKShortestPaths) },
                    { ALT: () => this.CONSUME(lexer_1.KwKPaths) },
                    { ALT: () => this.CONSUME(lexer_1.KwAllShortestPaths) }
                ]);
            });
            this.SUBRULE(this.expression); // start vertex
            // Optional target vertex for shortest path
            this.OPTION2(() => {
                this.CONSUME(lexer_1.KwTo);
                this.SUBRULE2(this.expression);
            });
            // Graph name or edge collections
            this.OR3([
                { ALT: () => {
                        this.CONSUME(lexer_1.KwGraph);
                        this.SUBRULE3(this.expression); // graph name
                    } },
                { ALT: () => this.SUBRULE(this.edgeCollections) }
            ]);
            // Optional PRUNE
            this.OPTION3(() => {
                this.CONSUME(lexer_1.KwPrune);
                this.SUBRULE4(this.expression);
            });
            // Optional OPTIONS for traversal
            this.OPTION4(() => {
                this.SUBRULE2(this.optionsClause);
            });
        });
        this.edgeCollections = this.RULE('edgeCollections', () => {
            this.SUBRULE(this.edgeCollection);
            this.MANY(() => {
                this.CONSUME(lexer_1.Comma);
                this.SUBRULE2(this.edgeCollection);
            });
        });
        this.edgeCollection = this.RULE('edgeCollection', () => {
            this.OPTION(() => {
                this.OR([
                    { ALT: () => this.CONSUME(lexer_1.KwOutbound) },
                    { ALT: () => this.CONSUME(lexer_1.KwInbound) },
                    { ALT: () => this.CONSUME(lexer_1.KwAny) }
                ]);
            });
            this.SUBRULE(this.identifier);
        });
        this.letStatement = this.RULE('letStatement', () => {
            this.CONSUME(lexer_1.KwLet);
            this.SUBRULE(this.variableDeclaration);
            this.CONSUME(lexer_1.Assign);
            this.SUBRULE(this.expression);
        });
        this.filterStatement = this.RULE('filterStatement', () => {
            this.CONSUME(lexer_1.KwFilter);
            this.SUBRULE(this.expression);
        });
        this.searchStatement = this.RULE('searchStatement', () => {
            this.CONSUME(lexer_1.KwSearch);
            this.SUBRULE(this.expression);
            this.OPTION(() => {
                this.SUBRULE(this.optionsClause);
            });
        });
        this.collectStatement = this.RULE('collectStatement', () => {
            this.CONSUME(lexer_1.KwCollect);
            this.OPTION(() => {
                this.SUBRULE(this.collectVariables);
            });
            this.OPTION2(() => {
                this.CONSUME(lexer_1.KwInto);
                this.SUBRULE(this.variableDeclaration);
                this.OPTION3(() => {
                    this.CONSUME(lexer_1.Assign);
                    this.SUBRULE(this.expression);
                });
            });
            this.OPTION4(() => {
                this.CONSUME(lexer_1.KwKeep);
                this.SUBRULE2(this.identifierList);
            });
            this.OPTION5(() => {
                this.CONSUME(lexer_1.KwWith);
                this.CONSUME2(lexer_1.Identifier); // COUNT
                this.CONSUME2(lexer_1.KwInto);
                this.SUBRULE2(this.variableDeclaration);
            });
            this.OPTION6(() => {
                this.CONSUME(lexer_1.KwAggregate);
                this.SUBRULE(this.aggregateVariables);
            });
            this.OPTION7(() => {
                this.SUBRULE(this.optionsClause);
            });
        });
        this.collectVariables = this.RULE('collectVariables', () => {
            this.SUBRULE(this.collectVariable);
            this.MANY(() => {
                this.CONSUME(lexer_1.Comma);
                this.SUBRULE2(this.collectVariable);
            });
        });
        this.collectVariable = this.RULE('collectVariable', () => {
            this.SUBRULE(this.variableDeclaration);
            this.CONSUME(lexer_1.Assign);
            this.SUBRULE(this.expression);
        });
        this.aggregateVariables = this.RULE('aggregateVariables', () => {
            this.SUBRULE(this.aggregateVariable);
            this.MANY(() => {
                this.CONSUME(lexer_1.Comma);
                this.SUBRULE2(this.aggregateVariable);
            });
        });
        this.aggregateVariable = this.RULE('aggregateVariable', () => {
            this.SUBRULE(this.variableDeclaration);
            this.CONSUME(lexer_1.Assign);
            this.SUBRULE(this.expression);
        });
        this.sortStatement = this.RULE('sortStatement', () => {
            this.CONSUME(lexer_1.KwSort);
            this.SUBRULE(this.sortExpression);
            this.MANY(() => {
                this.CONSUME(lexer_1.Comma);
                this.SUBRULE2(this.sortExpression);
            });
        });
        this.sortExpression = this.RULE('sortExpression', () => {
            this.SUBRULE(this.expression);
            this.OPTION(() => {
                this.OR([
                    { ALT: () => this.CONSUME(lexer_1.KwAsc) },
                    { ALT: () => this.CONSUME(lexer_1.KwDesc) }
                ]);
            });
        });
        this.limitStatement = this.RULE('limitStatement', () => {
            this.CONSUME(lexer_1.KwLimit);
            this.SUBRULE(this.expression);
            this.OPTION(() => {
                this.CONSUME(lexer_1.Comma);
                this.SUBRULE2(this.expression);
            });
        });
        this.windowStatement = this.RULE('windowStatement', () => {
            this.CONSUME(lexer_1.KwWindow);
            this.SUBRULE(this.variableDeclaration);
            this.CONSUME(lexer_1.KwWith);
            this.CONSUME(lexer_1.LBrace);
            this.SUBRULE(this.objectContent);
            this.CONSUME(lexer_1.RBrace);
        });
        this.returnStatement = this.RULE('returnStatement', () => {
            this.CONSUME(lexer_1.KwReturn);
            this.OPTION(() => {
                this.CONSUME(lexer_1.KwDistinct);
            });
            this.SUBRULE(this.expression);
        });
        this.insertStatement = this.RULE('insertStatement', () => {
            this.CONSUME(lexer_1.KwInsert);
            this.SUBRULE(this.documentExpression);
            this.OR([
                { ALT: () => this.CONSUME(lexer_1.KwInto) },
                { ALT: () => this.CONSUME(lexer_1.KwIn) }
            ]);
            this.SUBRULE(this.collectionExpression); // collection
            this.OPTION(() => {
                this.SUBRULE(this.optionsClause);
            });
        });
        this.updateStatement = this.RULE('updateStatement', () => {
            this.CONSUME(lexer_1.KwUpdate);
            this.SUBRULE(this.documentExpression);
            this.OPTION(() => {
                this.CONSUME(lexer_1.KwWith);
                this.SUBRULE2(this.documentExpression);
            });
            this.CONSUME(lexer_1.KwIn);
            this.SUBRULE(this.collectionExpression); // collection
            this.OPTION2(() => {
                this.SUBRULE(this.optionsClause);
            });
        });
        this.replaceStatement = this.RULE('replaceStatement', () => {
            this.CONSUME(lexer_1.KwReplace);
            this.SUBRULE(this.documentExpression);
            this.OPTION(() => {
                this.CONSUME(lexer_1.KwWith);
                this.SUBRULE2(this.documentExpression);
            });
            this.CONSUME(lexer_1.KwIn);
            this.SUBRULE(this.collectionExpression); // collection
            this.OPTION2(() => {
                this.SUBRULE(this.optionsClause);
            });
        });
        this.removeStatement = this.RULE('removeStatement', () => {
            this.CONSUME(lexer_1.KwRemove);
            this.SUBRULE(this.documentExpression);
            this.CONSUME(lexer_1.KwIn);
            this.SUBRULE(this.collectionExpression); // collection
            this.OPTION(() => {
                this.SUBRULE(this.optionsClause);
            });
        });
        this.upsertStatement = this.RULE('upsertStatement', () => {
            this.CONSUME(lexer_1.KwUpsert);
            this.SUBRULE(this.documentExpression); // search expression
            this.CONSUME(lexer_1.KwInsert);
            this.SUBRULE2(this.documentExpression); // insert expression
            this.OR([
                { ALT: () => this.CONSUME(lexer_1.KwUpdate) },
                { ALT: () => this.CONSUME(lexer_1.KwReplace) }
            ]);
            this.SUBRULE3(this.documentExpression); // update/replace expression
            this.CONSUME(lexer_1.KwIn);
            this.SUBRULE(this.collectionExpression); // collection
            this.OPTION(() => {
                this.SUBRULE(this.optionsClause);
            });
        });
        // Collection expression - simple identifier or bind parameter for collection names
        this.collectionExpression = this.RULE('collectionExpression', () => {
            this.OR([
                { ALT: () => this.CONSUME(lexer_1.CollectionBind) },
                { ALT: () => this.SUBRULE(this.identifier) }
            ]);
        });
        this.withStatement = this.RULE('withStatement', () => {
            this.CONSUME(lexer_1.KwWith);
            this.SUBRULE(this.identifierList);
        });
        this.optionsClause = this.RULE('optionsClause', () => {
            this.CONSUME(lexer_1.KwOptions);
            this.SUBRULE(this.objectLiteral);
        });
        // ==========================================================================
        // EXPRESSIONS
        // ==========================================================================
        this.expression = this.RULE('expression', () => {
            this.SUBRULE(this.ternaryExpression);
        });
        // Document expression - used in data modification statements
        // Does NOT include the IN operator to avoid consuming statement-level IN
        this.documentExpression = this.RULE('documentExpression', () => {
            this.SUBRULE(this.rangeExpression);
        });
        this.ternaryExpression = this.RULE('ternaryExpression', () => {
            this.SUBRULE(this.nullishExpression);
            this.OPTION(() => {
                this.CONSUME(lexer_1.Question);
                this.SUBRULE2(this.expression);
                this.CONSUME(lexer_1.Colon);
                this.SUBRULE3(this.expression);
            });
        });
        this.nullishExpression = this.RULE('nullishExpression', () => {
            this.SUBRULE(this.orExpression);
            this.MANY(() => {
                this.CONSUME(lexer_1.NullishCoalescing);
                this.SUBRULE2(this.orExpression);
            });
        });
        this.orExpression = this.RULE('orExpression', () => {
            this.SUBRULE(this.andExpression);
            this.MANY(() => {
                this.OR([
                    { ALT: () => this.CONSUME(lexer_1.LogicalOr) },
                    { ALT: () => this.CONSUME(lexer_1.KwOr) }
                ]);
                this.SUBRULE2(this.andExpression);
            });
        });
        this.andExpression = this.RULE('andExpression', () => {
            this.SUBRULE(this.notExpression);
            this.MANY(() => {
                this.OR([
                    { ALT: () => this.CONSUME(lexer_1.LogicalAnd) },
                    { ALT: () => this.CONSUME(lexer_1.KwAnd) }
                ]);
                this.SUBRULE2(this.notExpression);
            });
        });
        this.notExpression = this.RULE('notExpression', () => {
            this.MANY(() => {
                this.OR([
                    { ALT: () => this.CONSUME(lexer_1.LogicalNot) },
                    { ALT: () => this.CONSUME(lexer_1.KwNot) }
                ]);
            });
            this.SUBRULE(this.comparisonExpression);
        });
        this.comparisonExpression = this.RULE('comparisonExpression', () => {
            this.SUBRULE(this.inExpression);
            this.OPTION(() => {
                this.OR([
                    { ALT: () => this.CONSUME(lexer_1.Eq) },
                    { ALT: () => this.CONSUME(lexer_1.Ne) },
                    { ALT: () => this.CONSUME(lexer_1.Lt) },
                    { ALT: () => this.CONSUME(lexer_1.Lte) },
                    { ALT: () => this.CONSUME(lexer_1.Gt) },
                    { ALT: () => this.CONSUME(lexer_1.Gte) },
                    { ALT: () => this.CONSUME(lexer_1.RegexMatch) },
                    { ALT: () => this.CONSUME(lexer_1.RegexNotMatch) },
                    { ALT: () => this.CONSUME(lexer_1.KwLike) }
                ]);
                this.SUBRULE2(this.inExpression);
            });
        });
        this.inExpression = this.RULE('inExpression', () => {
            this.SUBRULE(this.rangeExpression);
            this.OPTION(() => {
                this.OPTION2(() => {
                    this.CONSUME(lexer_1.KwNot);
                });
                this.CONSUME(lexer_1.KwIn);
                this.SUBRULE2(this.rangeExpression);
            });
        });
        this.rangeExpression = this.RULE('rangeExpression', () => {
            this.SUBRULE(this.additiveExpression);
            this.OPTION(() => {
                this.CONSUME(lexer_1.Range);
                this.SUBRULE2(this.additiveExpression);
            });
        });
        this.additiveExpression = this.RULE('additiveExpression', () => {
            this.SUBRULE(this.multiplicativeExpression);
            this.MANY(() => {
                this.OR([
                    { ALT: () => this.CONSUME(lexer_1.Plus) },
                    { ALT: () => this.CONSUME(lexer_1.Minus) }
                ]);
                this.SUBRULE2(this.multiplicativeExpression);
            });
        });
        this.multiplicativeExpression = this.RULE('multiplicativeExpression', () => {
            this.SUBRULE(this.unaryExpression);
            this.MANY(() => {
                this.OR([
                    { ALT: () => this.CONSUME(lexer_1.Star) },
                    { ALT: () => this.CONSUME(lexer_1.Slash) },
                    { ALT: () => this.CONSUME(lexer_1.Percent) }
                ]);
                this.SUBRULE2(this.unaryExpression);
            });
        });
        this.unaryExpression = this.RULE('unaryExpression', () => {
            this.OPTION(() => {
                this.OR([
                    { ALT: () => this.CONSUME(lexer_1.Plus) },
                    { ALT: () => this.CONSUME(lexer_1.Minus) }
                ]);
            });
            this.SUBRULE(this.postfixExpression);
        });
        this.postfixExpression = this.RULE('postfixExpression', () => {
            this.SUBRULE(this.primaryExpression);
            this.MANY(() => {
                this.OR([
                    { ALT: () => this.SUBRULE(this.memberAccess) },
                    { ALT: () => this.SUBRULE(this.arrayAccess) },
                    { ALT: () => this.SUBRULE(this.functionCall) }
                ]);
            });
        });
        this.memberAccess = this.RULE('memberAccess', () => {
            this.CONSUME(lexer_1.Dot);
            this.OR([
                { ALT: () => this.SUBRULE(this.identifier) },
                { ALT: () => this.CONSUME(lexer_1.Star) } // for [*] expansion
            ]);
        });
        this.arrayAccess = this.RULE('arrayAccess', () => {
            this.CONSUME(lexer_1.LBracket);
            this.OR([
                { ALT: () => {
                        this.CONSUME(lexer_1.Star);
                        this.OPTION(() => {
                            this.SUBRULE(this.arrayFilter);
                        });
                    } },
                { ALT: () => this.SUBRULE(this.expression) }
            ]);
            this.CONSUME(lexer_1.RBracket);
        });
        this.arrayFilter = this.RULE('arrayFilter', () => {
            this.CONSUME(lexer_1.KwFilter);
            this.SUBRULE(this.expression);
            this.OPTION(() => {
                this.CONSUME(lexer_1.KwLimit);
                this.SUBRULE2(this.expression);
                this.OPTION2(() => {
                    this.CONSUME(lexer_1.Comma);
                    this.SUBRULE3(this.expression);
                });
            });
            this.OPTION3(() => {
                this.CONSUME(lexer_1.KwReturn);
                this.SUBRULE4(this.expression);
            });
        });
        this.functionCall = this.RULE('functionCall', () => {
            this.CONSUME(lexer_1.LParen);
            this.OPTION(() => {
                this.SUBRULE(this.argumentList);
            });
            this.CONSUME(lexer_1.RParen);
        });
        this.argumentList = this.RULE('argumentList', () => {
            this.SUBRULE(this.argumentExpression);
            this.MANY(() => {
                this.CONSUME(lexer_1.Comma);
                this.SUBRULE2(this.argumentExpression);
            });
        });
        // An argument can be an expression OR a subquery directly (without extra parens)
        this.argumentExpression = this.RULE('argumentExpression', () => {
            this.OR([
                {
                    // Subquery directly in function argument: LENGTH(FOR x IN y RETURN 1)
                    GATE: () => {
                        const t1 = this.LA(1);
                        return t1.tokenType === lexer_1.KwFor ||
                            t1.tokenType === lexer_1.KwLet ||
                            t1.tokenType === lexer_1.KwReturn ||
                            t1.tokenType === lexer_1.KwWith;
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
        this.primaryExpression = this.RULE('primaryExpression', () => {
            this.OR([
                { ALT: () => this.SUBRULE(this.literal) },
                { ALT: () => this.SUBRULE(this.arrayLiteral) },
                { ALT: () => this.SUBRULE(this.objectLiteral) },
                {
                    // Subquery: (FOR ...) or (LET ...) etc.
                    GATE: () => {
                        if (this.LA(1).tokenType !== lexer_1.LParen)
                            return false;
                        const t2 = this.LA(2);
                        // Check if second token is a query-starting keyword
                        return t2.tokenType === lexer_1.KwFor ||
                            t2.tokenType === lexer_1.KwLet ||
                            t2.tokenType === lexer_1.KwReturn ||
                            t2.tokenType === lexer_1.KwWith;
                    },
                    ALT: () => this.SUBRULE(this.subquery)
                },
                { ALT: () => this.SUBRULE(this.reference) },
                { ALT: () => this.SUBRULE(this.parenthesizedExpression) }
            ]);
        });
        this.literal = this.RULE('literal', () => {
            this.OR([
                { ALT: () => this.CONSUME(lexer_1.Number_) },
                { ALT: () => this.CONSUME(lexer_1.SingleQuoteString) },
                { ALT: () => this.CONSUME(lexer_1.DoubleQuoteString) },
                { ALT: () => this.CONSUME(lexer_1.TemplateString) },
                { ALT: () => this.CONSUME(lexer_1.True) },
                { ALT: () => this.CONSUME(lexer_1.False) },
                { ALT: () => this.CONSUME(lexer_1.Null) }
            ]);
        });
        this.arrayLiteral = this.RULE('arrayLiteral', () => {
            this.CONSUME(lexer_1.LBracket);
            this.OPTION(() => {
                this.SUBRULE(this.arrayContent);
            });
            this.CONSUME(lexer_1.RBracket);
        });
        this.arrayContent = this.RULE('arrayContent', () => {
            this.SUBRULE(this.expression);
            this.MANY(() => {
                this.CONSUME(lexer_1.Comma);
                this.SUBRULE2(this.expression);
            });
        });
        this.objectLiteral = this.RULE('objectLiteral', () => {
            this.CONSUME(lexer_1.LBrace);
            this.OPTION(() => {
                this.SUBRULE(this.objectContent);
            });
            this.CONSUME(lexer_1.RBrace);
        });
        this.objectContent = this.RULE('objectContent', () => {
            this.SUBRULE(this.objectEntry);
            this.MANY(() => {
                this.CONSUME(lexer_1.Comma);
                this.SUBRULE2(this.objectEntry);
            });
        });
        this.objectEntry = this.RULE('objectEntry', () => {
            this.OR([
                { ALT: () => {
                        // Computed property: [expr]: value
                        this.CONSUME(lexer_1.LBracket);
                        this.SUBRULE(this.expression);
                        this.CONSUME(lexer_1.RBracket);
                        this.CONSUME(lexer_1.Colon);
                        this.SUBRULE2(this.expression);
                    } },
                { ALT: () => {
                        // Regular property: key: value or shorthand: key
                        this.SUBRULE(this.propertyKey);
                        this.OPTION(() => {
                            this.CONSUME2(lexer_1.Colon);
                            this.SUBRULE3(this.expression);
                        });
                    } }
            ]);
        });
        this.propertyKey = this.RULE('propertyKey', () => {
            this.OR([
                { ALT: () => this.SUBRULE(this.identifier) },
                { ALT: () => this.CONSUME(lexer_1.SingleQuoteString) },
                { ALT: () => this.CONSUME(lexer_1.DoubleQuoteString) }
            ]);
        });
        this.subquery = this.RULE('subquery', () => {
            this.CONSUME(lexer_1.LParen);
            this.SUBRULE(this.query);
            this.CONSUME(lexer_1.RParen);
        });
        this.reference = this.RULE('reference', () => {
            this.OR([
                { ALT: () => this.CONSUME(lexer_1.BindParameter) },
                { ALT: () => this.CONSUME(lexer_1.CollectionBind) },
                { ALT: () => {
                        // Function call or identifier with optional namespace
                        this.SUBRULE(this.qualifiedIdentifier);
                        this.OPTION(() => {
                            this.SUBRULE(this.functionCall);
                        });
                    } }
            ]);
        });
        this.qualifiedIdentifier = this.RULE('qualifiedIdentifier', () => {
            this.SUBRULE(this.identifier);
            this.MANY(() => {
                this.CONSUME(lexer_1.DoubleColon);
                this.SUBRULE2(this.identifier);
            });
        });
        this.parenthesizedExpression = this.RULE('parenthesizedExpression', () => {
            this.CONSUME(lexer_1.LParen);
            this.SUBRULE(this.expression);
            this.CONSUME(lexer_1.RParen);
        });
        // ==========================================================================
        // HELPERS
        // ==========================================================================
        this.identifier = this.RULE('identifier', () => {
            this.OR([
                { ALT: () => this.CONSUME(lexer_1.Identifier) },
                { ALT: () => this.CONSUME(lexer_1.QuotedIdentifier) },
                { ALT: () => this.CONSUME(lexer_1.ForwardTickIdentifier) }
            ]);
        });
        this.variableDeclaration = this.RULE('variableDeclaration', () => {
            this.SUBRULE(this.identifier);
        });
        this.identifierList = this.RULE('identifierList', () => {
            this.SUBRULE(this.identifier);
            this.MANY(() => {
                this.CONSUME(lexer_1.Comma);
                this.SUBRULE2(this.identifier);
            });
        });
        this.performSelfAnalysis();
    }
}
exports.AqlParser = AqlParser;
// Singleton parser instance - created lazily to avoid circular dependency issues
let _aqlParser = null;
function getAqlParser() {
    if (!_aqlParser) {
        _aqlParser = new AqlParser();
    }
    return _aqlParser;
}
// For backwards compatibility
exports.aqlParser = {
    get input() { return getAqlParser().input; },
    set input(value) { getAqlParser().input = value; },
    query() { return getAqlParser().query(); },
    get errors() { return getAqlParser().errors; }
};
//# sourceMappingURL=parser.js.map