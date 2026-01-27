// Express error handling middleware

import type { NextFunction, Request, Response } from 'express'
import { RAGError } from '../../errors/index.js'

/**
 * HTTP status codes for API responses
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

/**
 * Error response structure
 */
interface ErrorResponse {
  error: string
  code?: string
  details?: Record<string, unknown>
}

/**
 * Express error handling middleware
 *
 * Handles:
 * - RAGError subclasses (with proper status codes)
 * - Generic errors (500 Internal Server Error)
 *
 * In production, hides stack traces and internal details.
 *
 * @example
 * // Add as the last middleware
 * app.use(errorHandler)
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // Log the error
  console.error('Request error:', err)

  // Build error response
  const response: ErrorResponse = {
    error: err.message,
  }

  let statusCode = 500

  if (err instanceof RAGError) {
    statusCode = err.statusCode
    response.code = err.code

    // Only include details in non-production
    if (process.env['NODE_ENV'] !== 'production' && err.details) {
      response.details = err.details
    }
  } else {
    // For generic errors in production, use generic message
    if (process.env['NODE_ENV'] === 'production') {
      response.error = 'Internal server error'
    }
  }

  res.status(statusCode).json(response)
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found' })
}
