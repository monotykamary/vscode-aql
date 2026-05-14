import { describe, test, expect } from 'bun:test';
import { analyzer } from '../parser/analyzer';

describe('AQL Analyzer', () => {
  describe('parse', () => {
    test('should parse valid query without errors', () => {
      const result = analyzer.parse('FOR doc IN collection RETURN doc');
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.cst).toBeTruthy();
    });

    test('should report lexer errors', () => {
      const result = analyzer.parse('FOR doc IN collection RETURN $invalid');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should report parser errors for invalid syntax', () => {
      const result = analyzer.parse('FOR IN collection');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('extractSymbols', () => {
    test('should extract LET variables', () => {
      const result = analyzer.parse('LET x = 1 LET y = 2 RETURN x + y');
      const symbols = analyzer.extractSymbols(result.tokens);

      expect(symbols.variables).toHaveLength(2);
      expect(symbols.variables.map(v => v.name)).toContain('x');
      expect(symbols.variables.map(v => v.name)).toContain('y');
    });

    test('should extract FOR variables', () => {
      const result = analyzer.parse('FOR doc IN collection FOR item IN doc.items RETURN item');
      const symbols = analyzer.extractSymbols(result.tokens);

      expect(symbols.variables.map(v => v.name)).toContain('doc');
      expect(symbols.variables.map(v => v.name)).toContain('item');
    });

    test('should extract function calls', () => {
      const result = analyzer.parse('RETURN LENGTH(CONCAT("a", "b"))');
      const symbols = analyzer.extractSymbols(result.tokens);

      expect(symbols.functions.map(f => f.name)).toContain('LENGTH');
      expect(symbols.functions.map(f => f.name)).toContain('CONCAT');
    });

    test('should extract bind parameters', () => {
      const result = analyzer.parse('FOR doc IN @@col FILTER doc.id == @id RETURN doc');
      const symbols = analyzer.extractSymbols(result.tokens);

      expect(symbols.bindParameters.map(p => p.name)).toContain('id');
      expect(symbols.collections.map(c => c.name)).toContain('col');
    });

    test('should track variable references', () => {
      const result = analyzer.parse('LET x = 1 LET y = x + 1 RETURN x + y');
      const symbols = analyzer.extractSymbols(result.tokens);

      const xVar = symbols.variables.find(v => v.name === 'x');
      expect(xVar).toBeTruthy();
      expect(xVar!.references.length).toBeGreaterThan(0);
    });
  });

  describe('getTokenAtPosition', () => {
    test('should find token at position', () => {
      const result = analyzer.parse('FOR doc IN collection RETURN doc');
      const token = analyzer.getTokenAtPosition(result.tokens, 1, 1);

      expect(token).toBeTruthy();
      expect(token!.tokenType.name).toBe('KwFor');
    });

    test('should find identifier token', () => {
      const result = analyzer.parse('FOR doc IN collection RETURN doc');
      const token = analyzer.getTokenAtPosition(result.tokens, 1, 5);

      expect(token).toBeTruthy();
      expect(token!.tokenType.name).toBe('Identifier');
      expect(token!.image).toBe('doc');
    });

    test('should return null for position outside tokens', () => {
      const result = analyzer.parse('FOR doc IN collection RETURN doc');
      const token = analyzer.getTokenAtPosition(result.tokens, 100, 1);

      expect(token).toBeNull();
    });
  });

  describe('getContextAtPosition', () => {
    test('should detect FOR loop context', () => {
      const result = analyzer.parse('FOR doc IN collection RETURN doc');
      const context = analyzer.getContextAtPosition(result.tokens, 1, 25);

      expect(context.inForLoop).toBe(true);
    });

    test('should detect LET statement context', () => {
      const result = analyzer.parse('LET x = 1 RETURN x');
      const context = analyzer.getContextAtPosition(result.tokens, 1, 5);

      expect(context.inLetStatement).toBe(true);
    });

    test('should detect function call context', () => {
      const result = analyzer.parse('RETURN LENGTH("hello")');
      const context = analyzer.getContextAtPosition(result.tokens, 1, 15);

      expect(context.inFunctionCall).toBe(true);
      expect(context.currentFunction).toBe('LENGTH');
    });

    test('should track argument index in function', () => {
      const result = analyzer.parse('RETURN SUBSTRING("hello", 0, 2)');
      // Position after first comma
      const context = analyzer.getContextAtPosition(result.tokens, 1, 27);

      expect(context.inFunctionCall).toBe(true);
      expect(context.currentFunction).toBe('SUBSTRING');
      expect(context.argumentIndex).toBeGreaterThan(0);
    });

    test('should track available variables', () => {
      const result = analyzer.parse('LET x = 1 LET y = 2 RETURN x + y');
      const context = analyzer.getContextAtPosition(result.tokens, 1, 30);

      expect(context.availableVariables).toContain('x');
      expect(context.availableVariables).toContain('y');
    });

    test('should detect object literal context', () => {
      const result = analyzer.parse('RETURN { name: "John" }');
      const context = analyzer.getContextAtPosition(result.tokens, 1, 12);

      expect(context.inObjectLiteral).toBe(true);
    });

    test('should detect array literal context', () => {
      const result = analyzer.parse('RETURN [1, 2, 3]');
      const context = analyzer.getContextAtPosition(result.tokens, 1, 10);

      expect(context.inArrayLiteral).toBe(true);
    });
  });

  describe('error messages', () => {
    test('should provide meaningful error for unexpected token', () => {
      const result = analyzer.parse('FOR IN collection');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toBeTruthy();
    });

    test('should include line and column in errors', () => {
      const result = analyzer.parse('FOR doc IN collection\nFOR IN other');
      const errors = result.errors.filter(e => e.line === 2);

      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
