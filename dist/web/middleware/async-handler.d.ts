import type { NextFunction, Request, Response } from 'express';
/**
 * Async request handler type
 */
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Wraps an async route handler to automatically catch errors
 * and pass them to Express error middleware
 *
 * @example
 * router.post('/search', asyncHandler(async (req, res) => {
 *   const results = await search(req.body.query)
 *   res.json({ results })
 * }))
 */
export declare function asyncHandler(handler: AsyncHandler): AsyncHandler;
export {};
//# sourceMappingURL=async-handler.d.ts.map