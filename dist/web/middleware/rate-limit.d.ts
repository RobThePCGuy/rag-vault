import type { NextFunction, Request, Response } from 'express';
/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
    /** Time window in milliseconds */
    windowMs: number;
    /** Maximum requests per window */
    maxRequests: number;
    /** Message to return when rate limited */
    message?: string;
}
/**
 * Create a rate limiting middleware
 *
 * Uses client IP address for tracking. In production with proxies,
 * ensure trust proxy is configured in Express.
 *
 * @example
 * app.use('/api', createRateLimiter({ windowMs: 60000, maxRequests: 100 }))
 */
export declare function createRateLimiter(config?: Partial<RateLimitConfig>): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Get rate limit configuration from environment variables
 *
 * Environment variables:
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 60000)
 * - RATE_LIMIT_MAX_REQUESTS: Max requests per window (default: 100)
 */
export declare function getRateLimitConfigFromEnv(): RateLimitConfig;
/**
 * Stop the rate limiter cleanup interval
 *
 * Call this during graceful shutdown to prevent memory leaks.
 * Safe to call multiple times or when no interval is active.
 */
export declare function stopRateLimiterCleanup(): void;
//# sourceMappingURL=rate-limit.d.ts.map