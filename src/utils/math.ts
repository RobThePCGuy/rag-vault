// Mathematical utility functions for vector operations

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
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length || vec1.length === 0) {
    return 0
  }

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < vec1.length; i++) {
    const v1 = vec1[i] ?? 0
    const v2 = vec2[i] ?? 0
    dotProduct += v1 * v2
    norm1 += v1 * v1
    norm2 += v2 * v2
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2)
  if (denominator === 0) return 0

  return dotProduct / denominator
}

/**
 * Calculate the dot product of two vectors.
 *
 * @param vec1 - First vector
 * @param vec2 - Second vector
 * @returns Dot product value, or 0 if vectors have different lengths
 */
export function dotProduct(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    return 0
  }

  let result = 0
  for (let i = 0; i < vec1.length; i++) {
    result += (vec1[i] ?? 0) * (vec2[i] ?? 0)
  }

  return result
}
