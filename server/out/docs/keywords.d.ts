/**
 * AQL Keyword Documentation
 */
export interface KeywordInfo {
    name: string;
    description: string;
    syntax: string;
    example: string;
    category: 'query' | 'modifier' | 'operator' | 'data' | 'graph';
}
export declare const KEYWORDS: Record<string, KeywordInfo>;
/**
 * Get keyword information by name
 */
export declare function getKeywordInfo(name: string): KeywordInfo | undefined;
/**
 * Get all keyword names
 */
export declare function getAllKeywordNames(): string[];
/**
 * Get all keywords
 */
export declare function getAllKeywords(): KeywordInfo[];
/**
 * Get keywords by category
 */
export declare function getKeywordsByCategory(category: KeywordInfo['category']): KeywordInfo[];
/**
 * Generate markdown documentation for a keyword
 */
export declare function getKeywordMarkdown(name: string): string;
