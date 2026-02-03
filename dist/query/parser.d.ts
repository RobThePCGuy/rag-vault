/**
 * Parsed query structure
 */
export interface ParsedQuery {
    /** Terms for semantic search */
    semanticTerms: string[];
    /** Exact phrases for FTS matching (quoted strings) */
    phrases: string[];
    /** Metadata field filters (field:value) */
    filters: {
        field: string;
        value: string;
    }[];
    /** Terms to exclude from results (-term) */
    excludeTerms: string[];
    /** Primary boolean operator (default: AND) */
    booleanOp: 'AND' | 'OR';
    /** Original query for reference */
    originalQuery: string;
}
/**
 * Parse a query string into structured query parts
 *
 * Syntax:
 * - "exact phrase" → Match phrase exactly
 * - field:value → Filter by metadata field
 * - -term → Exclude term from results
 * - term1 AND term2 → Both terms required (default)
 * - term1 OR term2 → Either term matches
 * - (group) → Group expressions (future: for complex boolean)
 *
 * @param query - Raw query string
 * @returns Parsed query structure
 */
export declare function parseQuery(query: string): ParsedQuery;
/**
 * Convert parsed query to a semantic search query string
 * Joins semantic terms and phrases for embedding
 */
export declare function toSemanticQuery(parsed: ParsedQuery): string;
/**
 * Convert parsed query to a full-text search query string
 * Uses FTS-compatible syntax for phrase matching
 */
export declare function toFtsQuery(parsed: ParsedQuery): string;
/**
 * Check if a result should be excluded based on exclude terms
 */
export declare function shouldExclude(text: string, excludeTerms: string[]): boolean;
/**
 * Check if a result matches the metadata filters
 */
export declare function matchesFilters(metadata: Record<string, string> | undefined, filters: {
    field: string;
    value: string;
}[]): boolean;
//# sourceMappingURL=parser.d.ts.map