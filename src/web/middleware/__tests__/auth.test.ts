// Tests for API key authentication middleware

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'
import { apiKeyAuth } from '../auth.js'

// Mock Express request/response
function createMockReq(headers: Record<string, string> = {}): Partial<Request> {
  return {
    headers: {
      ...headers,
    },
  }
}

function createMockRes(): {
  res: Partial<Response>
  getStatusCode: () => number | null
  getJson: () => any
} {
  let statusCode: number | null = null
  let jsonData: any = null

  const res: Partial<Response> = {
    status(code: number) {
      statusCode = code
      return this as Response
    },
    json(data: any) {
      jsonData = data
      return this as Response
    },
  }

  return {
    res,
    getStatusCode: () => statusCode,
    getJson: () => jsonData,
  }
}

describe('API Key Auth Middleware', () => {
  const originalEnv = process.env['RAG_API_KEY']

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env['RAG_API_KEY']
    } else {
      process.env['RAG_API_KEY'] = originalEnv
    }
  })

  describe('when RAG_API_KEY is not set', () => {
    beforeEach(() => {
      delete process.env['RAG_API_KEY']
    })

    it('should allow requests without authentication', () => {
      const req = createMockReq()
      const { res, getStatusCode } = createMockRes()
      const next = vi.fn()

      apiKeyAuth(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect(getStatusCode()).toBeNull()
    })
  })

  describe('when RAG_API_KEY is set', () => {
    const testApiKey = 'test-secret-key-12345'

    beforeEach(() => {
      process.env['RAG_API_KEY'] = testApiKey
    })

    it('should reject requests without any auth header', () => {
      const req = createMockReq()
      const { res, getStatusCode, getJson } = createMockRes()
      const next = vi.fn()

      apiKeyAuth(req as Request, res as Response, next)

      expect(next).not.toHaveBeenCalled()
      expect(getStatusCode()).toBe(401)
      expect(getJson()).toEqual({
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED',
        message: 'Valid API key required. Set RAG_API_KEY environment variable.',
      })
    })

    it('should accept valid Bearer token', () => {
      const req = createMockReq({ authorization: `Bearer ${testApiKey}` })
      const { res, getStatusCode } = createMockRes()
      const next = vi.fn()

      apiKeyAuth(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect(getStatusCode()).toBeNull()
    })

    it('should accept valid ApiKey token', () => {
      const req = createMockReq({ authorization: `ApiKey ${testApiKey}` })
      const { res, getStatusCode } = createMockRes()
      const next = vi.fn()

      apiKeyAuth(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect(getStatusCode()).toBeNull()
    })

    it('should accept valid X-API-Key header', () => {
      const req = createMockReq({ 'x-api-key': testApiKey })
      const { res, getStatusCode } = createMockRes()
      const next = vi.fn()

      apiKeyAuth(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect(getStatusCode()).toBeNull()
    })

    it('should reject invalid Bearer token', () => {
      const req = createMockReq({ authorization: 'Bearer wrong-key' })
      const { res, getStatusCode } = createMockRes()
      const next = vi.fn()

      apiKeyAuth(req as Request, res as Response, next)

      expect(next).not.toHaveBeenCalled()
      expect(getStatusCode()).toBe(401)
    })

    it('should reject invalid X-API-Key header', () => {
      const req = createMockReq({ 'x-api-key': 'wrong-key' })
      const { res, getStatusCode } = createMockRes()
      const next = vi.fn()

      apiKeyAuth(req as Request, res as Response, next)

      expect(next).not.toHaveBeenCalled()
      expect(getStatusCode()).toBe(401)
    })

    it('should handle case-insensitive Bearer prefix', () => {
      const req = createMockReq({ authorization: `bearer ${testApiKey}` })
      const { res, getStatusCode } = createMockRes()
      const next = vi.fn()

      apiKeyAuth(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect(getStatusCode()).toBeNull()
    })

    it('should handle malformed Authorization header', () => {
      const req = createMockReq({ authorization: 'InvalidFormat' })
      const { res, getStatusCode } = createMockRes()
      const next = vi.fn()

      apiKeyAuth(req as Request, res as Response, next)

      expect(next).not.toHaveBeenCalled()
      expect(getStatusCode()).toBe(401)
    })

    it('should prefer Authorization header over X-API-Key', () => {
      const req = createMockReq({
        authorization: `Bearer ${testApiKey}`,
        'x-api-key': 'wrong-key',
      })
      const { res, getStatusCode } = createMockRes()
      const next = vi.fn()

      apiKeyAuth(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect(getStatusCode()).toBeNull()
    })

    it('should reject keys with different lengths (timing-safe)', () => {
      // This tests that the timing-safe comparison handles different lengths
      const req = createMockReq({ authorization: 'Bearer short' })
      const { res, getStatusCode } = createMockRes()
      const next = vi.fn()

      apiKeyAuth(req as Request, res as Response, next)

      expect(next).not.toHaveBeenCalled()
      expect(getStatusCode()).toBe(401)
    })

    it('should reject keys that are longer than configured', () => {
      const req = createMockReq({
        authorization: `Bearer ${testApiKey}extra-characters`,
      })
      const { res, getStatusCode } = createMockRes()
      const next = vi.fn()

      apiKeyAuth(req as Request, res as Response, next)

      expect(next).not.toHaveBeenCalled()
      expect(getStatusCode()).toBe(401)
    })
  })
})
