import * as fs from 'fs';
import * as path from 'path';

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
 * Configuration file schema (.arangodb.json)
 */
interface ConfigFile {
  url?: string;
  database?: string;
  username?: string;
  password?: string;
  jwt?: string;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: ArangoConfig = {
  url: 'http://localhost:8529',
  database: '_system'
};

/**
 * Reads .arangodb.json from the workspace root
 */
function readConfigFile(workspaceRoot: string | null): ConfigFile | null {
  if (!workspaceRoot) return null;

  const configPath = path.join(workspaceRoot, '.arangodb.json');

  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content) as ConfigFile;
    }
  } catch (error) {
    // Silently ignore malformed config files
  }

  return null;
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
export function getConfig(
  workspaceRoot: string | null,
  extensionSettings: ExtensionSettings = {}
): ArangoConfig {
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
export function hasCredentials(config: ArangoConfig): boolean {
  return !!(config.jwt || (config.username && config.password));
}
