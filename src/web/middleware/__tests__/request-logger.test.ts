// Tests for request logging middleware

import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'
import {
  createRequestLogger,
  isRequestLoggingEnabled,
  type RequestLogEntry,
} from '../request-logger.js'

// Mock Express request
function createMockReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    method: 'GET',
    url: '/api/v1/test',
    originalUrl: '/api/v1/test',
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' } as any,
    get: vi.fn((header: string) => {
      if (header.toLowerCase() === 'user-agent') {
        return 'test-agent/1.0'
      }
      return undefined
    }) as unknown as Request['get'],
    ...overrides,
  }
}

// Mock Express response with EventEmitter for 'finish' event
function createMockRes(overrides: Partial<Response> = {}): Partial<Response> & EventEmitter {
  const emitter = new EventEmitter()

  const res = Object.assign(emitter, {
    statusCode: 200,
    get: vi.fn((header: string) => {
      if (header.toLowerCase() === 'content-length') {
        return '1234'
      }
      return undefined
    }),
    ...overrides,
  }) as Partial<Response> & EventEmitter

  return res
}

describe('Request Logger Middleware', () => {
  const originalEnv = process.env['REQUEST_LOGGING']

  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env['REQUEST_LOGGING'] = originalEnv
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('createRequestLogger', () => {
    it('should log requests with default logger', () => {
      const middleware = createRequestLogger()
      const req = createMockReq()
      const res = createMockRes()
      const next = vi.fn()

      middleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()

      // Simulate response finish
      res.emit('finish')

      expect(console.error).toHaveBeenCalled()
    })

    it('should use custom logger when provided', () => {
      const customLogger = vi.fn()
      const middleware = createRequestLogger({ logger: customLogger })
      const req = createMockReq()
      const res = createMockRes()
      const next = vi.fn()

      middleware(req as Request, res as Response, next)
      res.emit('finish')

      expect(customLogger).toHaveBeenCalled()
      expect(console.error).not.toHaveBeenCalled()
    })

    it('should log correct request details', () => {
      const customLogger = vi.fn()
      const middleware = createRequestLogger({ logger: customLogger })
      const req = createMockReq({
        method: 'POST',
        originalUrl: '/api/v1/search',
        ip: '192.168.1.100',
      })
      const res = createMockRes({ statusCode: 201 })
      const next = vi.fn()

      middleware(req as Request, res as Response, next)
      res.emit('finish')

      const logEntry: RequestLogEntry = customLogger.mock.calls[0]![0]

      expect(logEntry.method).toBe('POST')
      expect(logEntry.path).toBe('/api/v1/search')
      expect(logEntry.statusCode).toBe(201)
      expect(logEntry.clientIp).toBe('192.168.1.100')
      expect(logEntry.userAgent).toBe('test-agent/1.0')
      expect(logEntry.timestamp).toBeDefined()
      expect(logEntry.responseTime).toBeGreaterThanOrEqual(0)
    })

    it('should include content length when available', () => {
      const customLogger = vi.fn()
      const middleware = createRequestLogger({ logger: customLogger })
      const req = createMockReq()
      const res = createMockRes()
      const next = vi.fn()

      middleware(req as Request, res as Response, next)
      res.emit('finish')

      const logEntry: RequestLogEntry = customLogger.mock.calls[0]![0]
      expect(logEntry.contentLength).toBe(1234)
    })

    it('should skip logging when skip function returns true', () => {
      const customLogger = vi.fn()
      const middleware = createRequestLogger({
        logger: customLogger,
        skip: (req) => req.url === '/health',
      })
      const req = createMockReq({ url: '/health', originalUrl: '/health' })
      const res = createMockRes()
      const next = vi.fn()

      middleware(req as Request, res as Response, next)
      res.emit('finish')

      expect(next).toHaveBeenCalled()
      expect(customLogger).not.toHaveBeenCalled()
    })

    it('should not skip logging when skip function returns false', () => {
      const customLogger = vi.fn()
      const middleware = createRequestLogger({
        logger: customLogger,
        skip: (req) => req.url === '/health',
      })
      const req = createMockReq({ url: '/api/test', originalUrl: '/api/test' })
      const res = createMockRes()
      const next = vi.fn()

      middleware(req as Request, res as Response, next)
      res.emit('finish')

      expect(customLogger).toHaveBeenCalled()
    })

    it('should calculate response time correctly', () => {
      const customLogger = vi.fn()
      const middleware = createRequestLogger({ logger: customLogger })
      const req = createMockReq()
      const res = createMockRes()
      const next = vi.fn()

      middleware(req as Request, res as Response, next)

      // Advance time by 150ms
      vi.advanceTimersByTime(150)

      res.emit('finish')

      const logEntry: RequestLogEntry = customLogger.mock.calls[0]![0]
      expect(logEntry.responseTime).toBe(150)
    })

    it('should handle missing IP gracefully', () => {
      const customLogger = vi.fn()
      const middleware = createRequestLogger({ logger: customLogger })
      const req = createMockReq({
        ip: undefined,
        socket: { remoteAddress: undefined } as any,
      })
      const res = createMockRes()
      const next = vi.fn()

      middleware(req as Request, res as Response, next)
      res.emit('finish')

      const logEntry: RequestLogEntry = customLogger.mock.calls[0]![0]
      expect(logEntry.clientIp).toBe('unknown')
    })

    it('should handle missing user-agent gracefully', () => {
      const customLogger = vi.fn()
      const middleware = createRequestLogger({ logger: customLogger })
      const req = createMockReq({
        get: vi.fn(() => undefined),
      })
      const res = createMockRes()
      const next = vi.fn()

      middleware(req as Request, res as Response, next)
      res.emit('finish')

      const logEntry: RequestLogEntry = customLogger.mock.calls[0]![0]
      expect(logEntry.userAgent).toBe('unknown')
    })

    it('should use url when originalUrl is not available', () => {
      const customLogger = vi.fn()
      const middleware = createRequestLogger({ logger: customLogger })
      const baseReq = createMockReq({
        url: '/fallback-url',
      })
      // Remove originalUrl to simulate it not being available
      delete (baseReq as { originalUrl?: string }).originalUrl
      const req = baseReq
      const res = createMockRes()
      const next = vi.fn()

      middleware(req as Request, res as Response, next)
      res.emit('finish')

      const logEntry: RequestLogEntry = customLogger.mock.calls[0]![0]
      expect(logEntry.path).toBe('/fallback-url')
    })
  })

  describe('isRequestLoggingEnabled', () => {
    it('should return true when REQUEST_LOGGING is "true"', () => {
      process.env['REQUEST_LOGGING'] = 'true'
      expect(isRequestLoggingEnabled()).toBe(true)
    })

    it('should return true when REQUEST_LOGGING is "1"', () => {
      process.env['REQUEST_LOGGING'] = '1'
      expect(isRequestLoggingEnabled()).toBe(true)
    })

    it('should return false when REQUEST_LOGGING is not set', () => {
      delete process.env['REQUEST_LOGGING']
      expect(isRequestLoggingEnabled()).toBe(false)
    })

    it('should return false when REQUEST_LOGGING is "false"', () => {
      process.env['REQUEST_LOGGING'] = 'false'
      expect(isRequestLoggingEnabled()).toBe(false)
    })

    it('should return false when REQUEST_LOGGING is empty', () => {
      process.env['REQUEST_LOGGING'] = ''
      expect(isRequestLoggingEnabled()).toBe(false)
    })
  })
})
