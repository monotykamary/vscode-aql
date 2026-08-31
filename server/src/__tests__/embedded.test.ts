import { describe, test, expect } from 'bun:test';
import { extractEmbeddedAql, isPositionInRegion, toAbsolutePosition } from '../embedded/extractor';

describe('Embedded AQL Extractor', () => {
  describe('extractEmbeddedAql', () => {
    test('should extract aql tagged template literal', () => {
      const code = `
const result = aql\`
  FOR doc IN users
  RETURN doc
\`;
`;
      const regions = extractEmbeddedAql(code, 'javascript');
      expect(regions).toHaveLength(1);
      expect(regions[0].content).toContain('FOR doc IN users');
      expect(regions[0].content).toContain('RETURN doc');
    });

    test('should extract AQL tagged template literal (uppercase)', () => {
      const code = `const q = AQL\`FOR x IN collection RETURN x\`;`;
      const regions = extractEmbeddedAql(code, 'typescript');
      expect(regions).toHaveLength(1);
      expect(regions[0].content).toBe('FOR x IN collection RETURN x');
    });

    test('should extract query tagged template literal', () => {
      const code = `const q = query\`FOR doc IN items FILTER doc.active RETURN doc\`;`;
      const regions = extractEmbeddedAql(code, 'javascript');
      expect(regions).toHaveLength(1);
      expect(regions[0].content).toContain('FOR doc IN items');
    });

    test('should extract /* aql */ comment marked template literal', () => {
      const code = `const q = /* aql */ \`FOR doc IN products RETURN doc.name\`;`;
      const regions = extractEmbeddedAql(code, 'javascript');
      expect(regions).toHaveLength(1);
      expect(regions[0].content).toContain('FOR doc IN products');
    });

    test('should extract multiple AQL regions', () => {
      const code = `
const query1 = aql\`FOR u IN users RETURN u\`;
const query2 = aql\`FOR p IN products RETURN p\`;
`;
      const regions = extractEmbeddedAql(code, 'javascript');
      expect(regions).toHaveLength(2);
    });

    test('should not extract from non-JS/TS files', () => {
      const code = `const q = aql\`FOR doc IN users RETURN doc\`;`;
      const regions = extractEmbeddedAql(code, 'python');
      expect(regions).toHaveLength(0);
    });

    test('should extract untagged template with AQL keywords', () => {
      const code = `
const q = \`
  FOR doc IN users
  FILTER doc.age > 18
  RETURN doc.name
\`;
`;
      const regions = extractEmbeddedAql(code, 'typescript');
      expect(regions.length).toBeGreaterThanOrEqual(1);
    });

    test('should calculate correct line and column positions', () => {
      const code = `const q = aql\`FOR doc IN users RETURN doc\`;`;
      const regions = extractEmbeddedAql(code, 'javascript');
      expect(regions).toHaveLength(1);
      expect(regions[0].startLine).toBe(1);
      expect(regions[0].startColumn).toBeGreaterThan(10); // After "const q = aql`"
    });

    test('should handle multiline AQL correctly', () => {
      const code = `const q = aql\`
FOR doc IN users
FILTER doc.active == true
RETURN doc
\`;`;
      const regions = extractEmbeddedAql(code, 'javascript');
      expect(regions).toHaveLength(1);
      expect(regions[0].content).toContain('FOR doc IN users');
      expect(regions[0].content).toContain('FILTER doc.active == true');
      expect(regions[0].content).toContain('RETURN doc');
    });
  });

  describe('isPositionInRegion', () => {
    test('should return region when offset is inside', () => {
      const code = `const q = aql\`FOR doc IN users RETURN doc\`;`;
      const regions = extractEmbeddedAql(code, 'javascript');
      const offset = code.indexOf('FOR');
      const region = isPositionInRegion(regions, offset);
      expect(region).not.toBeNull();
    });

    test('should return null when offset is outside', () => {
      const code = `const q = aql\`FOR doc IN users RETURN doc\`;`;
      const regions = extractEmbeddedAql(code, 'javascript');
      const offset = 0; // Before the AQL region
      const region = isPositionInRegion(regions, offset);
      expect(region).toBeNull();
    });
  });

  describe('toAbsolutePosition', () => {
    test('should convert region-relative position to absolute', () => {
      const code = `const q = aql\`FOR doc IN users RETURN doc\`;`;
      const regions = extractEmbeddedAql(code, 'javascript');
      expect(regions).toHaveLength(1);

      // Position at start of region content (line 1, col 1)
      const absPos = toAbsolutePosition(regions[0], 1, 1);
      expect(absPos.line).toBe(regions[0].startLine);
      expect(absPos.column).toBe(regions[0].startColumn);
    });
  });

  describe('TypeScript specific', () => {
    test('should handle TypeScript with type annotations', () => {
      const code = `
const getUsers = async (): Promise<User[]> => {
  const result = await db.query(aql\`
    FOR user IN users
    FILTER user.active == true
    RETURN user
  \`);
  return result.all();
};
`;
      const regions = extractEmbeddedAql(code, 'typescript');
      expect(regions).toHaveLength(1);
      expect(regions[0].content).toContain('FOR user IN users');
    });

    test('should handle TSX files', () => {
      const code = `
function UserList() {
  const query = aql\`FOR u IN users RETURN u\`;
  return <div>Users</div>;
}
`;
      const regions = extractEmbeddedAql(code, 'typescriptreact');
      expect(regions).toHaveLength(1);
    });
  });
});
