"use strict";
// Express error handling middleware
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpStatus = void 0;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
const index_js_1 = require("../../errors/index.js");
/**
 * HTTP status codes for API responses
 */
var HttpStatus;
(function (HttpStatus) {
    HttpStatus[HttpStatus["OK"] = 200] = "OK";
    HttpStatus[HttpStatus["CREATED"] = 201] = "CREATED";
    HttpStatus[HttpStatus["NO_CONTENT"] = 204] = "NO_CONTENT";
    HttpStatus[HttpStatus["BAD_REQUEST"] = 400] = "BAD_REQUEST";
    HttpStatus[HttpStatus["UNAUTHORIZED"] = 401] = "UNAUTHORIZED";
    HttpStatus[HttpStatus["FORBIDDEN"] = 403] = "FORBIDDEN";
    HttpStatus[HttpStatus["NOT_FOUND"] = 404] = "NOT_FOUND";
    HttpStatus[HttpStatus["CONFLICT"] = 409] = "CONFLICT";
    HttpStatus[HttpStatus["TOO_MANY_REQUESTS"] = 429] = "TOO_MANY_REQUESTS";
    HttpStatus[HttpStatus["INTERNAL_ERROR"] = 500] = "INTERNAL_ERROR";
    HttpStatus[HttpStatus["SERVICE_UNAVAILABLE"] = 503] = "SERVICE_UNAVAILABLE";
})(HttpStatus || (exports.HttpStatus = HttpStatus = {}));
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