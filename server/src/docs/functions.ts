import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// Types
// =============================================================================

export interface AqlFunctionMetadata {
  name: string;
  arguments: string;
  implementations: string[];
  deterministic: boolean;
  cacheable: boolean;
  canRunOnDBServerCluster: boolean;
  canRunOnDBServerOneShard: boolean;
  canReadDocuments: boolean;
  canUseInAnalyzer: boolean;
  canRunOnDBServer: boolean;
  stub: boolean;
}

export interface FunctionSignature {
  name: string;
  parameters: ParameterInfo[];
  minArgs: number;
  maxArgs: number;
  variadic: boolean;
  category: string;
  description: string;
  returnType: string;
}

export interface ParameterInfo {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

// =============================================================================
// Function Categories
// =============================================================================

const FUNCTION_CATEGORIES: Record<string, string[]> = {
  'Type Check': [
    'IS_NULL', 'IS_BOOL', 'IS_NUMBER', 'IS_STRING', 'IS_ARRAY', 'IS_LIST',
    'IS_OBJECT', 'IS_DOCUMENT', 'IS_DATESTRING', 'IS_KEY', 'IS_IPV4'
  ],
  'Type Conversion': [
    'TO_BOOL', 'TO_NUMBER', 'TO_STRING', 'TO_ARRAY', 'TO_LIST', 'TO_BASE64',
    'TO_HEX', 'TO_CHAR'
  ],
  'String': [
    'CONCAT', 'CONCAT_SEPARATOR', 'CHAR_LENGTH', 'LOWER', 'UPPER', 'SUBSTRING',
    'SUBSTRING_BYTES', 'LEFT', 'RIGHT', 'TRIM', 'LTRIM', 'RTRIM', 'REVERSE',
    'CONTAINS', 'FIND_FIRST', 'FIND_LAST', 'LIKE', 'REGEX_TEST', 'REGEX_REPLACE',
    'REGEX_SPLIT', 'REGEX_MATCHES', 'SPLIT', 'SUBSTITUTE', 'MD5', 'SHA1',
    'SHA256', 'SHA512', 'CRC32', 'FNV64', 'HASH', 'RANDOM_TOKEN', 'UUID',
    'SOUNDEX', 'LEVENSHTEIN_DISTANCE', 'LEVENSHTEIN_MATCH', 'NGRAM_MATCH',
    'NGRAM_SIMILARITY', 'NGRAM_POSITIONAL_SIMILARITY', 'ENCODE_URI_COMPONENT',
    'REPEAT', 'TRANSLATE'
  ],
  'Numeric': [
    'ABS', 'ACOS', 'ASIN', 'ATAN', 'ATAN2', 'CEIL', 'COS', 'DEGREES', 'EXP',
    'EXP2', 'FLOOR', 'LOG', 'LOG2', 'LOG10', 'PI', 'POW', 'RADIANS', 'RAND',
    'RANDOM', 'ROUND', 'SIN', 'SQRT', 'TAN'
  ],
  'Date': [
    'DATE_NOW', 'DATE_ISO8601', 'DATE_TIMESTAMP', 'DATE_YEAR', 'DATE_MONTH',
    'DATE_DAY', 'DATE_HOUR', 'DATE_MINUTE', 'DATE_SECOND', 'DATE_MILLISECOND',
    'DATE_DAYOFYEAR', 'DATE_ISOWEEK', 'DATE_ISOWEEKYEAR', 'DATE_LEAPYEAR',
    'DATE_QUARTER', 'DATE_DAYS_IN_MONTH', 'DATE_FORMAT', 'DATE_ADD',
    'DATE_SUBTRACT', 'DATE_DIFF', 'DATE_COMPARE', 'DATE_ROUND', 'DATE_TRUNC',
    'DATE_TIMEZONE', 'DATE_TIMEZONES', 'DATE_UTCTOLOCAL', 'DATE_LOCALTOUTC',
    'DATE_DAYOFWEEK'
  ],
  'Array': [
    'APPEND', 'COUNT', 'COUNT_DISTINCT', 'COUNT_UNIQUE', 'FIRST', 'FLATTEN',
    'INTERLEAVE', 'INTERSECTION', 'LAST', 'LENGTH', 'MINUS', 'NTH', 'OUTERSECTION',
    'POP', 'POSITION', 'PUSH', 'REMOVE_NTH', 'REMOVE_VALUE', 'REMOVE_VALUES',
    'REPLACE_NTH', 'REVERSE', 'SHIFT', 'SLICE', 'SORTED', 'SORTED_UNIQUE',
    'UNION', 'UNION_DISTINCT', 'UNIQUE', 'UNSHIFT', 'CONTAINS_ARRAY', 'JACCARD',
    'RANGE'
  ],
  'Object': [
    'ATTRIBUTES', 'HAS', 'KEEP', 'KEEP_RECURSIVE', 'KEYS', 'MATCHES', 'MERGE',
    'MERGE_RECURSIVE', 'PARSE_IDENTIFIER', 'UNSET', 'UNSET_RECURSIVE', 'VALUES',
    'ZIP', 'ENTRIES'
  ],
  'Geo': [
    'DISTANCE', 'GEO_AREA', 'GEO_CONTAINS', 'GEO_DISTANCE', 'GEO_EQUALS',
    'GEO_IN_RANGE', 'GEO_INTERSECTS', 'GEO_LINESTRING', 'GEO_MULTILINESTRING',
    'GEO_MULTIPOINT', 'GEO_MULTIPOLYGON', 'GEO_POINT', 'GEO_POLYGON',
    'IS_IN_POLYGON', 'NEAR', 'WITHIN', 'WITHIN_RECTANGLE'
  ],
  'Fulltext': [
    'FULLTEXT', 'PHRASE', 'TOKENS', 'ANALYZER', 'BOOST', 'BM25', 'TFIDF',
    'MIN_MATCH', 'STARTS_WITH', 'EXISTS', 'IN_RANGE', 'LEVENSHTEIN_MATCH',
    'NGRAM_MATCH', 'NGRAM_SIMILARITY', 'NGRAM_POSITIONAL_SIMILARITY',
    'DECAY_EXP', 'DECAY_LINEAR', 'DECAY_GAUSS'
  ],
  'ArangoSearch': [
    'BOOSTSCORE', 'OFFSET_INFO', 'MINHASH', 'MINHASH_COUNT', 'MINHASH_ERROR',
    'MINHASH_MATCH', 'L1_DISTANCE', 'L2_DISTANCE', 'COSINE_SIMILARITY'
  ],
  'Aggregate': [
    'AVG', 'AVERAGE', 'COUNT', 'MAX', 'MEDIAN', 'MIN', 'PERCENTILE', 'PRODUCT',
    'STDDEV', 'STDDEV_POPULATION', 'STDDEV_SAMPLE', 'SUM', 'VARIANCE',
    'VARIANCE_POPULATION', 'VARIANCE_SAMPLE'
  ],
  'Bit': [
    'BIT_AND', 'BIT_CONSTRUCT', 'BIT_DECONSTRUCT', 'BIT_FROM_STRING', 'BIT_NEGATE',
    'BIT_OR', 'BIT_POPCOUNT', 'BIT_SHIFT_LEFT', 'BIT_SHIFT_RIGHT', 'BIT_TEST',
    'BIT_TO_STRING', 'BIT_XOR'
  ],
  'Document': [
    'DOCUMENT', 'COLLECTION_COUNT', 'COLLECTIONS', 'CURRENT_DATABASE',
    'CURRENT_USER', 'CHECK_DOCUMENT', 'SHARD_ID', 'PARSE_KEY', 'PARSE_COLLECTION',
    'IS_SAME_COLLECTION'
  ],
  'Misc': [
    'ASSERT', 'CALL', 'APPLY', 'DECODE_REV', 'FAIL', 'FIRST_DOCUMENT',
    'FIRST_LIST', 'JSON_PARSE', 'JSON_STRINGIFY', 'NOT_NULL', 'NOOPT', 'NOEVAL',
    'PASSTHRU', 'SCHEMA_GET', 'SCHEMA_VALIDATE', 'SLEEP', 'TYPENAME', 'V8',
    'VERSION', 'WARN', 'VALUE', 'IPV4_FROM_NUMBER', 'IPV4_TO_NUMBER'
  ]
};

// =============================================================================
// Function Descriptions (manually curated for common functions)
// =============================================================================

const FUNCTION_DESCRIPTIONS: Record<string, string> = {
  // Type Check
  'IS_NULL': 'Check if value is null',
  'IS_BOOL': 'Check if value is a boolean',
  'IS_NUMBER': 'Check if value is a number',
  'IS_STRING': 'Check if value is a string',
  'IS_ARRAY': 'Check if value is an array',
  'IS_OBJECT': 'Check if value is an object',
  'IS_DOCUMENT': 'Check if value is a document (object with _key and _id)',
  'IS_DATESTRING': 'Check if value is a valid date string',

  // Type Conversion
  'TO_BOOL': 'Convert value to boolean',
  'TO_NUMBER': 'Convert value to number',
  'TO_STRING': 'Convert value to string',
  'TO_ARRAY': 'Convert value to array',
  'TO_LIST': 'Alias for TO_ARRAY',
  'TO_BASE64': 'Encode string to base64',
  'TO_HEX': 'Encode string to hexadecimal',

  // String
  'CONCAT': 'Concatenate strings',
  'CONCAT_SEPARATOR': 'Concatenate strings with separator',
  'LENGTH': 'Get length of string or array',
  'LOWER': 'Convert string to lowercase',
  'UPPER': 'Convert string to uppercase',
  'SUBSTRING': 'Extract substring',
  'LEFT': 'Get leftmost characters',
  'RIGHT': 'Get rightmost characters',
  'TRIM': 'Remove whitespace from both ends',
  'LTRIM': 'Remove whitespace from left',
  'RTRIM': 'Remove whitespace from right',
  'CONTAINS': 'Check if string contains substring',
  'LIKE': 'SQL LIKE pattern matching',
  'REGEX_TEST': 'Test string against regex pattern',
  'REGEX_REPLACE': 'Replace matches of regex pattern',
  'SPLIT': 'Split string into array',
  'MD5': 'Calculate MD5 hash',
  'SHA1': 'Calculate SHA1 hash',
  'SHA256': 'Calculate SHA256 hash',
  'UUID': 'Generate UUID v4',

  // Numeric
  'ABS': 'Absolute value',
  'CEIL': 'Round up to nearest integer',
  'FLOOR': 'Round down to nearest integer',
  'ROUND': 'Round to nearest integer',
  'SQRT': 'Square root',
  'POW': 'Power/exponentiation',
  'LOG': 'Natural logarithm',
  'LOG10': 'Base 10 logarithm',
  'RAND': 'Random number between 0 and 1',
  'RANDOM': 'Alias for RAND',
  'PI': 'Return Pi constant',
  'SIN': 'Sine',
  'COS': 'Cosine',
  'TAN': 'Tangent',

  // Date
  'DATE_NOW': 'Current Unix timestamp in milliseconds',
  'DATE_ISO8601': 'Convert to ISO 8601 date string',
  'DATE_TIMESTAMP': 'Convert date to Unix timestamp',
  'DATE_YEAR': 'Extract year from date',
  'DATE_MONTH': 'Extract month from date (1-12)',
  'DATE_DAY': 'Extract day from date (1-31)',
  'DATE_HOUR': 'Extract hour from date (0-23)',
  'DATE_MINUTE': 'Extract minute from date (0-59)',
  'DATE_SECOND': 'Extract second from date (0-59)',
  'DATE_ADD': 'Add time to date',
  'DATE_SUBTRACT': 'Subtract time from date',
  'DATE_DIFF': 'Difference between dates',
  'DATE_FORMAT': 'Format date string',

  // Array
  'APPEND': 'Append element to array',
  'COUNT': 'Count elements in array',
  'FIRST': 'Get first element',
  'LAST': 'Get last element',
  'FLATTEN': 'Flatten nested arrays',
  'INTERSECTION': 'Intersection of arrays',
  'MINUS': 'Elements in first array not in second',
  'NTH': 'Get nth element',
  'PUSH': 'Push element to array',
  'POP': 'Remove last element',
  'REVERSE': 'Reverse array',
  'SLICE': 'Extract subarray',
  'SORTED': 'Sort array',
  'UNIQUE': 'Remove duplicate values',
  'UNION': 'Union of arrays',
  'RANGE': 'Generate array of numbers',

  // Object
  'ATTRIBUTES': 'Get attribute names of object',
  'HAS': 'Check if object has attribute',
  'KEYS': 'Get keys of object (alias for ATTRIBUTES)',
  'VALUES': 'Get values of object',
  'MERGE': 'Merge objects',
  'UNSET': 'Remove attributes from object',
  'ZIP': 'Create object from keys and values arrays',

  // Geo
  'DISTANCE': 'Distance between two coordinates',
  'GEO_DISTANCE': 'Geographical distance',
  'GEO_CONTAINS': 'Check if geometry contains point',
  'GEO_INTERSECTS': 'Check if geometries intersect',
  'GEO_POINT': 'Create GeoJSON point',
  'GEO_POLYGON': 'Create GeoJSON polygon',
  'NEAR': 'Find documents near a coordinate',
  'WITHIN': 'Find documents within radius',

  // Aggregate
  'AVG': 'Calculate average',
  'SUM': 'Calculate sum',
  'MIN': 'Find minimum value',
  'MAX': 'Find maximum value',
  'MEDIAN': 'Calculate median',
  'STDDEV': 'Standard deviation',
  'VARIANCE': 'Calculate variance',

  // Document
  'DOCUMENT': 'Retrieve document by key',
  'COLLECTION_COUNT': 'Get document count of collection',
  'COLLECTIONS': 'List available collections',
  'CURRENT_DATABASE': 'Get current database name',
  'CURRENT_USER': 'Get current user name',

  // Misc
  'ASSERT': 'Assert condition is true, fail otherwise',
  'FAIL': 'Trigger an error',
  'JSON_PARSE': 'Parse JSON string',
  'JSON_STRINGIFY': 'Convert to JSON string',
  'NOT_NULL': 'Return first non-null value',
  'SLEEP': 'Pause execution for specified seconds',
  'VERSION': 'Get ArangoDB version'
};

// =============================================================================
// Argument Pattern Parser
// =============================================================================

/**
 * Parse the argument pattern from ArangoDB's function metadata
 * Pattern format:
 *   . = one required argument
 *   | = separates required from optional
 *   + = one or more (variadic)
 *   , = argument separator
 *
 * Examples:
 *   "."       -> 1 required arg
 *   ".,."     -> 2 required args
 *   ".|."     -> 1 required, 1 optional
 *   ".|+"     -> 1 or more args
 *   ".,.|+"   -> 2 required, then variadic
 */
function parseArgumentPattern(pattern: string): { minArgs: number; maxArgs: number; variadic: boolean } {
  if (!pattern || pattern === '') {
    return { minArgs: 0, maxArgs: 0, variadic: false };
  }

  const parts = pattern.split('|');
  const requiredPart = parts[0] || '';
  const optionalPart = parts[1] || '';

  // Count required arguments (dots separated by commas)
  const requiredArgs = requiredPart ? requiredPart.split(',').filter(p => p.trim() === '.').length : 0;

  // Check for variadic (+)
  const variadic = optionalPart.includes('+');

  // Count optional arguments
  let optionalArgs = 0;
  if (optionalPart && !variadic) {
    optionalArgs = optionalPart.split(',').filter(p => p.trim() === '.').length;
  }

  return {
    minArgs: requiredArgs,
    maxArgs: variadic ? Infinity : requiredArgs + optionalArgs,
    variadic
  };
}

/**
 * Generate parameter names based on function name and count
 */
function generateParameterNames(funcName: string, count: number, variadic: boolean): string[] {
  const params: string[] = [];

  // Special parameter names for known functions
  const specialParams: Record<string, string[]> = {
    'SUBSTRING': ['value', 'offset', 'length'],
    'CONCAT': ['value1', 'value2', '...values'],
    'CONCAT_SEPARATOR': ['separator', 'value1', 'value2', '...values'],
    'CONTAINS': ['text', 'search', 'returnIndex'],
    'DATE_ADD': ['date', 'amount', 'unit'],
    'DATE_SUBTRACT': ['date', 'amount', 'unit'],
    'DATE_DIFF': ['date1', 'date2', 'unit', 'asFloat'],
    'DATE_FORMAT': ['date', 'format'],
    'SLICE': ['array', 'start', 'length'],
    'RANGE': ['start', 'end', 'step'],
    'DOCUMENT': ['collection', 'key'],
    'MERGE': ['object1', 'object2', '...objects'],
    'DISTANCE': ['lat1', 'lon1', 'lat2', 'lon2'],
    'GEO_DISTANCE': ['geoJson1', 'geoJson2'],
    'GEO_POINT': ['longitude', 'latitude'],
    'REGEX_TEST': ['text', 'regex', 'caseInsensitive'],
    'REGEX_REPLACE': ['text', 'regex', 'replacement', 'caseInsensitive'],
    'SPLIT': ['value', 'separator', 'limit'],
    'LEFT': ['value', 'length'],
    'RIGHT': ['value', 'length'],
    'ROUND': ['value', 'precision'],
    'POW': ['base', 'exponent'],
    'LOG': ['value', 'base'],
    'ATAN2': ['y', 'x']
  };

  if (specialParams[funcName]) {
    return specialParams[funcName].slice(0, variadic ? undefined : count);
  }

  // Generic parameter names
  if (count === 0) return [];
  if (count === 1) return ['value'];
  if (count === 2) return ['value1', 'value2'];

  for (let i = 1; i <= count; i++) {
    params.push(`arg${i}`);
  }

  if (variadic) {
    params.push('...args');
  }

  return params;
}

// =============================================================================
// Function Documentation Provider
// =============================================================================

export class FunctionDocumentation {
  private functions: Map<string, FunctionSignature> = new Map();

