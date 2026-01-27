// Tests for rate limiting middleware

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'
import {
  createRateLimiter,
  stopRateLimiterCleanup,
  getRateLimitConfigFromEnv,
} from '../rate-limit.js'

// Mock Express request/response
function createMockReq(ip = '127.0.0.1'): Partial<Request> {
  return {
    ip,
    socket: { remoteAddress: ip } as any,
  }
}

function createMockRes(): {
  res: Partial<Response>
  headers: Record<string, string | number>
} {
  const headers: Record<string, string | number> = {}

  const res: Partial<Response> = {
    status() {
      return this as Response
    },
    json() {
      return this as Response
    },
    setHeader(name: string, value: string | number) {
      headers[name] = value
      return this as Response
    },
  }

  return { res, headers }
}

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    stopRateLimiterCleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('createRateLimiter', () => {
    it('should allow requests under the limit', () => {
      const rateLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 5 })
      const req = createMockReq()
      const mockRes = createMockRes()
      const next = vi.fn()

      // Make 5 requests (at limit)
      for (let i = 0; i < 5; i++) {
        rateLimiter(req as Request, mockRes.res as Response, next)
      }

      expect(next).toHaveBeenCalledTimes(5)
    })

    it('should block requests over the limit', () => {
      const rateLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 2 })
      const req = createMockReq()
      let statusCode: number | null = null
      let jsonData: any = null
      const headers: Record<string, string | number> = {}

      const res: Partial<Response> = {
        status(code: number) {
          statusCode = code
          return this as Response
        },
        json(data: any) {
          jsonData = data
          return this as Response
        },
        setHeader(name: string, value: string | number) {
          headers[name] = value
          return this as Response
        },
      }
      const next = vi.fn()

      // Make 3 requests (over limit of 2)
      rateLimiter(req as Request, res as Response, next)
      rateLimiter(req as Request, res as Response, next)
      rateLimiter(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledTimes(2)
      expect(statusCode).toBe(429)
      expect(jsonData).toEqual({
        error: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: expect.any(Number),
      })
    })

    it('should set rate limit headers', () => {
      const rateLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 10 })
      const req = createMockReq()
      const headers: Record<string, string | number> = {}

      const res: Partial<Response> = {
        status() {
          return this as Response
        },
        json() {
          return this as Response
        },
        setHeader(name: string, value: string | number) {
          headers[name] = value
          return this as Response
        },
      }
      const next = vi.fn()

      rateLimiter(req as Request, res as Response, next)

      expect(headers['X-RateLimit-Limit']).toBe(10)
      expect(headers['X-RateLimit-Remaining']).toBe(9)
      expect(headers['X-RateLimit-Reset']).toBeDefined()
    })

    it('should track different IPs separately', () => {
      const rateLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 2 })
      const req1 = createMockReq('192.168.1.1')
      const req2 = createMockReq('192.168.1.2')
      const headers: Record<string, string | number> = {}

      const res: Partial<Response> = {
        status() {
          return this as Response
        },
        json() {
          return this as Response
        },
        setHeader(name: string, value: string | number) {
          headers[name] = value
          return this as Response
        },
      }
      const next = vi.fn()

      // IP 1: 2 requests (at limit)
      rateLimiter(req1 as Request, res as Response, next)
      rateLimiter(req1 as Request, res as Response, next)

      // IP 2: Should still be allowed
      rateLimiter(req2 as Request, res as Response, next)

      expect(next).toHaveBeenCalledTimes(3)
    })

    it('should reset after window expires', () => {
      const windowMs = 60000
      const rateLimiter = createRateLimiter({ windowMs, maxRequests: 2 })
      const req = createMockReq()
      const headers: Record<string, string | number> = {}

      const res: Partial<Response> = {
        status() {
          return this as Response
        },
        json() {
          return this as Response
        },
        setHeader(name: string, value: string | number) {
          headers[name] = value
          return this as Response
        },
      }
      const next = vi.fn()

      // Use up the limit
      rateLimiter(req as Request, res as Response, next)
      rateLimiter(req as Request, res as Response, next)
      rateLimiter(req as Request, res as Response, next) // blocked

      expect(next).toHaveBeenCalledTimes(2)

      // Advance time past window
      vi.advanceTimersByTime(windowMs + 1)

      // Should be allowed again
      rateLimiter(req as Request, res as Response, next)
      expect(next).toHaveBeenCalledTimes(3)
    })
  })

  describe('stopRateLimiterCleanup', () => {
    it('should be safe to call multiple times', () => {
      createRateLimiter({ windowMs: 60000, maxRequests: 10 })
      stopRateLimiterCleanup()
      stopRateLimiterCleanup() // Should not throw
      stopRateLimiterCleanup() // Should not throw
    })

    it('should be safe to call without creating limiter', () => {
      stopRateLimiterCleanup() // Should not throw
    })
  })

  describe('getRateLimitConfigFromEnv', () => {
    it('should use default values when env vars not set', () => {
      const config = getRateLimitConfigFromEnv()
      expect(config.windowMs).toBe(60000)
      expect(config.maxRequests).toBe(100)
    })

    it('should use env vars when set', () => {
      process.env['RATE_LIMIT_WINDOW_MS'] = '120000'
      process.env['RATE_LIMIT_MAX_REQUESTS'] = '50'

      const config = getRateLimitConfigFromEnv()
      expect(config.windowMs).toBe(120000)
      expect(config.maxRequests).toBe(50)

      delete process.env['RATE_LIMIT_WINDOW_MS']
      delete process.env['RATE_LIMIT_MAX_REQUESTS']
    })

    it('should use defaults for invalid env var values', () => {
      process.env['RATE_LIMIT_WINDOW_MS'] = 'invalid'
      process.env['RATE_LIMIT_MAX_REQUESTS'] = 'notanumber'

      const config = getRateLimitConfigFromEnv()
      expect(config.windowMs).toBe(60000)
      expect(config.maxRequests).toBe(100)

      delete process.env['RATE_LIMIT_WINDOW_MS']
      delete process.env['RATE_LIMIT_MAX_REQUESTS']
    })
  })
})
