/**
 * Error codes for type-safe error handling
 */
export declare const ErrorCodes: {
    readonly RAG_ERROR: "RAG_ERROR";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly DATABASE_ERROR: "DATABASE_ERROR";
    readonly DATABASE_CONNECTION_ERROR: "DATABASE_CONNECTION_ERROR";
    readonly DATABASE_QUERY_ERROR: "DATABASE_QUERY_ERROR";
    readonly PARSER_VALIDATION_ERROR: "PARSER_VALIDATION_ERROR";
    readonly PARSER_FILE_OPERATION_ERROR: "PARSER_FILE_OPERATION_ERROR";
    readonly PARSER_UNSUPPORTED_FORMAT: "PARSER_UNSUPPORTED_FORMAT";
    readonly EMBEDDING_ERROR: "EMBEDDING_ERROR";
    readonly EMBEDDING_MODEL_ERROR: "EMBEDDING_MODEL_ERROR";
    readonly AUTH_REQUIRED: "AUTH_REQUIRED";
    readonly AUTH_INVALID: "AUTH_INVALID";
};
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
/**
 * Base error class for RAG operations
 */
export declare class RAGError extends Error {
    readonly code: ErrorCode;
    readonly statusCode: number;
    readonly details: Record<string, unknown> | undefined;
    constructor(message: string, options?: {
        code?: ErrorCode;
        statusCode?: number;
        details?: Record<string, unknown>;
        cause?: Error;
    });
    toJSON(): Record<string, unknown>;
}
/**
 * Validation error for invalid input
 */
export declare class ValidationError extends RAGError {
    constructor(message: string, details?: Record<string, unknown>, cause?: Error);
}
/**
 * Database operation error
 */
export declare class DatabaseError extends RAGError {
    constructor(message: string, cause?: Error, code?: ErrorCode);
}
/**
 * Parser validation error (equivalent to 400)
 */
export declare class ParserValidationError extends RAGError {
    constructor(message: string, cause?: Error);
}
/**
 * Parser file operation error (equivalent to 500)
 */
export declare class ParserFileOperationError extends RAGError {
    constructor(message: string, cause?: Error);
}
/**
 * Embedding generation error
 */
export declare class EmbeddingError extends RAGError {
    constructor(message: string, cause?: Error);
}
/**
 * Get error message with optional stack trace (based on environment)
 */
export declare function getErrorMessage(error: Error): string;
/**
 * Check if an error is a RAGError instance
 * @internal - available for internal use but may be useful for consumers
 */
export declare function isRAGError(error: unknown): error is RAGError;
//# sourceMappingURL=index.d.ts.map