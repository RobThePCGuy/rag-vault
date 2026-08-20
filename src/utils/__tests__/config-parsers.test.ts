// Tests for shared configuration parsing utilities

import { describe, expect, it } from 'vitest'
import { DEFAULT_BIND_HOST, isAllInterfacesHost, resolveBindHost } from '../config-parsers.js'

describe('resolveBindHost', () => {
  it('defaults to loopback when no host env vars are set', () => {
    expect(resolveBindHost({})).toBe('127.0.0.1')
    expect(DEFAULT_BIND_HOST).toBe('127.0.0.1')
  })

  it('uses RAG_BIND_HOST when set', () => {
    expect(resolveBindHost({ RAG_BIND_HOST: '0.0.0.0' })).toBe('0.0.0.0')
  })

  it('falls back to the RAG_HOST alias when RAG_BIND_HOST is unset', () => {
    expect(resolveBindHost({ RAG_HOST: '192.168.1.10' })).toBe('192.168.1.10')
  })

  it('prefers RAG_BIND_HOST over RAG_HOST', () => {
    expect(resolveBindHost({ RAG_BIND_HOST: '0.0.0.0', RAG_HOST: '10.0.0.1' })).toBe('0.0.0.0')
  })

  it('ignores empty or whitespace-only values and uses the default', () => {
    expect(resolveBindHost({ RAG_BIND_HOST: '' })).toBe('127.0.0.1')
    expect(resolveBindHost({ RAG_BIND_HOST: '   ' })).toBe('127.0.0.1')
  })

  it('trims surrounding whitespace', () => {
    expect(resolveBindHost({ RAG_BIND_HOST: ' 127.0.0.1 ' })).toBe('127.0.0.1')
  })
})

describe('isAllInterfacesHost', () => {
  it('is true for wildcard hosts', () => {
    expect(isAllInterfacesHost('0.0.0.0')).toBe(true)
    expect(isAllInterfacesHost('::')).toBe(true)
    expect(isAllInterfacesHost('[::]')).toBe(true)
  })

  it('is false for loopback and specific hosts', () => {
    expect(isAllInterfacesHost('127.0.0.1')).toBe(false)
    expect(isAllInterfacesHost('192.168.1.5')).toBe(false)
    expect(isAllInterfacesHost('localhost')).toBe(false)
  })
})
