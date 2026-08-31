import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
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
export class ArangoClient {
  private config: ArangoConfig;
  private connected: boolean = false;
  private cachedCollections: CollectionInfo[] | null = null;
  private cachedViews: ViewInfo[] | null = null;
  private cachedGraphs: GraphInfo[] | null = null;
  private cacheTime: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  constructor(config: ArangoConfig) {
    this.config = config;
  }

  /**
   * Update configuration
   */
  updateConfig(config: ArangoConfig): void {
    this.config = config;
    this.invalidateCache();
  }

  /**
   * Invalidate cached data
   */
  invalidateCache(): void {
    this.cachedCollections = null;
    this.cachedViews = null;
    this.cachedGraphs = null;
    this.cacheTime = 0;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.cacheTime < this.CACHE_TTL;
  }

  /**
   * Build authorization headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.config.jwt) {
      headers['Authorization'] = `Bearer ${this.config.jwt}`;
    } else if (this.config.username && this.config.password) {
      const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    return headers;
  }

  /**
   * Build full URL for API endpoint
   */
  private buildUrl(endpoint: string): string {
    const base = this.config.url.replace(/\/$/, '');
    return `${base}/_db/${encodeURIComponent(this.config.database)}${endpoint}`;
  }

  /**
   * Make HTTP request to ArangoDB
   */
  private request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const urlStr = this.buildUrl(endpoint);
      const url = new URL(urlStr);
      const headers = this.getHeaders();

      const isHttps = url.protocol === 'https:';
      const transport = isHttps ? https : http;

      const options: http.RequestOptions = {
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
              resolve(JSON.parse(data) as T);
            } catch {
              reject(new Error(`Invalid JSON response: ${data}`));
            }
          } else {
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
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.request<{ version: string }>('GET', '/_api/version');
      this.connected = true;
      return { success: true };
    } catch (error) {
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
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get all collections
   */
  async getCollections(): Promise<CollectionInfo[]> {
    if (this.cachedCollections && this.isCacheValid()) {
      return this.cachedCollections;
    }

    try {
      interface CollectionResponse {
        result: Array<{
          name: string;
          type: number;
          isSystem: boolean;
        }>;
      }

      const response = await this.request<CollectionResponse>('GET', '/_api/collection');

      this.cachedCollections = response.result.map(col => ({
        name: col.name,
        type: col.type === 3 ? 'edge' : 'document',
        isSystem: col.isSystem
      }));
      this.cacheTime = Date.now();

      return this.cachedCollections;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all views
   */
  async getViews(): Promise<ViewInfo[]> {
    if (this.cachedViews && this.isCacheValid()) {
      return this.cachedViews;
    }

    try {
      interface ViewResponse {
        result: Array<{
          name: string;
          type: string;
        }>;
      }

      const response = await this.request<ViewResponse>('GET', '/_api/view');

      this.cachedViews = response.result.map(view => ({
        name: view.name,
        type: view.type
      }));
      this.cacheTime = Date.now();

      return this.cachedViews;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all graphs
   */
  async getGraphs(): Promise<GraphInfo[]> {
    if (this.cachedGraphs && this.isCacheValid()) {
      return this.cachedGraphs;
    }

    try {
      interface GraphResponse {
        graphs: Array<{
          name: string;
          edgeDefinitions: Array<{
            collection: string;
            from: string[];
            to: string[];
          }>;
        }>;
      }

      const response = await this.request<GraphResponse>('GET', '/_api/gharial');

      this.cachedGraphs = response.graphs.map(graph => ({
        name: graph.name,
        edgeDefinitions: graph.edgeDefinitions
      }));
      this.cacheTime = Date.now();

      return this.cachedGraphs;
    } catch (error) {
      return [];
    }
  }

  /**
   * Validate an AQL query without executing it
   */
  async validateQuery(query: string, bindVars?: Record<string, unknown>): Promise<QueryValidation> {
    try {
      interface ParseResponse {
        error: boolean;
        code?: number;
        errorMessage?: string;
        errorNum?: number;
        bindVars?: string[];
        collections?: string[];
      }

      const response = await this.request<ParseResponse>('POST', '/_api/query', {
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
    } catch (error) {
      // If connection fails, consider query valid (offline mode)
      return { valid: true };
    }
  }

  /**
   * Parse an AQL query to get bind variables and collections (without full validation)
   */
  async parseQuery(query: string): Promise<{ bindVars: string[]; collections: string[] } | null> {
    try {
      interface ParseResponse {
        bindVars: string[];
        collections: string[];
      }

      const response = await this.request<ParseResponse>('POST', '/_api/query/parse', {
        query
      });

      return {
        bindVars: response.bindVars || [],
        collections: response.collections || []
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get collection attributes by sampling documents
   */
  async getCollectionAttributes(collectionName: string): Promise<string[]> {
    try {
      interface QueryResponse {
        result: Array<Record<string, unknown>>;
      }

      // Sample a few documents to extract attribute names
      const response = await this.request<QueryResponse>('POST', '/_api/cursor', {
        query: `FOR doc IN ${collectionName} LIMIT 10 RETURN doc`,
        batchSize: 10
      });

      const attributes = new Set<string>();

      for (const doc of response.result) {
        for (const key of Object.keys(doc)) {
          attributes.add(key);
        }
      }

      return Array.from(attributes).sort();
    } catch (error) {
      return [];
    }
  }
}

// Singleton instance
let clientInstance: ArangoClient | null = null;

/**
 * Get or create ArangoDB client instance
 */
export function getArangoClient(config: ArangoConfig): ArangoClient {
  if (!clientInstance) {
    clientInstance = new ArangoClient(config);
  } else {
    clientInstance.updateConfig(config);
  }
  return clientInstance;
}

/**
 * Clear client instance (for testing)
 */
export function clearArangoClient(): void {
  clientInstance = null;
}
