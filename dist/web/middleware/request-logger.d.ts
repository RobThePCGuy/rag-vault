import type { NextFunction, Request, Response } from 'express';
/**
 * Log entry structure
 */
export interface RequestLogEntry {
    timestamp: string;
    method: string;
    path: string;
    statusCode: number;
    responseTime: number;
    clientIp: string;
    userAgent: string;
    contentLength?: number;
}
/**
 * Logger function type
 */
export type LoggerFn = (entry: RequestLogEntry) => void;
/**
 * Request logging configuration
 */
export interface RequestLoggerConfig {
    /** Custom logger function */
    logger?: LoggerFn;
    /** Skip logging for certain paths (e.g., health checks) */
    skip?: (req: Request) => boolean;
    /** Include request body in logs (careful with sensitive data) */
    includeBody?: boolean;
}
/**
 * Create a request logging middleware
 *
 * Logs all incoming requests with timing information for audit trails.
 *
 * @example
 * app.use(createRequestLogger())
 *
 * @example
 * // With custom logger
 * app.use(createRequestLogger({
 *   logger: (entry) => myLogger.info(entry),
 *   skip: (req) => req.path === '/health'
 * }))
 */
export declare function createRequestLogger(config?: RequestLoggerConfig): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Check if request logging is enabled via environment variable
 *
 * Enable with: REQUEST_LOGGING=true
 */
export declare function isRequestLoggingEnabled(): boolean;
//# sourceMappingURL=request-logger.d.ts.map