/**
 * Embedded AQL Region Extractor
 *
 * Extracts AQL code regions from JS/TS template literals
 */

export interface EmbeddedRegion {
  content: string;
  startOffset: number;
  endOffset: number;
  startLine: number;
  startColumn: number;
}

/**
 * Patterns for detecting AQL template literals
 */
const AQL_PATTERNS = [
  // aql`...` or AQL`...` or query`...`
  /(?:aql|AQL|query)\s*`([^`]*)`/g,
  // /* aql */ `...` or /* AQL */ `...`
  /\/\*\s*(?:aql|AQL|inline-aql|inline-AQL)\s*\*\/\s*`([^`]*)`/g,
  // // aql followed by template literal on next line
  /\/\/\s*(?:aql|AQL|inline-aql|inline-AQL)\s*\n\s*`([^`]*)`/g
];

/**
 * Extract all embedded AQL regions from a document
 */
export function extractEmbeddedAql(text: string, languageId: string): EmbeddedRegion[] {
  // Only process JS/TS files
  if (!isJsOrTs(languageId)) {
    return [];
  }

  const regions: EmbeddedRegion[] = [];
  const lines = text.split('\n');

  for (const pattern of AQL_PATTERNS) {
    // Reset regex state
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const aqlContent = match[1];
      const startOffset = match.index + match[0].indexOf('`') + 1;
      const endOffset = startOffset + aqlContent.length;

      // Calculate line and column
      const { line, column } = offsetToLineColumn(text, startOffset);

      regions.push({
        content: aqlContent,
        startOffset,
        endOffset,
        startLine: line,
        startColumn: column
      });
    }
  }

  // Also handle the simpler case: any backtick string containing AQL keywords
  // This catches cases where the template literal doesn't have an explicit marker
  const simplePattern = /`([^`]*(?:FOR|LET|RETURN|FILTER)\s+[^`]*)`/g;
  let match;
  while ((match = simplePattern.exec(text)) !== null) {
    const content = match[1];
    const startOffset = match.index + 1;
    const endOffset = startOffset + content.length;

    // Check if this region overlaps with any existing captured region
    const alreadyCaptured = regions.some(r =>
      (startOffset >= r.startOffset && startOffset < r.endOffset) ||
      (endOffset > r.startOffset && endOffset <= r.endOffset) ||
      (startOffset <= r.startOffset && endOffset >= r.endOffset)
    );

    if (!alreadyCaptured && looksLikeAql(content)) {
      const { line, column } = offsetToLineColumn(text, startOffset);

      regions.push({
        content,
        startOffset,
        endOffset,
        startLine: line,
        startColumn: column
      });
    }
  }

  return regions;
}

/**
 * Check if content looks like AQL code
 */
function looksLikeAql(content: string): boolean {
  // Check for common AQL patterns
  const aqlIndicators = [
    /\bFOR\s+\w+\s+IN\b/i,
    /\bRETURN\s+/i,
    /\bFILTER\s+/i,
    /\bLET\s+\w+\s*=/i,
    /\bINSERT\s+/i,
    /\bUPDATE\s+/i,
    /\bREMOVE\s+/i,
    /\bCOLLECT\s+/i
  ];

  return aqlIndicators.some(pattern => pattern.test(content));
}

/**
 * Check if language is JS or TS
 */
function isJsOrTs(languageId: string): boolean {
  return ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(languageId);
}

/**
 * Convert offset to line and column (1-based)
 */
function offsetToLineColumn(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let column = 1;

  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }

  return { line, column };
}

/**
 * Check if a position is within an embedded AQL region
 */
export function isPositionInRegion(
  regions: EmbeddedRegion[],
  offset: number
): EmbeddedRegion | null {
  for (const region of regions) {
    if (offset >= region.startOffset && offset <= region.endOffset) {
      return region;
    }
  }
  return null;
}

/**
 * Convert a position within an AQL region to the region-local position
 */
export function toRegionPosition(
  region: EmbeddedRegion,
  absoluteOffset: number
): { line: number; column: number } {
  const relativeOffset = absoluteOffset - region.startOffset;

  let line = 1;
  let column = 1;

  for (let i = 0; i < relativeOffset && i < region.content.length; i++) {
    if (region.content[i] === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }

  return { line, column };
}

/**
 * Convert a region-local position back to absolute document position
 */
export function toAbsolutePosition(
  region: EmbeddedRegion,
  regionLine: number,
  regionColumn: number
): { line: number; column: number } {
  // Start from the region's starting position
  let absoluteLine = region.startLine;
  let absoluteColumn = region.startColumn;

  // Add lines from the region
  if (regionLine === 1) {
    absoluteColumn += regionColumn - 1;
  } else {
    absoluteLine += regionLine - 1;
    absoluteColumn = regionColumn;
  }

  return { line: absoluteLine, column: absoluteColumn };
}
