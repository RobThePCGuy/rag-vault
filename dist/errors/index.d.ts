/**
 * Base error class for RAG operations
 */
export declare class RAGError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly details: Record<string, unknown> | undefined;
    constructor(message: string, options?: {
        code?: string;
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
 * Get error message with optional stack trace (based on environment)
 */
export declare function getErrorMessage(error: Error): string;
//# sourceMappingURL=index.d.ts.map