  constructor() {
    this.loadFunctions();
  }

  private loadFunctions(): void {
    try {
      // Load from the data directory
      const dataPath = path.join(__dirname, '../../../data/aql-functions.json');
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      const functions: AqlFunctionMetadata[] = data.functions;

      for (const func of functions) {
        const { minArgs, maxArgs, variadic } = parseArgumentPattern(func.arguments);
        const paramCount = variadic ? minArgs + 1 : Math.max(minArgs, Math.min(maxArgs, 3));
        const paramNames = generateParameterNames(func.name, paramCount, variadic);

        const parameters: ParameterInfo[] = paramNames.map((name, index) => ({
          name,
          type: 'any',
          required: index < minArgs,
          description: ''
        }));

        // Determine category
        let category = 'Misc';
        for (const [cat, funcs] of Object.entries(FUNCTION_CATEGORIES)) {
          if (funcs.includes(func.name)) {
            category = cat;
            break;
          }
        }

        const signature: FunctionSignature = {
          name: func.name,
          parameters,
          minArgs,
          maxArgs,
          variadic,
          category,
          description: FUNCTION_DESCRIPTIONS[func.name] || `AQL ${category} function`,
          returnType: 'any'
        };

        this.functions.set(func.name.toUpperCase(), signature);
      }
    } catch (error) {
      console.error('Failed to load function documentation:', error);
    }
  }

