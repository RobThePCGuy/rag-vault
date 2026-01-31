/**
 * Reason label based on similarity characteristics
 */
type ReasonLabel = 'same_doc' | 'very_similar' | 'related_topic' | 'loosely_related';
/**
 * Explanation for why two chunks are related
 */
interface ChunkExplanation {
    sharedKeywords: string[];
    sharedPhrases: string[];
    reasonLabel: ReasonLabel;
}
/**
 * Generate explanation for chunk relationship
 */
export declare function explainChunkSimilarity(sourceText: string, targetText: string, isSameDocument: boolean, similarityScore: number): ChunkExplanation;
export {};
//# sourceMappingURL=keywords.d.ts.map