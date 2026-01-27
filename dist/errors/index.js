"use strict";
// Centralized error classes for RAG operations
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingError = exports.ParserFileOperationError = exports.ParserValidationError = exports.DatabaseError = exports.ValidationError = exports.RAGError = exports.ErrorCodes = void 0;
exports.getErrorMessage = getErrorMessage;
exports.isRAGError = isRAGError;
// ============================================
// Error Codes
// ============================================
/**
 * Error codes for type-safe error handling
 */
exports.ErrorCodes = {
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
};
// ============================================
// Base Error Class
// ============================================
/**
 * Base error class for RAG operations
 */
class RAGError extends Error {
    constructor(message, options = {}) {
        super(message, options.cause ? { cause: options.cause } : undefined);
        this.name = 'RAGError';
        this.code = options.code || exports.ErrorCodes.RAG_ERROR;
        this.statusCode = options.statusCode || 500;
        this.details = options.details;
    }
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            details: this.details,
        };
    }
}
exports.RAGError = RAGError;
// ============================================
// Validation Errors
// ============================================
/**
 * Validation error for invalid input
 */
class ValidationError extends RAGError {
    constructor(message, details, cause) {
        const opts = {
            code: exports.ErrorCodes.VALIDATION_ERROR,
            statusCode: 400,
        };
        if (details !== undefined)
            opts.details = details;
        if (cause !== undefined)
            opts.cause = cause;
        super(message, opts);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
// ============================================
// Database Errors
// ============================================
/**
 * Database operation error
 */
class DatabaseError extends RAGError {
    constructor(message, cause, code = exports.ErrorCodes.DATABASE_ERROR) {
        const opts = {
            code,
            statusCode: 500,
        };
        if (cause !== undefined)
            opts.cause = cause;
        super(message, opts);
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
// ============================================
// Parser Errors
// ============================================
/**
 * Parser validation error (equivalent to 400)
 */
class ParserValidationError extends RAGError {
    constructor(message, cause) {
        const opts = {
            code: exports.ErrorCodes.PARSER_VALIDATION_ERROR,
            statusCode: 400,
        };
        if (cause !== undefined)
            opts.cause = cause;
        super(message, opts);
        this.name = 'ParserValidationError';
    }
}
exports.ParserValidationError = ParserValidationError;
/**
 * Parser file operation error (equivalent to 500)
 */
class ParserFileOperationError extends RAGError {
    constructor(message, cause) {
        const opts = {
            code: exports.ErrorCodes.PARSER_FILE_OPERATION_ERROR,
            statusCode: 500,
        };
        if (cause !== undefined)
            opts.cause = cause;
        super(message, opts);
        this.name = 'ParserFileOperationError';
    }
}
exports.ParserFileOperationError = ParserFileOperationError;
// ============================================
// Embedding Errors
// ============================================
/**
 * Embedding generation error
 */
class EmbeddingError extends RAGError {
    constructor(message, cause) {
        const opts = {
            code: exports.ErrorCodes.EMBEDDING_ERROR,
            statusCode: 500,
        };
        if (cause !== undefined)
            opts.cause = cause;
        super(message, opts);
        this.name = 'EmbeddingError';
    }
}
exports.EmbeddingError = EmbeddingError;
// ============================================
// Utilities
// ============================================
/**
 * Get error message with optional stack trace (based on environment)
 */
function getErrorMessage(error) {
    if (process.env['NODE_ENV'] === 'production') {
        return error.message;
    }
    return error.stack || error.message;
}
/**
 * Check if an error is a RAGError instance
 * @internal - available for internal use but may be useful for consumers
 */
function isRAGError(error) {
    return error instanceof RAGError;
}
//# sourceMappingURL=index.js.map