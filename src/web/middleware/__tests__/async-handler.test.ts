// Tests for async handler wrapper

import { describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'
import { asyncHandler } from '../async-handler.js'

// Mock Express request/response
function createMockReq(): Partial<Request> {
  return {}
}

function createMockRes(): Partial<Response> {
  return {
    status() {
      return this as Response
    },
    json() {
      return this as Response
    },
  }
}

describe('Async Handler', () => {
  describe('asyncHandler', () => {
    it('should call the handler and not call next on success', async () => {
      const req = createMockReq()
      const res = createMockRes()
      const next = vi.fn()

      const handler = vi.fn().mockResolvedValue(undefined)
      const wrapped = asyncHandler(handler)

      await wrapped(req as Request, res as Response, next)

      expect(handler).toHaveBeenCalledWith(req, res, next)
      expect(next).not.toHaveBeenCalled()
    })

    it('should call next with error when handler throws', async () => {
      const req = createMockReq()
      const res = createMockRes()
      const next = vi.fn()

      const error = new Error('Test error')
      const handler = vi.fn().mockRejectedValue(error)
      const wrapped = asyncHandler(handler)

      await wrapped(req as Request, res as Response, next)

      expect(handler).toHaveBeenCalledWith(req, res, next)
      expect(next).toHaveBeenCalledWith(error)
    })

    it('should handle synchronous throws', async () => {
      const req = createMockReq()
      const res = createMockRes()
      const next = vi.fn()

      const error = new Error('Sync error')
      const handler = vi.fn().mockImplementation(() => {
        throw error
      })
      const wrapped = asyncHandler(handler)

      await wrapped(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith(error)
    })

    it('should pass request and response to handler', async () => {
      const req = createMockReq() as Request
      const res = createMockRes() as Response
      const next = vi.fn()

      let receivedReq: Request | null = null
      let receivedRes: Response | null = null

      const handler = vi.fn().mockImplementation(async (r, s) => {
        receivedReq = r
        receivedRes = s
      })
      const wrapped = asyncHandler(handler)

      await wrapped(req, res, next)

      expect(receivedReq).toBe(req)
      expect(receivedRes).toBe(res)
    })

    it('should pass next function to handler', async () => {
      const req = createMockReq() as Request
      const res = createMockRes() as Response
      const next = vi.fn()

      let receivedNext: NextFunction | null = null

      const handler = vi.fn().mockImplementation(async (_r, _s, n) => {
        receivedNext = n
      })
      const wrapped = asyncHandler(handler)

      await wrapped(req, res, next)

      expect(receivedNext).toBe(next)
    })

    it('should handle handler that returns a value (ignored)', async () => {
      const req = createMockReq() as Request
      const res = createMockRes() as Response
      const next = vi.fn()

      const handler = vi.fn().mockResolvedValue({ data: 'test' })
      const wrapped = asyncHandler(handler)

      await wrapped(req, res, next)

      expect(next).not.toHaveBeenCalled()
    })
  })
})
