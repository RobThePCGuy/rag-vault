// Tests for math utility functions

import { describe, expect, it } from 'vitest'
import { cosineSimilarity, dotProduct } from '../math.js'

describe('Math Utilities', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec = [1, 2, 3]
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0, 5)
    })

    it('should return 0 for orthogonal vectors', () => {
      const vec1 = [1, 0, 0]
      const vec2 = [0, 1, 0]
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0.0, 5)
    })

    it('should return -1 for opposite vectors', () => {
      const vec1 = [1, 0, 0]
      const vec2 = [-1, 0, 0]
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(-1.0, 5)
    })

    it('should handle vectors of different magnitudes', () => {
      const vec1 = [1, 0, 0]
      const vec2 = [10, 0, 0]
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(1.0, 5)
    })

    it('should return 0 for empty vectors', () => {
      expect(cosineSimilarity([], [])).toBe(0)
    })

    it('should return 0 for vectors of different lengths', () => {
      expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0)
    })

    it('should return 0 for zero vectors', () => {
      expect(cosineSimilarity([0, 0, 0], [0, 0, 0])).toBe(0)
    })

    it('should handle sparse vectors with nullish values', () => {
      const vec1 = [1, undefined as unknown as number, 3]
      const vec2 = [1, 2, 3]
      // undefined treated as 0
      const result = cosineSimilarity(vec1, vec2)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThan(1)
    })
  })

  describe('dotProduct', () => {
    it('should calculate dot product correctly', () => {
      expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(32) // 1*4 + 2*5 + 3*6
    })

    it('should return 0 for orthogonal vectors', () => {
      expect(dotProduct([1, 0], [0, 1])).toBe(0)
    })

    it('should return 0 for different length vectors', () => {
      expect(dotProduct([1, 2], [1, 2, 3])).toBe(0)
    })

    it('should handle empty vectors', () => {
      expect(dotProduct([], [])).toBe(0)
    })
  })

})
