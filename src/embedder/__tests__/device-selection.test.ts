import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPipeline, mockEnv } = vi.hoisted(() => ({
  mockPipeline: vi.fn(),
  mockEnv: { cacheDir: '' },
}))

vi.mock('@huggingface/transformers', () => ({
  env: mockEnv,
  pipeline: mockPipeline,
}))

import { Embedder } from '../index.js'

describe('Embedder device selection', () => {
  const originalDeviceEnv = process.env['RAG_EMBEDDING_DEVICE']

  beforeEach(() => {
    mockPipeline.mockReset()
    mockEnv.cacheDir = ''
    delete process.env['RAG_EMBEDDING_DEVICE']
    mockPipeline.mockResolvedValue(vi.fn())
  })

  afterEach(() => {
    if (originalDeviceEnv === undefined) {
      delete process.env['RAG_EMBEDDING_DEVICE']
    } else {
      process.env['RAG_EMBEDDING_DEVICE'] = originalDeviceEnv
    }
  })

  it('uses auto device by default', async () => {
    const embedder = new Embedder({
      modelPath: 'Xenova/all-MiniLM-L6-v2',
      batchSize: 8,
      cacheDir: './tmp/models',
    })

    await embedder.initialize()

    expect(mockPipeline).toHaveBeenCalledWith('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      device: 'auto',
    })
  })

  it('uses RAG_EMBEDDING_DEVICE when provided', async () => {
    process.env['RAG_EMBEDDING_DEVICE'] = 'cuda'

    const embedder = new Embedder({
      modelPath: 'Xenova/all-MiniLM-L6-v2',
      batchSize: 8,
      cacheDir: './tmp/models',
    })

    await embedder.initialize()

    expect(mockPipeline).toHaveBeenCalledWith('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      device: 'cuda',
    })
  })

  it('prefers constructor device over environment variable', async () => {
    process.env['RAG_EMBEDDING_DEVICE'] = 'cpu'

    const embedder = new Embedder({
      modelPath: 'Xenova/all-MiniLM-L6-v2',
      batchSize: 8,
      cacheDir: './tmp/models',
      device: 'dml',
    })

    await embedder.initialize()

    expect(mockPipeline).toHaveBeenCalledWith('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      device: 'dml',
    })
  })

  it('maps directml alias to dml', async () => {
    process.env['RAG_EMBEDDING_DEVICE'] = 'directml'

    const embedder = new Embedder({
      modelPath: 'Xenova/all-MiniLM-L6-v2',
      batchSize: 8,
      cacheDir: './tmp/models',
    })

    await embedder.initialize()

    expect(mockPipeline).toHaveBeenCalledWith('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      device: 'dml',
    })
  })

  it('falls back to auto for invalid values', async () => {
    process.env['RAG_EMBEDDING_DEVICE'] = 'invalid-device'
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const embedder = new Embedder({
      modelPath: 'Xenova/all-MiniLM-L6-v2',
      batchSize: 8,
      cacheDir: './tmp/models',
    })

    await embedder.initialize()

    expect(mockPipeline).toHaveBeenCalledWith('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      device: 'auto',
    })
    expect(warnSpy).toHaveBeenCalled()
  })
})
