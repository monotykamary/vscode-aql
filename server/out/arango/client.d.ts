import { ArangoConfig } from './config';
/**
 * Collection metadata from ArangoDB
 */
export interface CollectionInfo {
    name: string;
    type: 'document' | 'edge';
    isSystem: boolean;
}
/**
 * View metadata from ArangoDB
 */
export interface ViewInfo {
    name: string;
    type: string;
}
/**
 * Graph metadata from ArangoDB
 */
export interface GraphInfo {
    name: string;
    edgeDefinitions: {
        collection: string;
        from: string[];
        to: string[];
    }[];
}
/**
 * Query validation result
 */
export interface QueryValidation {
    valid: boolean;
    error?: string;
    errorLine?: number;
    errorColumn?: number;
    bindVars?: string[];
    collections?: string[];
}
/**
 * ArangoDB HTTP client for fetching metadata and validating queries
 */
export declare class ArangoClient {
    private config;
    private connected;
    private cachedCollections;
    private cachedViews;
    private cachedGraphs;
    private cacheTime;
    private readonly CACHE_TTL;
    constructor(config: ArangoConfig);
    /**
     * Update configuration
     */
    updateConfig(config: ArangoConfig): void;
    /**
     * Invalidate cached data
     */
    invalidateCache(): void;
    /**
     * Check if cache is still valid
     */
    private isCacheValid;
    /**
     * Build authorization headers
     */
    private getHeaders;
    /**
     * Build full URL for API endpoint
     */
    private buildUrl;
    /**
     * Make HTTP request to ArangoDB
     */
    private request;
    /**
     * Test connection to ArangoDB
     */
    testConnection(): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Check if client is connected
     */
    isConnected(): boolean;
    /**
     * Get all collections
     */
    getCollections(): Promise<CollectionInfo[]>;
    /**
     * Get all views
     */
    getViews(): Promise<ViewInfo[]>;
    /**
     * Get all graphs
     */
    getGraphs(): Promise<GraphInfo[]>;
    /**
     * Validate an AQL query without executing it
     */
    validateQuery(query: string, bindVars?: Record<string, unknown>): Promise<QueryValidation>;
    /**
     * Parse an AQL query to get bind variables and collections (without full validation)
     */
    parseQuery(query: string): Promise<{
        bindVars: string[];
        collections: string[];
    } | null>;
    /**
     * Get collection attributes by sampling documents
     */
    getCollectionAttributes(collectionName: string): Promise<string[]>;
}
/**
 * Get or create ArangoDB client instance
 */
export declare function getArangoClient(config: ArangoConfig): ArangoClient;
/**
 * Clear client instance (for testing)
 */
export declare function clearArangoClient(): void;
