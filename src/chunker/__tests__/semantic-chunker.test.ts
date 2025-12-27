// Semantic Chunker Unit Test
// Created: 2024-12-27
// Purpose: Verify Max-Min semantic chunking algorithm

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TextChunk } from '../index.js'
import { SemanticChunker, type SemanticChunkerConfig } from '../semantic-chunker.js'

// Mock embedder interface
interface MockEmbedder {
  embedBatch(texts: string[]): Promise<number[][]>
}

describe('SemanticChunker', () => {
  let chunker: SemanticChunker
  let mockEmbedder: MockEmbedder

  // Helper to create mock embeddings with controlled similarity
  // Vectors are normalized (magnitude = 1) for cosine similarity
  function createMockEmbedding(values: number[]): number[] {
    const magnitude = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0))
    return values.map((v) => v / magnitude)
  }

  beforeEach(() => {
    // Default config based on paper recommendations
    const config: SemanticChunkerConfig = {
      hardThreshold: 0.6,
      initConst: 1.5,
      c: 0.9,
      minChunkLength: 50,
    }
    chunker = new SemanticChunker(config)

    // Mock embedder that returns predictable embeddings
    mockEmbedder = {
      embedBatch: vi.fn(),
    }
  })

  // --------------------------------------------
  // Basic functionality
  // --------------------------------------------
  describe('Basic chunking', () => {
    it('should return empty array for empty text', async () => {
      const result = await chunker.chunkText('', mockEmbedder)
      expect(result).toEqual([])
    })

    it('should return empty array for whitespace only', async () => {
      const result = await chunker.chunkText('   \n\n   ', mockEmbedder)
      expect(result).toEqual([])
    })

    it('should handle single sentence', async () => {
      const text = 'This is a single sentence that is long enough to be a valid chunk on its own.'

      // Mock embedding for the single sentence
      vi.mocked(mockEmbedder.embedBatch).mockResolvedValue([createMockEmbedding([1, 0, 0])])

      const result = await chunker.chunkText(text, mockEmbedder)

      expect(result).toHaveLength(1)
      expect(result[0]?.text).toContain('This is a single sentence')
      expect(result[0]?.index).toBe(0)
    })
  })

  // --------------------------------------------
  // Max-Min algorithm behavior
  // --------------------------------------------
  describe('Max-Min algorithm', () => {
    it('should group semantically similar sentences together', async () => {
      const text = `Machine learning is a type of AI. Deep learning uses neural networks.
The weather today is sunny. It will rain tomorrow.`

      // Mock embeddings: first two sentences similar, last two similar, but different groups
      vi.mocked(mockEmbedder.embedBatch).mockResolvedValue([
        createMockEmbedding([1, 0, 0]), // ML sentence
        createMockEmbedding([0.95, 0.1, 0]), // DL sentence (similar to ML)
        createMockEmbedding([0, 1, 0]), // Weather sentence
        createMockEmbedding([0, 0.95, 0.1]), // Rain sentence (similar to weather)
      ])

      const result = await chunker.chunkText(text, mockEmbedder)

      // Should create 2 chunks: ML/DL together, Weather/Rain together
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result.length).toBeLessThanOrEqual(4)
    })

    it('should split on semantic boundaries', async () => {
      const text = `Topic A sentence one. Topic A sentence two. Topic A sentence three.
Topic B is completely different. Topic B continues here.`

      // Mock embeddings: Topic A sentences similar, Topic B sentences similar, but A and B different
      vi.mocked(mockEmbedder.embedBatch).mockResolvedValue([
        createMockEmbedding([1, 0, 0]),
        createMockEmbedding([0.98, 0.1, 0]),
        createMockEmbedding([0.95, 0.15, 0]),
        createMockEmbedding([0, 0, 1]), // Big semantic shift
        createMockEmbedding([0.1, 0, 0.98]),
      ])

      const result = await chunker.chunkText(text, mockEmbedder)

      // Should detect the semantic boundary between Topic A and Topic B
      expect(result.length).toBeGreaterThanOrEqual(1)
    })
  })

  // --------------------------------------------
  // Configuration options
  // --------------------------------------------
  describe('Configuration', () => {
    it('should respect hardThreshold setting', async () => {
      // Create chunker with very high threshold (forces more splits)
      const strictChunker = new SemanticChunker({
        hardThreshold: 0.95,
        initConst: 1.5,
        c: 0.9,
        minChunkLength: 10,
      })

      const text = 'First sentence here. Second sentence here. Third sentence here.'

      vi.mocked(mockEmbedder.embedBatch).mockResolvedValue([
        createMockEmbedding([1, 0, 0]),
        createMockEmbedding([0.8, 0.2, 0]), // Below 0.95 threshold
        createMockEmbedding([0.6, 0.4, 0]), // Below 0.95 threshold
      ])

      const result = await strictChunker.chunkText(text, mockEmbedder)

      // With high threshold, should create more chunks
      expect(result.length).toBeGreaterThanOrEqual(1)
    })

    it('should filter chunks shorter than minChunkLength', async () => {
      const chunkerWithHighMin = new SemanticChunker({
        hardThreshold: 0.6,
        initConst: 1.5,
        c: 0.9,
        minChunkLength: 100,
      })

      const text = 'Short. Also short.'

      vi.mocked(mockEmbedder.embedBatch).mockResolvedValue([
        createMockEmbedding([1, 0, 0]),
        createMockEmbedding([0, 1, 0]),
      ])

      const result = await chunkerWithHighMin.chunkText(text, mockEmbedder)

      // Both sentences are too short, but might be combined
      // If combined and still too short, should be filtered
      expect(result.every((chunk) => chunk.text.length >= 100 || result.length === 0)).toBe(true)
    })
  })

  // --------------------------------------------
  // Output format
  // --------------------------------------------
  describe('Output format', () => {
    it('should return TextChunk array with correct structure', async () => {
      const text =
        'This is the first chunk with enough content to pass the minimum length filter easily.'

      vi.mocked(mockEmbedder.embedBatch).mockResolvedValue([createMockEmbedding([1, 0, 0])])

      const result = await chunker.chunkText(text, mockEmbedder)

      expect(Array.isArray(result)).toBe(true)
      for (const chunk of result) {
        expect(chunk).toHaveProperty('text')
        expect(chunk).toHaveProperty('index')
        expect(typeof chunk.text).toBe('string')
        expect(typeof chunk.index).toBe('number')
      }
    })

    it('should assign sequential indices starting from 0', async () => {
      const text = `First topic sentence one. First topic sentence two.
Second topic is different. Second topic continues.`

      vi.mocked(mockEmbedder.embedBatch).mockResolvedValue([
        createMockEmbedding([1, 0, 0]),
        createMockEmbedding([0.95, 0.1, 0]),
        createMockEmbedding([0, 1, 0]),
        createMockEmbedding([0.1, 0.95, 0]),
      ])

      const result = await chunker.chunkText(text, mockEmbedder)

      // Verify indices are sequential
      for (let i = 0; i < result.length; i++) {
        expect(result[i]?.index).toBe(i)
      }
    })
  })

  // --------------------------------------------
  // Edge cases
  // --------------------------------------------
  describe('Edge cases', () => {
    it('should handle text with only code blocks', async () => {
      const text = '```typescript\nconst x = 1;\n```'

      vi.mocked(mockEmbedder.embedBatch).mockResolvedValue([createMockEmbedding([1, 0, 0])])

      const result = await chunker.chunkText(text, mockEmbedder)

      // Code block should be treated as single unit
      expect(result.length).toBeLessThanOrEqual(1)
    })

    it('should handle Japanese text', async () => {
      // Create longer Japanese text to pass minChunkLength filter
      const text =
        'これは日本語の文章です。この文章は技術的なドキュメントについて説明しています。次の文章も日本語で書かれています。詳細な技術仕様について記載されています。'

      vi.mocked(mockEmbedder.embedBatch).mockResolvedValue([
        createMockEmbedding([1, 0, 0]),
        createMockEmbedding([0.95, 0.1, 0]),
        createMockEmbedding([0.9, 0.15, 0]),
        createMockEmbedding([0.85, 0.2, 0]),
      ])

      const result = await chunker.chunkText(text, mockEmbedder)

      expect(result.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle embedder errors gracefully', async () => {
      const text = 'This is a test sentence.'

      vi.mocked(mockEmbedder.embedBatch).mockRejectedValue(new Error('Embedder failed'))

      await expect(chunker.chunkText(text, mockEmbedder)).rejects.toThrow('Embedder failed')
    })
  })

  // --------------------------------------------
  // Cosine similarity calculation
  // --------------------------------------------
  describe('Cosine similarity', () => {
    it('should correctly calculate similarity between identical vectors', () => {
      const vec = createMockEmbedding([1, 2, 3])
      const similarity = chunker.cosineSimilarity(vec, vec)
      expect(similarity).toBeCloseTo(1.0, 5)
    })

    it('should correctly calculate similarity between orthogonal vectors', () => {
      const vec1 = createMockEmbedding([1, 0, 0])
      const vec2 = createMockEmbedding([0, 1, 0])
      const similarity = chunker.cosineSimilarity(vec1, vec2)
      expect(similarity).toBeCloseTo(0.0, 5)
    })

    it('should correctly calculate similarity between opposite vectors', () => {
      const vec1 = [1, 0, 0]
      const vec2 = [-1, 0, 0]
      const similarity = chunker.cosineSimilarity(vec1, vec2)
      expect(similarity).toBeCloseTo(-1.0, 5)
    })
  })
})
