import { IToken } from 'chevrotain';
import { ParseResult, DocumentSymbols } from './types';
/**
 * Analyzes AQL source code and extracts parse results and symbol information
 */
export declare class AqlAnalyzer {
    /**
     * Parse AQL source code and return parse result with errors
     */
    parse(source: string): ParseResult;
    /**
     * Extract symbols from parsed tokens for document outline and navigation
     */
    extractSymbols(tokens: IToken[]): DocumentSymbols;
    /**
     * Get token at a specific position in the document
     */
    getTokenAtPosition(tokens: IToken[], line: number, column: number): IToken | null;
    /**
     * Get the context at a specific position (for context-aware completion)
     */
    getContextAtPosition(tokens: IToken[], line: number, column: number): CompletionContext;
    /**
     * Find all references to variables in the token stream
     */
    private findVariableReferences;
    private tokenToLocation;
    private convertLexerError;
    private convertParserError;
}
/**
 * Context information for intelligent completion
 */
export interface CompletionContext {
    inForLoop: boolean;
    inLetStatement: boolean;
    inFilterStatement: boolean;
    inReturnStatement: boolean;
    inFunctionCall: boolean;
    inObjectLiteral: boolean;
    inArrayLiteral: boolean;
    previousKeyword: string | null;
    currentFunction: string | null;
    argumentIndex: number;
    availableVariables: string[];
}
export declare const analyzer: AqlAnalyzer;
