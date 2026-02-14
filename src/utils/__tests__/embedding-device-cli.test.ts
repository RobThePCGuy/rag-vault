import { afterEach, describe, expect, it } from 'vitest'
import { applyEmbeddingDeviceCliOverride } from '../embedding-device-cli.js'

const ORIGINAL_DEVICE = process.env['RAG_EMBEDDING_DEVICE']

afterEach(() => {
  if (ORIGINAL_DEVICE === undefined) {
    delete process.env['RAG_EMBEDDING_DEVICE']
  } else {
    process.env['RAG_EMBEDDING_DEVICE'] = ORIGINAL_DEVICE
  }
})

describe('applyEmbeddingDeviceCliOverride', () => {
  it('keeps non-device arguments unchanged', () => {
    const args = applyEmbeddingDeviceCliOverride(['web'])
    expect(args).toEqual(['web'])
    expect(process.env['RAG_EMBEDDING_DEVICE']).toBe(ORIGINAL_DEVICE)
  })

  it('supports --embedding-device value syntax', () => {
    const args = applyEmbeddingDeviceCliOverride(['web', '--embedding-device', 'dml'])
    expect(args).toEqual(['web'])
    expect(process.env['RAG_EMBEDDING_DEVICE']).toBe('dml')
  })

  it('supports --embedding-device=value syntax', () => {
    const args = applyEmbeddingDeviceCliOverride(['--embedding-device=cpu'])
    expect(args).toEqual([])
    expect(process.env['RAG_EMBEDDING_DEVICE']).toBe('cpu')
  })

  it('supports --device=value alias', () => {
    const args = applyEmbeddingDeviceCliOverride(['--device=cuda'])
    expect(args).toEqual([])
    expect(process.env['RAG_EMBEDDING_DEVICE']).toBe('cuda')
  })

  it('supports --gpu-auto convenience flag', () => {
    const args = applyEmbeddingDeviceCliOverride(['--gpu-auto'])
    expect(args).toEqual([])
    expect(process.env['RAG_EMBEDDING_DEVICE']).toBe('auto')
  })

  it('throws when a value flag is missing a value', () => {
    expect(() => applyEmbeddingDeviceCliOverride(['--embedding-device'])).toThrow(
      'Missing value for --embedding-device'
    )
  })
})
