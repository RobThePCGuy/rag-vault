"use strict";
// Centralized error classes for RAG operations
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.RAGError = void 0;
exports.getErrorMessage = getErrorMessage;
/**
 * Base error class for RAG operations
 */
class RAGError extends Error {
    constructor(message, options = {}) {
        super(message, options.cause ? { cause: options.cause } : undefined);
        this.name = 'RAGError';
        this.code = options.code || 'RAG_ERROR';
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
/**
 * Validation error for invalid input
 */
class ValidationError extends RAGError {
    constructor(message, details, cause) {
        const opts = {
            code: 'VALIDATION_ERROR',
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
/**
 * Get error message with optional stack trace (based on environment)
 */
function getErrorMessage(error) {
    if (process.env['NODE_ENV'] === 'production') {
        return error.message;
    }
    return error.stack || error.message;
}
//# sourceMappingURL=index.js.map