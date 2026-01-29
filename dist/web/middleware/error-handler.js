"use strict";
// Express error handling middleware
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
const index_js_1 = require("../../errors/index.js");
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
function errorHandler(err, _req, res, _next) {
    // Log the error
    console.error('Request error:', err);
    // Build error response
    const response = {
        error: err.message,
    };
    let statusCode = 500;
    if (err instanceof index_js_1.RAGError) {
        statusCode = err.statusCode;
        response.code = err.code;
        // Only include details in non-production
        if (process.env['NODE_ENV'] !== 'production' && err.details) {
            response.details = err.details;
        }
    }
    else {
        // For generic errors in production, use generic message
        if (process.env['NODE_ENV'] === 'production') {
            response.error = 'Internal server error';
        }
    }
    res.status(statusCode).json(response);
}
/**
 * 404 Not Found handler
 */
function notFoundHandler(_req, res) {
    res.status(404).json({ error: 'Not found' });
}
//# sourceMappingURL=error-handler.js.map