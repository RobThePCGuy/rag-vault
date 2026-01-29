import type { NextFunction, Request, Response } from 'express';
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