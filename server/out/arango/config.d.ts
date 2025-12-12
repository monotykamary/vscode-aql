/**
 * ArangoDB connection configuration
 */
export interface ArangoConfig {
    url: string;
    database: string;
    username?: string;
    password?: string;
    jwt?: string;
}
/**
 * Extension settings passed from VS Code
 */
export interface ExtensionSettings {
    url?: string;
    database?: string;
    username?: string;
    password?: string;
}
/**
 * Merge configurations with priority: Extension Settings > .arangodb.json > Defaults
 */
export declare function getConfig(workspaceRoot: string | null, extensionSettings?: ExtensionSettings): ArangoConfig;
/**
 * Check if a configuration has credentials
 */
export declare function hasCredentials(config: ArangoConfig): boolean;
