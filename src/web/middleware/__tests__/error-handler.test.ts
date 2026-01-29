// Tests for error handling middleware

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'
import { RAGError } from '../../../errors/index.js'
import { errorHandler, notFoundHandler } from '../error-handler.js'

// Mock Express request/response
function createMockReq(): Partial<Request> {
  return {}
}

function createMockRes(): {
  res: Partial<Response>
  statusCode: number | null
  jsonData: unknown
} {
  let statusCode: number | null = null
  let jsonData: unknown = null

  const res: Partial<Response> = {
    status(code: number) {
      statusCode = code
      return this as Response
    },
    json(data: unknown) {
      jsonData = data
      return this as Response
    },
  }

  return {
    res,
    get statusCode() {
      return statusCode
    },
    get jsonData() {
      return jsonData
    },
  }
}

describe('Error Handler Middleware', () => {
  const originalEnv = process.env['NODE_ENV']

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env['NODE_ENV'] = originalEnv
    vi.restoreAllMocks()
  })

  describe('errorHandler', () => {
    it('should handle RAGError with proper status code', () => {
      const req = createMockReq()
      const mock = createMockRes()
      const next = vi.fn()

      const error = new RAGError('Validation failed', {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      })

      errorHandler(error, req as Request, mock.res as Response, next)

      expect(mock.statusCode).toBe(400)
      expect(mock.jsonData).toEqual({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
      })
    })

    it('should include details in non-production for RAGError', () => {
      process.env['NODE_ENV'] = 'development'

      const req = createMockReq()
      const mock = createMockRes()
      const next = vi.fn()

      const error = new RAGError('Validation failed', {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: { field: 'query', reason: 'too short' },
      })

      errorHandler(error, req as Request, mock.res as Response, next)

      expect(mock.statusCode).toBe(400)
      expect(mock.jsonData).toEqual({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { field: 'query', reason: 'too short' },
      })
    })

    it('should hide details in production for RAGError', () => {
      process.env['NODE_ENV'] = 'production'

      const req = createMockReq()
      const mock = createMockRes()
      const next = vi.fn()

      const error = new RAGError('Validation failed', {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: { field: 'query', reason: 'too short' },
      })

      errorHandler(error, req as Request, mock.res as Response, next)

      expect(mock.statusCode).toBe(400)
      expect(mock.jsonData).toEqual({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
      })
      expect((mock.jsonData as Record<string, unknown>)['details']).toBeUndefined()
    })

    it('should handle generic errors with 500 status', () => {
      const req = createMockReq()
      const mock = createMockRes()
      const next = vi.fn()

      const error = new Error('Something went wrong')

      errorHandler(error, req as Request, mock.res as Response, next)

      expect(mock.statusCode).toBe(500)
      expect(mock.jsonData).toEqual({
        error: 'Something went wrong',
      })
    })

    it('should hide error message in production for generic errors', () => {
      process.env['NODE_ENV'] = 'production'

      const req = createMockReq()
      const mock = createMockRes()
      const next = vi.fn()

      const error = new Error('Sensitive internal details')

      errorHandler(error, req as Request, mock.res as Response, next)

      expect(mock.statusCode).toBe(500)
      expect(mock.jsonData).toEqual({
        error: 'Internal server error',
      })
    })

    it('should log errors to console', () => {
      const req = createMockReq()
      const mock = createMockRes()
      const next = vi.fn()

      const error = new Error('Test error')

      errorHandler(error, req as Request, mock.res as Response, next)

      expect(console.error).toHaveBeenCalledWith('Request error:', error)
    })

    it('should handle errors without message', () => {
      const req = createMockReq()
      const mock = createMockRes()
      const next = vi.fn()

      const error = new Error()

      errorHandler(error, req as Request, mock.res as Response, next)

      expect(mock.statusCode).toBe(500)
      expect(mock.jsonData).toHaveProperty('error')
    })
  })

  describe('notFoundHandler', () => {
    it('should return 404 with error message', () => {
      const req = createMockReq()
      const mock = createMockRes()

      notFoundHandler(req as Request, mock.res as Response)

      expect(mock.statusCode).toBe(404)
      expect(mock.jsonData).toEqual({ error: 'Not found' })
    })
  })
})
