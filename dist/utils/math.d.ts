/**
 * Calculate cosine similarity between two vectors.
 *
 * Cosine similarity measures the cosine of the angle between two vectors,
 * ranging from -1 (opposite) to 1 (identical), with 0 being orthogonal.
 *
 * @param vec1 - First vector
 * @param vec2 - Second vector
 * @returns Cosine similarity value between -1 and 1, or 0 if vectors are invalid
 *
 * @example
 * ```typescript
 * const similarity = cosineSimilarity([1, 0, 0], [1, 0, 0]) // 1.0 (identical)
 * const orthogonal = cosineSimilarity([1, 0, 0], [0, 1, 0]) // 0.0 (orthogonal)
 * const opposite = cosineSimilarity([1, 0, 0], [-1, 0, 0])  // -1.0 (opposite)
 * ```
 */
export declare function cosineSimilarity(vec1: number[], vec2: number[]): number;
/**
 * Calculate the dot product of two vectors.
 *
 * @param vec1 - First vector
 * @param vec2 - Second vector
 * @returns Dot product value, or 0 if vectors have different lengths
 */
export declare function dotProduct(vec1: number[], vec2: number[]): number;
//# sourceMappingURL=math.d.ts.map