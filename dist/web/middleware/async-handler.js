"use strict";
// Express async handler wrapper
// Eliminates try/catch boilerplate in route handlers
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = asyncHandler;
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
function asyncHandler(handler) {
    return async (req, res, next) => {
        try {
            await handler(req, res, next);
        }
        catch (error) {
            next(error);
        }
    };
}
//# sourceMappingURL=async-handler.js.map