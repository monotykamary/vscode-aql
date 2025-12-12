"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArangoClient = void 0;
exports.getArangoClient = getArangoClient;
exports.clearArangoClient = clearArangoClient;
const http = require("http");
const https = require("https");
const url_1 = require("url");
/**
 * ArangoDB HTTP client for fetching metadata and validating queries
 */
class ArangoClient {
    constructor(config) {
        this.connected = false;
        this.cachedCollections = null;
        this.cachedViews = null;
        this.cachedGraphs = null;
        this.cacheTime = 0;
        this.CACHE_TTL = 60000; // 1 minute cache
        this.config = config;
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = config;
        this.invalidateCache();
    }
    /**
     * Invalidate cached data
     */
    invalidateCache() {
        this.cachedCollections = null;
        this.cachedViews = null;
        this.cachedGraphs = null;
        this.cacheTime = 0;
    }
    /**
     * Check if cache is still valid
     */
    isCacheValid() {
        return Date.now() - this.cacheTime < this.CACHE_TTL;
    }
    /**
     * Build authorization headers
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.config.jwt) {
            headers['Authorization'] = `Bearer ${this.config.jwt}`;
        }
        else if (this.config.username && this.config.password) {
            const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
            headers['Authorization'] = `Basic ${auth}`;
        }
        return headers;
    }
    /**
     * Build full URL for API endpoint
     */
    buildUrl(endpoint) {
        const base = this.config.url.replace(/\/$/, '');
        return `${base}/_db/${encodeURIComponent(this.config.database)}${endpoint}`;
    }
    /**
     * Make HTTP request to ArangoDB
     */
    request(method, endpoint, body) {
        return new Promise((resolve, reject) => {
            const urlStr = this.buildUrl(endpoint);
            const url = new url_1.URL(urlStr);
            const headers = this.getHeaders();
            const isHttps = url.protocol === 'https:';
            const transport = isHttps ? https : http;
            const options = {
                method,
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                headers
            };
            const req = transport.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        }
                        catch {
                            reject(new Error(`Invalid JSON response: ${data}`));
                        }
                    }
                    else {
                        reject(new Error(`ArangoDB request failed: ${res.statusCode} ${data}`));
                    }
                });
            });
            req.on('error', (error) => {
                reject(error);
            });
            // Set timeout
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            if (body) {
                req.write(JSON.stringify(body));
            }
            req.end();
        });
    }
    /**
     * Test connection to ArangoDB
     */
    async testConnection() {
        try {
            await this.request('GET', '/_api/version');
            this.connected = true;
            return { success: true };
        }
        catch (error) {
            this.connected = false;
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Check if client is connected
     */
    isConnected() {
        return this.connected;
    }
    /**
     * Get all collections
     */
    async getCollections() {
        if (this.cachedCollections && this.isCacheValid()) {
            return this.cachedCollections;
        }
        try {
            const response = await this.request('GET', '/_api/collection');
            this.cachedCollections = response.result.map(col => ({
                name: col.name,
                type: col.type === 3 ? 'edge' : 'document',
                isSystem: col.isSystem
            }));
            this.cacheTime = Date.now();
            return this.cachedCollections;
        }
        catch (error) {
            return [];
        }
    }
    /**
     * Get all views
     */
    async getViews() {
        if (this.cachedViews && this.isCacheValid()) {
            return this.cachedViews;
        }
        try {
            const response = await this.request('GET', '/_api/view');
            this.cachedViews = response.result.map(view => ({
                name: view.name,
                type: view.type
            }));
            this.cacheTime = Date.now();
            return this.cachedViews;
        }
        catch (error) {
            return [];
        }
    }
    /**
     * Get all graphs
     */
    async getGraphs() {
        if (this.cachedGraphs && this.isCacheValid()) {
            return this.cachedGraphs;
        }
        try {
            const response = await this.request('GET', '/_api/gharial');
            this.cachedGraphs = response.graphs.map(graph => ({
                name: graph.name,
                edgeDefinitions: graph.edgeDefinitions
            }));
            this.cacheTime = Date.now();
            return this.cachedGraphs;
        }
        catch (error) {
            return [];
        }
    }
    /**
     * Validate an AQL query without executing it
     */
    async validateQuery(query, bindVars) {
        try {
            const response = await this.request('POST', '/_api/query', {
                query,
                bindVars: bindVars || {}
            });
            if (response.error) {
                // Parse error message for line/column info
                // ArangoDB errors often contain "at position X:Y"
                const posMatch = response.errorMessage?.match(/at position (\d+):(\d+)/);
                return {
                    valid: false,
                    error: response.errorMessage,
                    errorLine: posMatch ? parseInt(posMatch[1], 10) : undefined,
                    errorColumn: posMatch ? parseInt(posMatch[2], 10) : undefined
                };
            }
            return {
                valid: true,
                bindVars: response.bindVars,
                collections: response.collections
            };
        }
        catch (error) {
            // If connection fails, consider query valid (offline mode)
            return { valid: true };
        }
    }
    /**
     * Parse an AQL query to get bind variables and collections (without full validation)
     */
    async parseQuery(query) {
        try {
            const response = await this.request('POST', '/_api/query/parse', {
                query
            });
            return {
                bindVars: response.bindVars || [],
                collections: response.collections || []
            };
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Get collection attributes by sampling documents
     */
    async getCollectionAttributes(collectionName) {
        try {
            // Sample a few documents to extract attribute names
            const response = await this.request('POST', '/_api/cursor', {
                query: `FOR doc IN ${collectionName} LIMIT 10 RETURN doc`,
                batchSize: 10
            });
            const attributes = new Set();
            for (const doc of response.result) {
                for (const key of Object.keys(doc)) {
                    attributes.add(key);
                }
            }
            return Array.from(attributes).sort();
        }
        catch (error) {
            return [];
        }
    }
}
exports.ArangoClient = ArangoClient;
// Singleton instance
let clientInstance = null;
/**
 * Get or create ArangoDB client instance
 */
function getArangoClient(config) {
    if (!clientInstance) {
        clientInstance = new ArangoClient(config);
    }
    else {
        clientInstance.updateConfig(config);
    }
    return clientInstance;
}
/**
 * Clear client instance (for testing)
 */
function clearArangoClient() {
    clientInstance = null;
}
//# sourceMappingURL=client.js.map