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
 * Extract all embedded AQL regions from a document
 */
export declare function extractEmbeddedAql(text: string, languageId: string): EmbeddedRegion[];
/**
 * Check if a position is within an embedded AQL region
 */
export declare function isPositionInRegion(regions: EmbeddedRegion[], offset: number): EmbeddedRegion | null;
/**
 * Convert a position within an AQL region to the region-local position
 */
export declare function toRegionPosition(region: EmbeddedRegion, absoluteOffset: number): {
    line: number;
    column: number;
};
/**
 * Convert a region-local position back to absolute document position
 */
export declare function toAbsolutePosition(region: EmbeddedRegion, regionLine: number, regionColumn: number): {
    line: number;
    column: number;
};
