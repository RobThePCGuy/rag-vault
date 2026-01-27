import type { NextFunction, Request, Response } from 'express';
/**
 * API Key authentication middleware
 *
 * Validates requests against RAG_API_KEY environment variable.
 * If RAG_API_KEY is not set, authentication is disabled (local-only mode).
 *
 * Accepts API key via:
 * - Authorization header: "Bearer <key>" or "ApiKey <key>"
 * - X-API-Key header
 *
 * @example
 * // Enable by setting environment variable
 * RAG_API_KEY=your-secret-key npm start
 *
 * // Client usage
 * fetch('/api/v1/search', {
 *   headers: { 'Authorization': 'Bearer your-secret-key' }
 * })
 */
export declare function apiKeyAuth(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map