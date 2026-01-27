import type { EmbedderInterface } from '../chunker/semantic-chunker.js';
export type { EmbedderInterface };
/**
 * Text item with position information from PDF
 */
export interface TextItemWithPosition {
    text: string;
    x: number;
    y: number;
    fontSize: number;
    hasEOL: boolean;
}
/**
 * Page data containing positioned text items
 */
export interface PageData {
    pageNum: number;
    items: TextItemWithPosition[];
}
/**
 * Join filtered pages into text
 *
 * @param pages - Filtered page data
 * @returns Joined text with proper line breaks
 */
export declare function joinFilteredPages(pages: PageData[]): string;
/**
 * Configuration for sentence-level pattern detection
 */
export interface SentencePatternConfig {
    /** Similarity threshold for pattern detection (default: 0.85) */
    similarityThreshold: number;
    /** Minimum pages required for pattern detection (default: 3) */
    minPages: number;
    /** Number of pages to sample from center for pattern detection (default: 5) */
    samplePages: number;
}
/** Default configuration for sentence-level pattern detection */
export declare const DEFAULT_SENTENCE_PATTERN_CONFIG: SentencePatternConfig;
/**
 * Result of sentence-level pattern detection
 */
export interface SentencePatternResult {
    /** Whether first sentences should be removed (detected as header) */
    removeFirstSentence: boolean;
    /** Whether last sentences should be removed (detected as footer) */
    removeLastSentence: boolean;
    /** Median similarity of first sentences */
    headerSimilarity: number;
    /** Median similarity of last sentences */
    footerSimilarity: number;
}
/**
 * Detect header/footer patterns at sentence level
 *
 * Algorithm:
 * 1. Sample pages from the CENTER of the document (guaranteed to be content pages)
 * 2. Split each page into sentences with Y coordinate
 * 3. Collect first/last sentences from sampled pages
 * 4. Embed and calculate median pairwise similarity
 * 5. If similarity > threshold, mark as header/footer
 *
 * Key insight: Middle pages are always content pages (cover, TOC, index are at edges).
 * Using median instead of mean provides robustness against outliers.
 *
 * This approach handles variable content like page numbers ("7 of 75")
 * by using semantic similarity instead of exact text matching.
 *
 * @param pages - Array of page data
 * @param embedder - Embedder for generating embeddings
 * @param config - Configuration options
 * @returns Detection result
 */
export declare function detectSentencePatterns(pages: PageData[], embedder: EmbedderInterface, config?: Partial<SentencePatternConfig>): Promise<SentencePatternResult>;
/**
 * Filter page boundary sentences and join into text
 *
 * This is the main entry point for sentence-level header/footer filtering.
 * It detects and removes repeating sentence patterns at page boundaries.
 *
 * Use this instead of joinFilteredPages when embedder is available.
 *
 * @param pages - Array of page data
 * @param embedder - Embedder for generating embeddings
 * @param config - Configuration options
 * @returns Filtered text with header/footer sentences removed
 */
export declare function filterPageBoundarySentences(pages: PageData[], embedder: EmbedderInterface, config?: Partial<SentencePatternConfig>): Promise<string>;
//# sourceMappingURL=pdf-filter.d.ts.map