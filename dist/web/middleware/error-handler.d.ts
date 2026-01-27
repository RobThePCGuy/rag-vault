import type { NextFunction, Request, Response } from 'express';
/**
 * HTTP status codes for API responses
 */
export declare enum HttpStatus {
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
    SERVICE_UNAVAILABLE = 503
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
export declare function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void;
/**
 * 404 Not Found handler
 */
export declare function notFoundHandler(_req: Request, res: Response): void;
//# sourceMappingURL=error-handler.d.ts.map