import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPipeline, mockEnv } = vi.hoisted(() => ({
  mockPipeline: vi.fn(),
  mockEnv: { cacheDir: '' },
}))

vi.mock('@huggingface/transformers', () => ({
  env: mockEnv,
  pipeline: mockPipeline,
}))

import { Reranker } from '../index.js'

describe('Reranker', () => {
  const defaultConfig = {
    modelPath: 'Xenova/ms-marco-MiniLM-L-6-v2',
    cacheDir: './tmp/reranker-test-cache',
  }

  beforeEach(() => {
    mockPipeline.mockReset()
    mockEnv.cacheDir = ''
    delete process.env['RAG_RERANKER_DEVICE']
    delete process.env['RAG_EMBEDDING_DEVICE']
  })

  afterEach(() => {
    delete process.env['RAG_RERANKER_DEVICE']
    delete process.env['RAG_EMBEDDING_DEVICE']
  })

  describe('initialization', () => {
    it('calls pipeline with correct model and cache_dir option', async () => {
      mockPipeline.mockResolvedValue(vi.fn())

      const reranker = new Reranker(defaultConfig)
      await reranker.initialize()

      expect(mockPipeline).toHaveBeenCalledWith(
        'text-classification',
        'Xenova/ms-marco-MiniLM-L-6-v2',
        expect.objectContaining({
          device: 'auto',
          cache_dir: './tmp/reranker-test-cache',
        })
      )
      // Regression guard: env.cacheDir should never be mutated globally
      expect(mockEnv.cacheDir).toBe('')
    })

    it('only initializes once (idempotent)', async () => {
      mockPipeline.mockResolvedValue(vi.fn())

      const reranker = new Reranker(defaultConfig)
      await reranker.initialize()
      await reranker.initialize()

      expect(mockPipeline).toHaveBeenCalledTimes(1)
    })
  })

  describe('device resolution', () => {
    it('defaults to auto when no config or env var', async () => {
      mockPipeline.mockResolvedValue(vi.fn())

      const reranker = new Reranker(defaultConfig)
      await reranker.initialize()

      expect(mockPipeline).toHaveBeenCalledWith(
        'text-classification',
        expect.any(String),
        expect.objectContaining({ device: 'auto' })
      )
    })

    it('uses config.device when provided', async () => {
      mockPipeline.mockResolvedValue(vi.fn())

      const reranker = new Reranker({ ...defaultConfig, device: 'cuda' })
      await reranker.initialize()

      expect(mockPipeline).toHaveBeenCalledWith(
        'text-classification',
        expect.any(String),
        expect.objectContaining({ device: 'cuda' })
      )
    })

    it('uses RAG_RERANKER_DEVICE env var', async () => {
      process.env['RAG_RERANKER_DEVICE'] = 'dml'
      mockPipeline.mockResolvedValue(vi.fn())

      const reranker = new Reranker(defaultConfig)
      await reranker.initialize()

      expect(mockPipeline).toHaveBeenCalledWith(
        'text-classification',
        expect.any(String),
        expect.objectContaining({ device: 'dml' })
      )
    })

    it('falls back to RAG_EMBEDDING_DEVICE env var', async () => {
      process.env['RAG_EMBEDDING_DEVICE'] = 'cpu'
      mockPipeline.mockResolvedValue(vi.fn())

      const reranker = new Reranker(defaultConfig)
      await reranker.initialize()

      expect(mockPipeline).toHaveBeenCalledWith(
        'text-classification',
        expect.any(String),
        expect.objectContaining({ device: 'cpu' })
      )
    })

    it('prefers config.device over env var', async () => {
      process.env['RAG_RERANKER_DEVICE'] = 'cpu'
      mockPipeline.mockResolvedValue(vi.fn())

      const reranker = new Reranker({ ...defaultConfig, device: 'cuda' })
      await reranker.initialize()

      expect(mockPipeline).toHaveBeenCalledWith(
        'text-classification',
        expect.any(String),
        expect.objectContaining({ device: 'cuda' })
      )
    })
  })

  describe('rerank', () => {
    it('returns empty array for empty passages', async () => {
      const reranker = new Reranker(defaultConfig)
      const results = await reranker.rerank('query', [])

      expect(results).toEqual([])
      // Should not even initialize the model
      expect(mockPipeline).not.toHaveBeenCalled()
    })

    it('scores and sorts passages by relevance', async () => {
      const mockModel = vi.fn().mockResolvedValue([
        { label: 'LABEL_0', score: 0.9 },
        { label: 'LABEL_0', score: 0.1 },
        { label: 'LABEL_0', score: 0.5 },
      ])
      mockPipeline.mockResolvedValue(mockModel)

      const reranker = new Reranker(defaultConfig)
      const results = await reranker.rerank('test query', ['doc A', 'doc B', 'doc C'])

      // Sorted by score descending: index 0 (0.9), index 2 (0.5), index 1 (0.1)
      expect(results).toHaveLength(3)
      expect(results[0]!.index).toBe(0)
      expect(results[0]!.score).toBe(0.9)
      expect(results[1]!.index).toBe(2)
      expect(results[1]!.score).toBe(0.5)
      expect(results[2]!.index).toBe(1)
      expect(results[2]!.score).toBe(0.1)
    })

    it('handles non-callable model gracefully', async () => {
      // Return a non-function from pipeline
      mockPipeline.mockResolvedValue({ notAFunction: true })
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const reranker = new Reranker(defaultConfig)
      const results = await reranker.rerank('query', ['doc A', 'doc B'])

      // Graceful degradation: returns original order with score 0
      expect(results).toHaveLength(2)
      expect(results[0]!.index).toBe(0)
      expect(results[1]!.index).toBe(1)

      consoleSpy.mockRestore()
    })

    it('handles scoring errors gracefully', async () => {
      const mockModel = vi.fn().mockRejectedValue(new Error('scoring failed'))
      mockPipeline.mockResolvedValue(mockModel)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const reranker = new Reranker(defaultConfig)
      const results = await reranker.rerank('query', ['doc A', 'doc B'])

      // Graceful degradation: returns original order with score 0
      expect(results).toHaveLength(2)
      expect(results[0]!.index).toBe(0)
      expect(results[1]!.index).toBe(1)

      consoleSpy.mockRestore()
    })

    it('initializes lazily on first rerank call', async () => {
      const mockModel = vi.fn().mockResolvedValue([{ label: 'LABEL_0', score: 0.8 }])
      mockPipeline.mockResolvedValue(mockModel)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const reranker = new Reranker(defaultConfig)
      expect(mockPipeline).not.toHaveBeenCalled()

      await reranker.rerank('query', ['doc A'])
      expect(mockPipeline).toHaveBeenCalledTimes(1)

      consoleSpy.mockRestore()
    })
  })

  describe('error recovery', () => {
    it('retries with recovery cache on protobuf error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const cacheDirs: string[] = []

      mockPipeline
        .mockImplementationOnce(
          async (_task: string, _model: string, opts: Record<string, unknown>) => {
            cacheDirs.push(opts['cache_dir'] as string)
            throw new Error('Protobuf parsing failed: invalid wire type')
          }
        )
        .mockImplementationOnce(
          async (_task: string, _model: string, opts: Record<string, unknown>) => {
            cacheDirs.push(opts['cache_dir'] as string)
            return vi.fn()
          }
        )

      const reranker = new Reranker(defaultConfig)
      await reranker.initialize()

      expect(mockPipeline).toHaveBeenCalledTimes(2)
      expect(cacheDirs[0]).toBe('./tmp/reranker-test-cache')
      expect(cacheDirs[1]).toContain('.recovery-reranker')

      consoleSpy.mockRestore()
    })

    it('throws for non-recoverable errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockPipeline.mockRejectedValue(new Error('network timeout'))

      const reranker = new Reranker(defaultConfig)
      await expect(reranker.initialize()).rejects.toThrow('Failed to initialize Reranker')

      expect(mockPipeline).toHaveBeenCalledTimes(1)

      consoleSpy.mockRestore()
    })
  })
})
