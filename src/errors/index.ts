// Centralized error classes for RAG operations

/**
 * Base error class for RAG operations
 */
export class RAGError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details: Record<string, unknown> | undefined

  constructor(
    message: string,
    options: {
      code?: string
      statusCode?: number
      details?: Record<string, unknown>
      cause?: Error
    } = {}
  ) {
    super(message, options.cause ? { cause: options.cause } : undefined)
    this.name = 'RAGError'
    this.code = options.code || 'RAG_ERROR'
    this.statusCode = options.statusCode || 500
    this.details = options.details
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    }
  }
}

/**
 * Validation error for invalid input
 */
export class ValidationError extends RAGError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    const opts: {
      code: string
      statusCode: number
      details?: Record<string, unknown>
      cause?: Error
    } = {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    }
    if (details !== undefined) opts.details = details
    if (cause !== undefined) opts.cause = cause
    super(message, opts)
    this.name = 'ValidationError'
  }
}

/**
 * Get error message with optional stack trace (based on environment)
 */
export function getErrorMessage(error: Error): string {
  if (process.env['NODE_ENV'] === 'production') {
    return error.message
  }
  return error.stack || error.message
}