  /**
   * Get function signature by name
   */
  getFunction(name: string): FunctionSignature | undefined {
    return this.functions.get(name.toUpperCase());
  }

  /**
   * Get all function names
   */
  getAllFunctionNames(): string[] {
    return Array.from(this.functions.keys());
  }

  /**
   * Get all functions
   */
  getAllFunctions(): FunctionSignature[] {
    return Array.from(this.functions.values());
  }

  /**
   * Get functions by category
   */
  getFunctionsByCategory(category: string): FunctionSignature[] {
    return Array.from(this.functions.values()).filter(f => f.category === category);
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Object.keys(FUNCTION_CATEGORIES);
  }

  /**
   * Generate signature string for display
   */
  getSignatureString(name: string): string {
    const func = this.getFunction(name);
    if (!func) return '';

    const params = func.parameters.map(p => {
      if (p.name.startsWith('...')) {
        return p.name;
      }
      return p.required ? p.name : `[${p.name}]`;
    }).join(', ');

    return `${func.name}(${params})`;
  }

  /**
   * Generate markdown documentation for a function
   */
  getMarkdownDoc(name: string): string {
    const func = this.getFunction(name);
    if (!func) return '';

    let doc = `**${func.name}**\n\n`;
    doc += `${func.description}\n\n`;
    doc += `**Category:** ${func.category}\n\n`;
    doc += `**Syntax:** \`${this.getSignatureString(name)}\`\n\n`;

    if (func.parameters.length > 0) {
      doc += `**Parameters:**\n`;
      for (const param of func.parameters) {
        const required = param.required ? '(required)' : '(optional)';
        doc += `- \`${param.name}\` ${required}\n`;
      }
    }

    return doc;
  }
}

// Singleton instance
export const functionDocs = new FunctionDocumentation();
