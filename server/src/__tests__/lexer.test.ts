import { describe, test, expect } from 'bun:test';
import { AqlLexer } from '../parser/lexer';

describe('AQL Lexer', () => {
  describe('Keywords', () => {
    test('should tokenize FOR keyword', () => {
      const result = AqlLexer.tokenize('FOR');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType.name).toBe('KwFor');
    });

    test('should tokenize keywords case-insensitively', () => {
      const result = AqlLexer.tokenize('for RETURN Filter');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(3);
      expect(result.tokens[0].tokenType.name).toBe('KwFor');
      expect(result.tokens[1].tokenType.name).toBe('KwReturn');
      expect(result.tokens[2].tokenType.name).toBe('KwFilter');
    });

    test('should tokenize all query keywords', () => {
      const keywords = ['FOR', 'RETURN', 'FILTER', 'SORT', 'LIMIT', 'LET', 'COLLECT'];
      for (const keyword of keywords) {
        const result = AqlLexer.tokenize(keyword);
        expect(result.errors).toHaveLength(0);
        expect(result.tokens).toHaveLength(1);
      }
    });

    test('should tokenize graph keywords', () => {
      const keywords = ['GRAPH', 'OUTBOUND', 'INBOUND', 'ANY', 'SHORTEST_PATH'];
      for (const keyword of keywords) {
        const result = AqlLexer.tokenize(keyword);
        expect(result.errors).toHaveLength(0);
        expect(result.tokens).toHaveLength(1);
      }
    });

    test('should tokenize data modification keywords', () => {
      const keywords = ['INSERT', 'UPDATE', 'REMOVE', 'REPLACE', 'UPSERT'];
      for (const keyword of keywords) {
        const result = AqlLexer.tokenize(keyword);
        expect(result.errors).toHaveLength(0);
        expect(result.tokens).toHaveLength(1);
      }
    });
  });

  describe('Identifiers', () => {
    test('should tokenize simple identifier', () => {
      const result = AqlLexer.tokenize('myVariable');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType.name).toBe('Identifier');
      expect(result.tokens[0].image).toBe('myVariable');
    });

    test('should tokenize identifier with underscore', () => {
      const result = AqlLexer.tokenize('my_variable_123');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType.name).toBe('Identifier');
    });

    test('should not confuse identifiers starting with keywords', () => {
      const result = AqlLexer.tokenize('forEach');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType.name).toBe('Identifier');
      expect(result.tokens[0].image).toBe('forEach');
    });

    test('should tokenize backtick quoted identifier', () => {
      const result = AqlLexer.tokenize('`my-special-name`');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType.name).toBe('QuotedIdentifier');
    });
  });

  describe('Literals', () => {
    test('should tokenize integer number', () => {
      const result = AqlLexer.tokenize('42');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType.name).toBe('Number');
      expect(result.tokens[0].image).toBe('42');
    });

    test('should tokenize decimal number', () => {
      const result = AqlLexer.tokenize('3.14159');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType.name).toBe('Number');
    });

    test('should tokenize negative number as minus and number', () => {
      const result = AqlLexer.tokenize('-42');
      expect(result.errors).toHaveLength(0);
      // Minus is a separate operator token, number follows
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0].tokenType.name).toBe('Minus');
      expect(result.tokens[1].tokenType.name).toBe('Number');
    });

    test('should tokenize scientific notation', () => {
      const result = AqlLexer.tokenize('1.5e10');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType.name).toBe('Number');
    });

    test('should tokenize single-quoted string', () => {
      const result = AqlLexer.tokenize("'hello world'");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType.name).toBe('SingleQuoteString');
    });

    test('should tokenize double-quoted string', () => {
      const result = AqlLexer.tokenize('"hello world"');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType.name).toBe('DoubleQuoteString');
    });

    test('should tokenize string with escape sequences', () => {
      const result = AqlLexer.tokenize("'hello\\nworld'");
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
    });

    test('should tokenize boolean true', () => {
      const result = AqlLexer.tokenize('true');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType.name).toBe('True');
    });

    test('should tokenize boolean false', () => {
      const result = AqlLexer.tokenize('false');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType.name).toBe('False');
    });

    test('should tokenize null', () => {
      const result = AqlLexer.tokenize('null');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType.name).toBe('Null');
    });
  });

  describe('Operators', () => {
    test('should tokenize comparison operators', () => {
      const operators = ['==', '!=', '>=', '<=', '>', '<'];
      for (const op of operators) {
        const result = AqlLexer.tokenize(op);
        expect(result.errors).toHaveLength(0);
        expect(result.tokens).toHaveLength(1);
      }
    });

    test('should tokenize arithmetic operators', () => {
      const operators = ['+', '-', '*', '/', '%'];
      for (const op of operators) {
        const result = AqlLexer.tokenize(op);
        expect(result.errors).toHaveLength(0);
        expect(result.tokens).toHaveLength(1);
      }
    });

    test('should tokenize logical operators', () => {
      const result = AqlLexer.tokenize('&& || !');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(3);
      expect(result.tokens[0].tokenType.name).toBe('LogicalAnd');
      expect(result.tokens[1].tokenType.name).toBe('LogicalOr');
      expect(result.tokens[2].tokenType.name).toBe('LogicalNot');
    });

    test('should tokenize range operator', () => {
      const result = AqlLexer.tokenize('..');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType.name).toBe('Range');
    });

    test('should tokenize ternary operator components', () => {
      const result = AqlLexer.tokenize('? :');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0].tokenType.name).toBe('Question');
      expect(result.tokens[1].tokenType.name).toBe('Colon');
    });

    test('should tokenize regex operators', () => {
      const result = AqlLexer.tokenize('=~ !~');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0].tokenType.name).toBe('RegexMatch');
      expect(result.tokens[1].tokenType.name).toBe('RegexNotMatch');
    });
  });

  describe('Bind Parameters', () => {
    test('should tokenize bind parameter', () => {
      const result = AqlLexer.tokenize('@userId');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType.name).toBe('BindParameter');
      expect(result.tokens[0].image).toBe('@userId');
    });

    test('should tokenize collection bind parameter', () => {
      const result = AqlLexer.tokenize('@@collection');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType.name).toBe('CollectionBind');
      expect(result.tokens[0].image).toBe('@@collection');
    });
  });

  describe('Comments', () => {
    test('should skip line comments', () => {
      const result = AqlLexer.tokenize('FOR // this is a comment\nRETURN');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0].tokenType.name).toBe('KwFor');
      expect(result.tokens[1].tokenType.name).toBe('KwReturn');
    });

    test('should skip block comments', () => {
      const result = AqlLexer.tokenize('FOR /* multi\nline\ncomment */ RETURN');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(2);
    });
  });

  describe('Punctuation', () => {
    test('should tokenize brackets and braces', () => {
      const result = AqlLexer.tokenize('()[]{}');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(6);
      expect(result.tokens[0].tokenType.name).toBe('LParen');
      expect(result.tokens[1].tokenType.name).toBe('RParen');
      expect(result.tokens[2].tokenType.name).toBe('LBracket');
      expect(result.tokens[3].tokenType.name).toBe('RBracket');
      expect(result.tokens[4].tokenType.name).toBe('LBrace');
      expect(result.tokens[5].tokenType.name).toBe('RBrace');
    });

    test('should tokenize comma and dot', () => {
      const result = AqlLexer.tokenize(',.');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0].tokenType.name).toBe('Comma');
      expect(result.tokens[1].tokenType.name).toBe('Dot');
    });

    test('should tokenize double colon', () => {
      const result = AqlLexer.tokenize('::');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType.name).toBe('DoubleColon');
    });
  });

  describe('Complete Queries', () => {
    test('should tokenize simple FOR...RETURN query', () => {
      const result = AqlLexer.tokenize('FOR doc IN collection RETURN doc');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(6);
    });

    test('should tokenize query with filter', () => {
      const result = AqlLexer.tokenize('FOR doc IN users FILTER doc.age > 18 RETURN doc.name');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.length).toBeGreaterThan(5);
    });

    test('should tokenize query with bind parameters', () => {
      const result = AqlLexer.tokenize('FOR doc IN @@collection FILTER doc._key == @key RETURN doc');
      expect(result.errors).toHaveLength(0);
      const bindTokens = result.tokens.filter(t =>
        t.tokenType.name === 'BindParameter' || t.tokenType.name === 'CollectionBind'
      );
      expect(bindTokens).toHaveLength(2);
    });

    test('should tokenize LET statement', () => {
      const result = AqlLexer.tokenize('LET x = 1 + 2 RETURN x');
      expect(result.errors).toHaveLength(0);
    });

    test('should tokenize graph traversal', () => {
      const result = AqlLexer.tokenize('FOR v, e, p IN 1..3 OUTBOUND "users/1" GRAPH "social" RETURN v');
      expect(result.errors).toHaveLength(0);
    });

    test('should tokenize COLLECT with aggregation', () => {
      const result = AqlLexer.tokenize('FOR doc IN orders COLLECT city = doc.city AGGREGATE total = SUM(doc.amount) RETURN { city, total }');
      expect(result.errors).toHaveLength(0);
    });

    test('should tokenize INSERT statement', () => {
      const result = AqlLexer.tokenize('INSERT { name: "John", age: 30 } INTO users');
      expect(result.errors).toHaveLength(0);
    });

    test('should tokenize UPDATE statement', () => {
      const result = AqlLexer.tokenize('FOR doc IN users UPDATE doc WITH { active: true } IN users');
      expect(result.errors).toHaveLength(0);
    });

    test('should tokenize UPSERT statement', () => {
      const query = `
        UPSERT { email: @email }
        INSERT { email: @email, count: 1 }
        UPDATE { count: OLD.count + 1 }
        IN users
      `;
      const result = AqlLexer.tokenize(query);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Position Tracking', () => {
    test('should track token positions correctly', () => {
      const result = AqlLexer.tokenize('FOR doc IN');
      expect(result.errors).toHaveLength(0);

      const forToken = result.tokens[0];
      expect(forToken.startLine).toBe(1);
      expect(forToken.startColumn).toBe(1);
      expect(forToken.endColumn).toBe(3);

      const docToken = result.tokens[1];
      expect(docToken.startLine).toBe(1);
      expect(docToken.startColumn).toBe(5);
    });

    test('should track multiline positions', () => {
      const result = AqlLexer.tokenize('FOR\ndoc\nIN');
      expect(result.errors).toHaveLength(0);

      expect(result.tokens[0].startLine).toBe(1);
      expect(result.tokens[1].startLine).toBe(2);
      expect(result.tokens[2].startLine).toBe(3);
    });
  });
});
