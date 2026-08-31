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

export const KEYWORDS: Record<string, KeywordInfo> = {
  // Query Structure
  FOR: {
    name: 'FOR',
    description: 'Iterate over a collection or array. Can also traverse graphs.',
    syntax: 'FOR variable IN expression',
    example: 'FOR doc IN collection\n  RETURN doc',
    category: 'query'
  },
  RETURN: {
    name: 'RETURN',
    description: 'Return results from a query. Every query must end with RETURN or a data modification.',
    syntax: 'RETURN expression',
    example: 'FOR doc IN collection\n  RETURN doc.name',
    category: 'query'
  },
  FILTER: {
    name: 'FILTER',
    description: 'Filter documents based on a condition.',
    syntax: 'FILTER condition',
    example: 'FOR doc IN collection\n  FILTER doc.age > 18\n  RETURN doc',
    category: 'query'
  },
  SEARCH: {
    name: 'SEARCH',
    description: 'Search in ArangoSearch views with full-text and other search capabilities.',
    syntax: 'FOR doc IN viewName SEARCH condition',
    example: 'FOR doc IN myView\n  SEARCH ANALYZER(doc.text == "hello", "text_en")\n  RETURN doc',
    category: 'query'
  },
  SORT: {
    name: 'SORT',
    description: 'Sort results by one or more expressions.',
    syntax: 'SORT expression [ASC|DESC], ...',
    example: 'FOR doc IN collection\n  SORT doc.name ASC, doc.age DESC\n  RETURN doc',
    category: 'query'
  },
  LIMIT: {
    name: 'LIMIT',
    description: 'Limit the number of results. Can also skip results.',
    syntax: 'LIMIT count\nLIMIT offset, count',
    example: 'FOR doc IN collection\n  LIMIT 10\n  RETURN doc',
    category: 'query'
  },
  LET: {
    name: 'LET',
    description: 'Assign a value to a variable.',
    syntax: 'LET variable = expression',
    example: 'LET x = 1 + 2\nRETURN x',
    category: 'query'
  },
  COLLECT: {
    name: 'COLLECT',
    description: 'Group results by one or more criteria. Similar to SQL GROUP BY.',
    syntax: 'COLLECT variable = expression [INTO groups] [AGGREGATE ...]',
    example: 'FOR doc IN collection\n  COLLECT city = doc.city INTO groups\n  RETURN { city, count: LENGTH(groups) }',
    category: 'query'
  },

  // Sort Modifiers
  ASC: {
    name: 'ASC',
    description: 'Sort in ascending order (default).',
    syntax: 'SORT expression ASC',
    example: 'SORT doc.name ASC',
    category: 'modifier'
  },
  DESC: {
    name: 'DESC',
    description: 'Sort in descending order.',
    syntax: 'SORT expression DESC',
    example: 'SORT doc.age DESC',
    category: 'modifier'
  },

  // Operators
  IN: {
    name: 'IN',
    description: 'Check membership in array/collection, or iterate in FOR.',
    syntax: 'value IN array\nFOR item IN collection',
    example: 'FILTER doc.status IN ["active", "pending"]',
    category: 'operator'
  },
  INTO: {
    name: 'INTO',
    description: 'Collect grouped documents into a variable.',
    syntax: 'COLLECT ... INTO groups',
    example: 'COLLECT city = doc.city INTO groups',
    category: 'modifier'
  },
  WITH: {
    name: 'WITH',
    description: 'Declare collections used in query (for cluster), or provide update data.',
    syntax: 'WITH collection1, collection2\nUPDATE doc WITH { ... } IN collection',
    example: 'WITH users, orders\nFOR u IN users ...',
    category: 'modifier'
  },
  AND: {
    name: 'AND',
    description: 'Logical AND operator. Both conditions must be true.',
    syntax: 'condition1 AND condition2',
    example: 'FILTER doc.age > 18 AND doc.active == true',
    category: 'operator'
  },
  OR: {
    name: 'OR',
    description: 'Logical OR operator. At least one condition must be true.',
    syntax: 'condition1 OR condition2',
    example: 'FILTER doc.status == "active" OR doc.admin == true',
    category: 'operator'
  },
  NOT: {
    name: 'NOT',
    description: 'Logical NOT operator. Negates a condition.',
    syntax: 'NOT condition',
    example: 'FILTER NOT doc.deleted',
    category: 'operator'
  },
  LIKE: {
    name: 'LIKE',
    description: 'SQL-style pattern matching with % and _ wildcards.',
    syntax: 'string LIKE pattern',
    example: 'FILTER doc.name LIKE "John%"',
    category: 'operator'
  },
  DISTINCT: {
    name: 'DISTINCT',
    description: 'Return unique values only.',
    syntax: 'RETURN DISTINCT expression',
    example: 'FOR doc IN collection\n  RETURN DISTINCT doc.category',
    category: 'modifier'
  },

  // Data Modification
  INSERT: {
    name: 'INSERT',
    description: 'Insert a new document into a collection.',
    syntax: 'INSERT document INTO collection [OPTIONS { ... }]',
    example: 'INSERT { name: "John", age: 30 } INTO users',
    category: 'data'
  },
  UPDATE: {
    name: 'UPDATE',
    description: 'Update an existing document (partial update).',
    syntax: 'UPDATE keyExpression WITH document IN collection [OPTIONS { ... }]',
    example: 'UPDATE doc WITH { age: 31 } IN users',
    category: 'data'
  },
  REPLACE: {
    name: 'REPLACE',
    description: 'Replace an existing document completely.',
    syntax: 'REPLACE keyExpression WITH document IN collection [OPTIONS { ... }]',
    example: 'REPLACE doc WITH { name: "John", age: 31 } IN users',
    category: 'data'
  },
  REMOVE: {
    name: 'REMOVE',
    description: 'Remove a document from a collection.',
    syntax: 'REMOVE keyExpression IN collection [OPTIONS { ... }]',
    example: 'REMOVE doc IN users',
    category: 'data'
  },
  UPSERT: {
    name: 'UPSERT',
    description: 'Insert or update a document based on search criteria.',
    syntax: 'UPSERT searchExpression INSERT insertExpression UPDATE|REPLACE updateExpression IN collection',
    example: 'UPSERT { email: "john@example.com" }\n  INSERT { email: "john@example.com", count: 1 }\n  UPDATE { count: OLD.count + 1 }\n  IN users',
    category: 'data'
  },
  OPTIONS: {
    name: 'OPTIONS',
    description: 'Specify additional options for operations.',
    syntax: 'OPTIONS { option: value, ... }',
    example: 'INSERT doc INTO users OPTIONS { waitForSync: true }',
    category: 'modifier'
  },

  // Graph
  GRAPH: {
    name: 'GRAPH',
    description: 'Use a named graph for traversal.',
    syntax: 'FOR v, e, p IN ... OUTBOUND startVertex GRAPH graphName',
    example: 'FOR v IN 1..3 OUTBOUND "users/1" GRAPH "social"\n  RETURN v',
    category: 'graph'
  },
  OUTBOUND: {
    name: 'OUTBOUND',
    description: 'Follow edges in outbound direction.',
    syntax: 'FOR v IN ... OUTBOUND startVertex edgeCollection',
    example: 'FOR v IN 1..2 OUTBOUND "users/1" friends\n  RETURN v',
    category: 'graph'
  },
  INBOUND: {
    name: 'INBOUND',
    description: 'Follow edges in inbound direction.',
    syntax: 'FOR v IN ... INBOUND startVertex edgeCollection',
    example: 'FOR v IN 1..2 INBOUND "users/1" friends\n  RETURN v',
    category: 'graph'
  },
  ANY: {
    name: 'ANY',
    description: 'Follow edges in any direction.',
    syntax: 'FOR v IN ... ANY startVertex edgeCollection',
    example: 'FOR v IN 1..2 ANY "users/1" friends\n  RETURN v',
    category: 'graph'
  },
  SHORTEST_PATH: {
    name: 'SHORTEST_PATH',
    description: 'Find the shortest path between two vertices.',
    syntax: 'FOR v, e IN OUTBOUND SHORTEST_PATH startVertex TO targetVertex ...',
    example: 'FOR v, e IN OUTBOUND SHORTEST_PATH "users/1" TO "users/100" GRAPH "social"\n  RETURN v',
    category: 'graph'
  },
  K_SHORTEST_PATHS: {
    name: 'K_SHORTEST_PATHS',
    description: 'Find the k shortest paths between two vertices.',
    syntax: 'FOR p IN OUTBOUND K_SHORTEST_PATHS startVertex TO targetVertex ...',
    example: 'FOR p IN OUTBOUND K_SHORTEST_PATHS "users/1" TO "users/100" GRAPH "social"\n  LIMIT 5\n  RETURN p',
    category: 'graph'
  },
  K_PATHS: {
    name: 'K_PATHS',
    description: 'Enumerate paths between vertices.',
    syntax: 'FOR p IN OUTBOUND K_PATHS startVertex TO targetVertex ...',
    example: 'FOR p IN OUTBOUND K_PATHS "users/1" TO "users/100" GRAPH "social"\n  RETURN p',
    category: 'graph'
  },
  ALL_SHORTEST_PATHS: {
    name: 'ALL_SHORTEST_PATHS',
    description: 'Find all shortest paths between two vertices.',
    syntax: 'FOR p IN OUTBOUND ALL_SHORTEST_PATHS startVertex TO targetVertex ...',
    example: 'FOR p IN OUTBOUND ALL_SHORTEST_PATHS "users/1" TO "users/100" GRAPH "social"\n  RETURN p',
    category: 'graph'
  },
  PRUNE: {
    name: 'PRUNE',
    description: 'Stop traversal on a path when condition is met.',
    syntax: 'FOR v, e, p IN ... PRUNE condition',
    example: 'FOR v, e, p IN 1..10 OUTBOUND "users/1" friends\n  PRUNE v.blocked == true\n  RETURN v',
    category: 'graph'
  },

  // Other
  ALL: {
    name: 'ALL',
    description: 'Array comparison operator: all elements must match.',
    syntax: 'value comparison ALL array',
    example: 'FILTER 1 == ALL [1, 1, 1]',
    category: 'operator'
  },
  NONE: {
    name: 'NONE',
    description: 'Array comparison operator: no elements must match.',
    syntax: 'value comparison NONE array',
    example: 'FILTER 1 == NONE [2, 3, 4]',
    category: 'operator'
  },
  AGGREGATE: {
    name: 'AGGREGATE',
    description: 'Aggregate values in COLLECT statement.',
    syntax: 'COLLECT ... AGGREGATE var = aggregateExpression',
    example: 'COLLECT city = doc.city\n  AGGREGATE total = SUM(doc.amount)\n  RETURN { city, total }',
    category: 'modifier'
  },
  WINDOW: {
    name: 'WINDOW',
    description: 'Define a window for window functions.',
    syntax: 'WINDOW variable WITH { preceding: ..., following: ... }',
    example: 'FOR doc IN collection\n  WINDOW { preceding: 1, following: 1 }\n  AGGREGATE sum = SUM(doc.value)\n  RETURN { doc, sum }',
    category: 'query'
  },
  KEEP: {
    name: 'KEEP',
    description: 'Keep specific variables in COLLECT grouping.',
    syntax: 'COLLECT ... KEEP var1, var2',
    example: 'COLLECT city = doc.city KEEP doc',
    category: 'modifier'
  },
  TO: {
    name: 'TO',
    description: 'Specify target vertex in shortest path queries.',
    syntax: 'SHORTEST_PATH startVertex TO targetVertex',
    example: 'FOR v IN OUTBOUND SHORTEST_PATH "users/1" TO "users/100" ...',
    category: 'graph'
  }
};

/**
 * Get keyword information by name
 */
export function getKeywordInfo(name: string): KeywordInfo | undefined {
  return KEYWORDS[name.toUpperCase()];
}

/**
 * Get all keyword names
 */
export function getAllKeywordNames(): string[] {
  return Object.keys(KEYWORDS);
}

/**
 * Get all keywords
 */
export function getAllKeywords(): KeywordInfo[] {
  return Object.values(KEYWORDS);
}

/**
 * Get keywords by category
 */
export function getKeywordsByCategory(category: KeywordInfo['category']): KeywordInfo[] {
  return Object.values(KEYWORDS).filter(k => k.category === category);
}

/**
 * Generate markdown documentation for a keyword
 */
export function getKeywordMarkdown(name: string): string {
  const keyword = getKeywordInfo(name);
  if (!keyword) return '';

  let doc = `**${keyword.name}**\n\n`;
  doc += `${keyword.description}\n\n`;
  doc += `**Syntax:**\n\`\`\`aql\n${keyword.syntax}\n\`\`\`\n\n`;
  doc += `**Example:**\n\`\`\`aql\n${keyword.example}\n\`\`\``;

  return doc;
}
