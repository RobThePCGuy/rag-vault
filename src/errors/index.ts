// Centralized error classes for RAG operations

// ============================================
// Error Codes
// ============================================

/**
 * Error codes for type-safe error handling
 */
const ErrorCodes = {
  // General
  RAG_ERROR: 'RAG_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  DATABASE_CONNECTION_ERROR: 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR: 'DATABASE_QUERY_ERROR',

  // Parser
  PARSER_VALIDATION_ERROR: 'PARSER_VALIDATION_ERROR',
  PARSER_FILE_OPERATION_ERROR: 'PARSER_FILE_OPERATION_ERROR',
  PARSER_UNSUPPORTED_FORMAT: 'PARSER_UNSUPPORTED_FORMAT',

  // Embedding
  EMBEDDING_ERROR: 'EMBEDDING_ERROR',
  EMBEDDING_MODEL_ERROR: 'EMBEDDING_MODEL_ERROR',

  // Auth
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

// ============================================
// Base Error Class
// ============================================

/**
 * Base error class for RAG operations
 */
export class RAGError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details: Record<string, unknown> | undefined

  constructor(
    message: string,
    options: {
      code?: ErrorCode
      statusCode?: number
      details?: Record<string, unknown>
      cause?: Error
    } = {}
  ) {
    super(message, options.cause ? { cause: options.cause } : undefined)
    this.name = 'RAGError'
    this.code = options.code || ErrorCodes.RAG_ERROR
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

// ============================================
// Validation Errors
// ============================================

/**
 * Validation error for invalid input
 */
export class ValidationError extends RAGError {
  constructor(message: string, details?: Record<string, unknown>, cause?: Error) {
    const opts: {
      code: ErrorCode
      statusCode: number
      details?: Record<string, unknown>
      cause?: Error
    } = {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    }
    if (details !== undefined) opts.details = details
    if (cause !== undefined) opts.cause = cause
    super(message, opts)
    this.name = 'ValidationError'
  }
}

// ============================================
// Database Errors
// ============================================

/**
 * Database operation error
 */
export class DatabaseError extends RAGError {
  constructor(message: string, cause?: Error, code: ErrorCode = ErrorCodes.DATABASE_ERROR) {
    const opts: {
      code: ErrorCode
      statusCode: number
      cause?: Error
    } = {
      code,
      statusCode: 500,
    }
    if (cause !== undefined) opts.cause = cause
    super(message, opts)
    this.name = 'DatabaseError'
  }
}

// ============================================
// Parser Errors
// ============================================

/**
 * Parser validation error (equivalent to 400)
 */
export class ParserValidationError extends RAGError {
  constructor(message: string, cause?: Error) {
    const opts: {
      code: ErrorCode
      statusCode: number
      cause?: Error
    } = {
      code: ErrorCodes.PARSER_VALIDATION_ERROR,
      statusCode: 400,
    }
    if (cause !== undefined) opts.cause = cause
    super(message, opts)
    this.name = 'ParserValidationError'
  }
}

/**
 * Parser file operation error (equivalent to 500)
 */
export class ParserFileOperationError extends RAGError {
  constructor(message: string, cause?: Error) {
    const opts: {
      code: ErrorCode
      statusCode: number
      cause?: Error
    } = {
      code: ErrorCodes.PARSER_FILE_OPERATION_ERROR,
      statusCode: 500,
    }
    if (cause !== undefined) opts.cause = cause
    super(message, opts)
    this.name = 'ParserFileOperationError'
  }
}

// ============================================
// Embedding Errors
// ============================================

/**
 * Embedding generation error
 */
export class EmbeddingError extends RAGError {
  constructor(message: string, cause?: Error) {
    const opts: {
      code: ErrorCode
      statusCode: number
      cause?: Error
    } = {
      code: ErrorCodes.EMBEDDING_ERROR,
      statusCode: 500,
    }
    if (cause !== undefined) opts.cause = cause
    super(message, opts)
    this.name = 'EmbeddingError'
  }
}

// ============================================
// Utilities
// ============================================

/**
 * Get error message with optional stack trace (based on environment)
 */
export function getErrorMessage(error: Error): string {
  if (process.env['NODE_ENV'] === 'production') {
    return error.message
  }
  return error.stack || error.message
}
