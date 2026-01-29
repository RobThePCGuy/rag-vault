/**
 * Find shared keywords between two texts
 * Returns keywords sorted by combined frequency
 */
export declare function findSharedKeywords(text1: string, text2: string, maxCount?: number): string[];
/**
 * Find shared phrases (bigrams and trigrams) between two texts
 * Returns phrases sorted by combined frequency
 */
export declare function findSharedPhrases(text1: string, text2: string, maxCount?: number): string[];
/**
 * Reason label based on similarity characteristics
 */
export type ReasonLabel = 'same_doc' | 'very_similar' | 'related_topic' | 'loosely_related';
/**
 * Determine relationship reason based on heuristics
 * - High lexical overlap → "very_similar"
 * - Low lexical overlap + context → "related_topic"
 * - Same document → "same_doc"
 */
export declare function determineReasonLabel(text1: string, text2: string, isSameDocument: boolean, similarityScore: number): ReasonLabel;
/**
 * Explanation for why two chunks are related
 */
export interface ChunkExplanation {
    sharedKeywords: string[];
    sharedPhrases: string[];
    reasonLabel: ReasonLabel;
}
/**
 * Generate explanation for chunk relationship
 */
export declare function explainChunkSimilarity(sourceText: string, targetText: string, isSameDocument: boolean, similarityScore: number): ChunkExplanation;
//# sourceMappingURL=keywords.d.ts.map