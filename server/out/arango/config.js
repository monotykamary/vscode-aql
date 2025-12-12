"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
exports.hasCredentials = hasCredentials;
const fs = require("fs");
const path = require("path");
/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
    url: 'http://localhost:8529',
    database: '_system'
};
/**
 * Reads .arangodb.json from the workspace root
 */
function readConfigFile(workspaceRoot) {
    if (!workspaceRoot)
        return null;
    const configPath = path.join(workspaceRoot, '.arangodb.json');
    try {
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf-8');
            return JSON.parse(content);
        }
    }
    catch (error) {
        // Silently ignore malformed config files
    }
    return null;
}
/**
 * Merge configurations with priority: Extension Settings > .arangodb.json > Defaults
 */
function getConfig(workspaceRoot, extensionSettings = {}) {
    const fileConfig = readConfigFile(workspaceRoot);
    return {
        url: extensionSettings.url || fileConfig?.url || DEFAULT_CONFIG.url,
        database: extensionSettings.database || fileConfig?.database || DEFAULT_CONFIG.database,
        username: extensionSettings.username || fileConfig?.username,
        password: extensionSettings.password || fileConfig?.password,
        jwt: fileConfig?.jwt
    };
}
/**
 * Check if a configuration has credentials
 */
function hasCredentials(config) {
    return !!(config.jwt || (config.username && config.password));
}
//# sourceMappingURL=config.js.map