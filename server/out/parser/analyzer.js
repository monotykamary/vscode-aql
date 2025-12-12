"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzer = exports.AqlAnalyzer = void 0;
const lexer_1 = require("./lexer");
const parser_1 = require("./parser");
/**
 * Analyzes AQL source code and extracts parse results and symbol information
 */
class AqlAnalyzer {
    /**
     * Parse AQL source code and return parse result with errors
     */
    parse(source) {
        // Tokenize
        const lexResult = lexer_1.AqlLexer.tokenize(source);
        const tokens = lexResult.tokens;
        const errors = [];
        // Collect lexer errors
        for (const error of lexResult.errors) {
            errors.push(this.convertLexerError(error));
        }
        // Parse
        const parser = (0, parser_1.getAqlParser)();
        parser.input = tokens;
        const cst = parser.query();
        // Collect parser errors
        for (const error of parser.errors) {
            errors.push(this.convertParserError(error));
        }
        return {
            cst,
            ast: null, // AST conversion would be implemented if needed
            errors,
            tokens
        };
    }
    /**
     * Extract symbols from parsed tokens for document outline and navigation
     */
    extractSymbols(tokens) {
        const symbols = {
            variables: [],
            collections: [],
            functions: [],
            bindParameters: []
        };
        let i = 0;
        while (i < tokens.length) {
            const token = tokens[i];
            // LET variable declarations
            if (token.tokenType.name === 'KwLet') {
                const nextToken = tokens[i + 1];
                if (nextToken && nextToken.tokenType.name === 'Identifier') {
                    symbols.variables.push({
                        name: nextToken.image,
                        kind: 'variable',
                        location: this.tokenToLocation(nextToken),
                        references: []
                    });
                }
            }
            // FOR variable declarations
            if (token.tokenType.name === 'KwFor') {
                const nextToken = tokens[i + 1];
                if (nextToken && nextToken.tokenType.name === 'Identifier') {
                    symbols.variables.push({
                        name: nextToken.image,
                        kind: 'variable',
                        location: this.tokenToLocation(nextToken),
                        references: []
                    });
                }
            }
            // Function calls (Identifier followed by LParen)
            if (token.tokenType.name === 'Identifier') {
                const nextToken = tokens[i + 1];
                if (nextToken && nextToken.tokenType.name === 'LParen') {
                    symbols.functions.push({
                        name: token.image,
                        kind: 'function',
                        location: this.tokenToLocation(token),
                        references: []
                    });
                }
            }
            // Bind parameters
            if (token.tokenType.name === 'BindParameter') {
                symbols.bindParameters.push({
                    name: token.image.substring(1), // Remove @ prefix
                    kind: 'bindParameter',
                    location: this.tokenToLocation(token),
                    references: []
                });
            }
            // Collection bind parameters
            if (token.tokenType.name === 'CollectionBind') {
                symbols.collections.push({
                    name: token.image.substring(2), // Remove @@ prefix
                    kind: 'collection',
                    location: this.tokenToLocation(token),
                    references: []
                });
            }
            i++;
        }
        // Find variable references and update them
        this.findVariableReferences(tokens, symbols);
        return symbols;
    }
    /**
     * Get token at a specific position in the document
     */
    getTokenAtPosition(tokens, line, column) {
        for (const token of tokens) {
            if (token.startLine === undefined || token.startColumn === undefined ||
                token.endLine === undefined || token.endColumn === undefined) {
                continue;
            }
            // Check if position is within token bounds
            if (line >= token.startLine && line <= token.endLine) {
                if (line === token.startLine && column < token.startColumn)
                    continue;
                if (line === token.endLine && column > token.endColumn)
                    continue;
                return token;
            }
        }
        return null;
    }
    /**
     * Get the context at a specific position (for context-aware completion)
     */
    getContextAtPosition(tokens, line, column) {
        const context = {
            inForLoop: false,
            inLetStatement: false,
            inFilterStatement: false,
            inReturnStatement: false,
            inFunctionCall: false,
            inObjectLiteral: false,
            inArrayLiteral: false,
            previousKeyword: null,
            currentFunction: null,
            argumentIndex: 0,
            availableVariables: []
        };
        let parenDepth = 0;
        let braceDepth = 0;
        let bracketDepth = 0;
        let lastKeyword = null;
        let lastFunction = null;
        let argIndex = 0;
        for (const token of tokens) {
            // Stop if we've passed the cursor position
            if (token.startLine !== undefined && token.startColumn !== undefined) {
                if (token.startLine > line || (token.startLine === line && token.startColumn > column)) {
                    break;
                }
            }
            const tokenName = token.tokenType.name;
            // Track nesting
            if (tokenName === 'LParen') {
                parenDepth++;
                if (lastFunction) {
                    context.inFunctionCall = true;
                    context.currentFunction = lastFunction;
                    argIndex = 0;
                }
            }
            else if (tokenName === 'RParen') {
                parenDepth--;
                if (parenDepth === 0) {
                    context.inFunctionCall = false;
                    context.currentFunction = null;
                }
            }
            else if (tokenName === 'LBrace') {
                braceDepth++;
                context.inObjectLiteral = true;
            }
            else if (tokenName === 'RBrace') {
                braceDepth--;
                if (braceDepth === 0) {
                    context.inObjectLiteral = false;
                }
            }
            else if (tokenName === 'LBracket') {
                bracketDepth++;
                context.inArrayLiteral = true;
            }
            else if (tokenName === 'RBracket') {
                bracketDepth--;
                if (bracketDepth === 0) {
                    context.inArrayLiteral = false;
                }
            }
            else if (tokenName === 'Comma' && context.inFunctionCall) {
                argIndex++;
            }
            // Track keywords
            if (tokenName.startsWith('Kw')) {
                lastKeyword = token.image.toUpperCase();
                lastFunction = null;
                if (lastKeyword === 'FOR') {
                    context.inForLoop = true;
                }
                else if (lastKeyword === 'LET') {
                    context.inLetStatement = true;
                }
                else if (lastKeyword === 'FILTER') {
                    context.inFilterStatement = true;
                }
                else if (lastKeyword === 'RETURN') {
                    context.inReturnStatement = true;
                }
            }
            // Track function names
            if (tokenName === 'Identifier') {
                lastFunction = token.image.toUpperCase();
            }
            // Track variable declarations
            if ((lastKeyword === 'FOR' || lastKeyword === 'LET') && tokenName === 'Identifier') {
                context.availableVariables.push(token.image);
                lastKeyword = null;
            }
        }
        context.previousKeyword = lastKeyword;
        context.argumentIndex = argIndex;
        return context;
    }
    /**
     * Find all references to variables in the token stream
     */
    findVariableReferences(tokens, symbols) {
        const variableNames = new Set(symbols.variables.map(v => v.name));
        for (const token of tokens) {
            if (token.tokenType.name === 'Identifier' && variableNames.has(token.image)) {
                const variable = symbols.variables.find(v => v.name === token.image);
                if (variable) {
                    const location = this.tokenToLocation(token);
                    // Don't add the definition location as a reference
                    if (location.start.offset !== variable.location.start.offset) {
                        variable.references.push(location);
                    }
                }
            }
        }
    }
    tokenToLocation(token) {
        return {
            start: {
                line: token.startLine ?? 1,
                column: token.startColumn ?? 1,
                offset: token.startOffset ?? 0
            },
            end: {
                line: token.endLine ?? 1,
                column: (token.endColumn ?? 0) + 1,
                offset: (token.endOffset ?? 0) + 1
            }
        };
    }
    convertLexerError(error) {
        return {
            message: error.message,
            line: error.line ?? 1,
            column: error.column ?? 1,
            offset: error.offset ?? 0,
            length: error.length ?? 1
        };
    }
    convertParserError(error) {
        const token = error.token;
        return {
            message: error.message,
            line: token.startLine ?? 1,
            column: token.startColumn ?? 1,
            offset: token.startOffset ?? 0,
            length: token.image?.length ?? 1,
            token
        };
    }
}
exports.AqlAnalyzer = AqlAnalyzer;
// Singleton instance
exports.analyzer = new AqlAnalyzer();
//# sourceMappingURL=analyzer.js.map