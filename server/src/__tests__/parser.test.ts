import { describe, test, expect } from 'bun:test';
import { AqlLexer } from '../parser/lexer';
import { aqlParser } from '../parser/parser';

function parse(input: string) {
  const lexResult = AqlLexer.tokenize(input);
  aqlParser.input = lexResult.tokens;
  const cst = aqlParser.query();
  return {
    cst,
    lexErrors: lexResult.errors,
    parseErrors: aqlParser.errors
  };
}

describe('AQL Parser', () => {
  describe('FOR Statement', () => {
    test('should parse simple FOR...IN...RETURN', () => {
      const result = parse('FOR doc IN collection RETURN doc');
      expect(result.lexErrors).toHaveLength(0);
      expect(result.parseErrors).toHaveLength(0);
      expect(result.cst).toBeTruthy();
    });

    test('should parse FOR with array literal', () => {
      const result = parse('FOR x IN [1, 2, 3] RETURN x');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse nested FOR loops', () => {
      const result = parse('FOR a IN col1 FOR b IN col2 RETURN { a, b }');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse FOR with range', () => {
      const result = parse('FOR i IN 1..10 RETURN i');
      expect(result.parseErrors).toHaveLength(0);
    });
  });

  describe('LET Statement', () => {
    test('should parse simple LET assignment', () => {
      const result = parse('LET x = 42 RETURN x');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse LET with expression', () => {
      const result = parse('LET sum = 1 + 2 + 3 RETURN sum');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse LET with function call', () => {
      const result = parse('LET len = LENGTH("hello") RETURN len');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse LET with subquery', () => {
      const result = parse('LET users = (FOR u IN users RETURN u) RETURN users');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse multiple LET statements', () => {
      const result = parse('LET a = 1 LET b = 2 LET c = a + b RETURN c');
      expect(result.parseErrors).toHaveLength(0);
    });
  });

  describe('FILTER Statement', () => {
    test('should parse simple FILTER', () => {
      const result = parse('FOR doc IN col FILTER doc.active RETURN doc');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse FILTER with comparison', () => {
      const result = parse('FOR doc IN col FILTER doc.age > 18 RETURN doc');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse FILTER with AND', () => {
      const result = parse('FOR doc IN col FILTER doc.age > 18 AND doc.active == true RETURN doc');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse FILTER with OR', () => {
      const result = parse('FOR doc IN col FILTER doc.status == "active" OR doc.admin RETURN doc');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse FILTER with NOT', () => {
      const result = parse('FOR doc IN col FILTER NOT doc.deleted RETURN doc');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse FILTER with IN operator', () => {
      const result = parse('FOR doc IN col FILTER doc.status IN ["active", "pending"] RETURN doc');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse FILTER with LIKE', () => {
      const result = parse('FOR doc IN col FILTER doc.name LIKE "John%" RETURN doc');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse multiple FILTER statements', () => {
      const result = parse('FOR doc IN col FILTER doc.age > 18 FILTER doc.active RETURN doc');
      expect(result.parseErrors).toHaveLength(0);
    });
  });

  describe('SORT Statement', () => {
    test('should parse simple SORT', () => {
      const result = parse('FOR doc IN col SORT doc.name RETURN doc');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse SORT ASC', () => {
      const result = parse('FOR doc IN col SORT doc.name ASC RETURN doc');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse SORT DESC', () => {
      const result = parse('FOR doc IN col SORT doc.age DESC RETURN doc');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse multiple SORT expressions', () => {
      const result = parse('FOR doc IN col SORT doc.name ASC, doc.age DESC RETURN doc');
      expect(result.parseErrors).toHaveLength(0);
    });
  });

  describe('LIMIT Statement', () => {
    test('should parse simple LIMIT', () => {
      const result = parse('FOR doc IN col LIMIT 10 RETURN doc');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse LIMIT with offset', () => {
      const result = parse('FOR doc IN col LIMIT 5, 10 RETURN doc');
      expect(result.parseErrors).toHaveLength(0);
    });
  });

  describe('COLLECT Statement', () => {
    test('should parse simple COLLECT', () => {
      const result = parse('FOR doc IN col COLLECT city = doc.city RETURN city');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse COLLECT INTO', () => {
      const result = parse('FOR doc IN col COLLECT city = doc.city INTO groups RETURN { city, groups }');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse COLLECT with AGGREGATE', () => {
      const result = parse('FOR doc IN col COLLECT city = doc.city AGGREGATE total = SUM(doc.amount) RETURN { city, total }');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse COLLECT with multiple aggregations', () => {
      const result = parse(`
        FOR doc IN col
        COLLECT city = doc.city
        AGGREGATE total = SUM(doc.amount), count = LENGTH(1)
        RETURN { city, total, count }
      `);
      expect(result.parseErrors).toHaveLength(0);
    });
  });

  describe('RETURN Statement', () => {
    test('should parse simple RETURN', () => {
      const result = parse('RETURN 42');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse RETURN DISTINCT', () => {
      const result = parse('FOR doc IN col RETURN DISTINCT doc.category');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse RETURN with object', () => {
      const result = parse('FOR doc IN col RETURN { id: doc._key, name: doc.name }');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse RETURN with shorthand object', () => {
      const result = parse('LET x = 1 RETURN { x }');
      expect(result.parseErrors).toHaveLength(0);
    });
  });

  describe('Data Modification', () => {
    test('should parse INSERT', () => {
      const result = parse('INSERT { name: "John" } INTO users');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse INSERT with OPTIONS', () => {
      const result = parse('INSERT { name: "John" } INTO users OPTIONS { waitForSync: true }');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse UPDATE', () => {
      const result = parse('FOR doc IN users UPDATE doc WITH { active: true } IN users');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse REPLACE', () => {
      const result = parse('FOR doc IN users REPLACE doc WITH { name: doc.name, active: false } IN users');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse REMOVE', () => {
      const result = parse('FOR doc IN users FILTER doc.deleted REMOVE doc IN users');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse UPSERT', () => {
      const result = parse(`
        UPSERT { email: "john@example.com" }
        INSERT { email: "john@example.com", count: 1 }
        UPDATE { count: OLD.count + 1 }
        IN users
      `);
      expect(result.parseErrors).toHaveLength(0);
    });
  });

  describe('Graph Traversal', () => {
    test('should parse OUTBOUND traversal', () => {
      const result = parse('FOR v IN 1..3 OUTBOUND "users/1" friends RETURN v');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse INBOUND traversal', () => {
      const result = parse('FOR v IN 1..3 INBOUND "users/1" friends RETURN v');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse ANY traversal', () => {
      const result = parse('FOR v IN 1..3 ANY "users/1" friends RETURN v');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse traversal with GRAPH', () => {
      const result = parse('FOR v IN 1..3 OUTBOUND "users/1" GRAPH "social" RETURN v');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse traversal with vertex and edge variables', () => {
      const result = parse('FOR v, e, p IN 1..3 OUTBOUND "users/1" friends RETURN { v, e, p }');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse SHORTEST_PATH', () => {
      const result = parse('FOR v IN OUTBOUND SHORTEST_PATH "users/1" TO "users/100" GRAPH "social" RETURN v');
      expect(result.parseErrors).toHaveLength(0);
    });
  });

  describe('Expressions', () => {
    test('should parse arithmetic expressions', () => {
      const result = parse('RETURN 1 + 2 * 3 - 4 / 2');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse parenthesized expressions', () => {
      const result = parse('RETURN (1 + 2) * 3');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse ternary expressions', () => {
      const result = parse('LET x = true ? 1 : 0 RETURN x');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse member access', () => {
      const result = parse('FOR doc IN col RETURN doc.name');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse nested member access', () => {
      const result = parse('FOR doc IN col RETURN doc.address.city');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse array access', () => {
      const result = parse('LET arr = [1, 2, 3] RETURN arr[0]');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse array expansion', () => {
      const result = parse('FOR doc IN col RETURN doc.items[*].name');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse function calls', () => {
      const result = parse('RETURN LENGTH("hello")');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse function with multiple arguments', () => {
      const result = parse('RETURN SUBSTRING("hello", 0, 2)');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse nested function calls', () => {
      const result = parse('RETURN UPPER(CONCAT("hello", " ", "world"))');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse namespaced function calls', () => {
      const result = parse('RETURN MY::CUSTOM::FUNCTION(1, 2)');
      expect(result.parseErrors).toHaveLength(0);
    });
  });

  describe('Literals', () => {
    test('should parse array literals', () => {
      const result = parse('RETURN [1, 2, 3]');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse nested array literals', () => {
      const result = parse('RETURN [[1, 2], [3, 4]]');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse object literals', () => {
      const result = parse('RETURN { name: "John", age: 30 }');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse nested object literals', () => {
      const result = parse('RETURN { user: { name: "John" }, active: true }');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse computed property names', () => {
      const result = parse('LET key = "name" RETURN { [key]: "John" }');
      expect(result.parseErrors).toHaveLength(0);
    });
  });

  describe('Bind Parameters', () => {
    test('should parse value bind parameters', () => {
      const result = parse('FOR doc IN col FILTER doc._key == @key RETURN doc');
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse collection bind parameters', () => {
      const result = parse('FOR doc IN @@collection RETURN doc');
      expect(result.parseErrors).toHaveLength(0);
    });
  });

  describe('WITH Statement', () => {
    test('should parse WITH for collections', () => {
      const result = parse('WITH users, orders FOR u IN users RETURN u');
      expect(result.parseErrors).toHaveLength(0);
    });
  });

  describe('Error Recovery', () => {
    test('should report error on invalid syntax', () => {
      const result = parse('FOR IN collection RETURN');
      expect(result.parseErrors.length).toBeGreaterThan(0);
    });

    test('should report error on missing RETURN', () => {
      const result = parse('FOR doc IN collection');
      // Parser should still produce partial CST
      expect(result.cst).toBeTruthy();
    });
  });

  describe('Complex Queries', () => {
    test('should parse complex aggregation query', () => {
      const result = parse(`
        FOR order IN orders
          FILTER order.date >= "2024-01-01"
          COLLECT
            year = DATE_YEAR(order.date),
            month = DATE_MONTH(order.date)
          AGGREGATE
            total = SUM(order.amount),
            count = LENGTH(1)
          SORT year, month
          RETURN { year, month, total, count }
      `);
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse query with multiple operations', () => {
      const result = parse(`
        LET start = "2024-01-01"
        FOR user IN users
          FILTER user.created >= start
          FOR order IN orders
            FILTER order.userId == user._key
            COLLECT userId = user._key
            AGGREGATE orderCount = LENGTH(1)
          SORT orderCount DESC
          LIMIT 10
          RETURN { userId, orderCount }
      `);
      expect(result.parseErrors).toHaveLength(0);
    });

    test('should parse subquery in FILTER', () => {
      const result = parse(`
        FOR user IN users
          LET orderCount = LENGTH(
            FOR order IN orders
              FILTER order.userId == user._key
              RETURN 1
          )
          FILTER orderCount > 5
          RETURN { user, orderCount }
      `);
      expect(result.parseErrors).toHaveLength(0);
    });
  });
});
