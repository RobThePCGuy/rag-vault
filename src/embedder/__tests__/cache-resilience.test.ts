import path from 'node:path'
import { rm } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPipeline, mockEnv } = vi.hoisted(() => ({
  mockPipeline: vi.fn(),
  mockEnv: { cacheDir: '' },
}))

vi.mock('@huggingface/transformers', () => ({
  env: mockEnv,
  pipeline: mockPipeline,
}))

import { Embedder, EmbeddingError } from '../index.js'

describe('Embedder cache resilience', () => {
  const cacheDir = path.join(process.cwd(), 'tmp', 'embedder-cache-resilience')

  beforeEach(async () => {
    mockPipeline.mockReset()
    mockEnv.cacheDir = ''
    await rm(cacheDir, { recursive: true, force: true })
  })

  afterEach(async () => {
    await rm(cacheDir, { recursive: true, force: true })
  })

  it('retries with isolated recovery cache on protobuf cache corruption', async () => {
    const cacheDirs: string[] = []

    mockPipeline
      .mockImplementationOnce(async () => {
        cacheDirs.push(mockEnv.cacheDir)
        throw new Error('Protobuf parsing failed: invalid wire type')
      })
      .mockImplementationOnce(async () => {
        cacheDirs.push(mockEnv.cacheDir)
        return vi.fn().mockResolvedValue({ data: new Float32Array([0.1, 0.2]) })
      })

    const embedder = new Embedder({
      modelPath: 'Xenova/all-MiniLM-L6-v2',
      batchSize: 8,
      cacheDir,
    })

    await embedder.initialize()

    expect(mockPipeline).toHaveBeenCalledTimes(2)
    expect(cacheDirs[0]).toBe(cacheDir)
    expect(cacheDirs[1]).toContain(path.join(cacheDir, '.recovery-cache'))
    expect(cacheDirs[1]).not.toBe(cacheDirs[0])
  })

  it('does not retry for non-cache initialization failures', async () => {
    mockPipeline.mockRejectedValueOnce(new Error('network timeout'))

    const embedder = new Embedder({
      modelPath: 'Xenova/all-MiniLM-L6-v2',
      batchSize: 8,
      cacheDir,
    })

    await expect(embedder.initialize()).rejects.toBeInstanceOf(EmbeddingError)
    expect(mockPipeline).toHaveBeenCalledTimes(1)
  })

  it('surfaces recovery failure when fallback cache initialization also fails', async () => {
    mockPipeline
      .mockRejectedValueOnce(new Error('Protobuf parsing failed: invalid wire type'))
      .mockRejectedValueOnce(new Error('secondary cache initialization failed'))

    const embedder = new Embedder({
      modelPath: 'Xenova/all-MiniLM-L6-v2',
      batchSize: 8,
      cacheDir,
    })

    await expect(embedder.initialize()).rejects.toThrow(
      'Failed to initialize Embedder after cache recovery attempt'
    )
    expect(mockPipeline).toHaveBeenCalledTimes(2)
  })
})
