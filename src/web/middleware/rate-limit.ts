// Simple in-memory rate limiting middleware

import type { NextFunction, Request, Response } from 'express'

// Track active cleanup interval for graceful shutdown
let cleanupInterval: NodeJS.Timeout | null = null

// Track if rate limiter has been created (for warning)
let rateLimiterCreated = false

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number
  /** Maximum requests per window */
  maxRequests: number
  /** Message to return when rate limited */
  message?: string
}

/**
 * Request tracking for a client
 */
interface ClientRecord {
  count: number
  resetTime: number
}

/**
 * Default rate limit configuration
 */
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  message: 'Too many requests, please try again later',
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
export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const { windowMs, maxRequests, message } = { ...DEFAULT_CONFIG, ...config }

  // Warn if rate limiter is being recreated (potential memory leak)
  if (rateLimiterCreated) {
    console.warn(
      'Rate limiter already created. Creating a new instance replaces the previous one. ' +
        'If this is intentional, call stopRateLimiterCleanup() first.'
    )
  }
  rateLimiterCreated = true

  // In-memory store for client request counts
  const clients = new Map<string, ClientRecord>()

  // Clear any existing cleanup interval before creating a new one
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
  }

  // Cleanup old entries periodically
  cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, record] of clients.entries()) {
      if (record.resetTime < now) {
        clients.delete(key)
      }
    }
  }, windowMs * 2)

  // Prevent interval from keeping process alive
  cleanupInterval.unref()

  return (req: Request, res: Response, next: NextFunction): void => {
    // Get client identifier (IP address)
    const clientId = req.ip || req.socket.remoteAddress || 'unknown'
    const now = Date.now()

    // Get or create client record
    let record = clients.get(clientId)

    if (!record || record.resetTime < now) {
      // New window
      record = { count: 1, resetTime: now + windowMs }
      clients.set(clientId, record)
    } else {
      // Increment existing window
      record.count++
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests)
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count))
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000))

    // Check if rate limited
    if (record.count > maxRequests) {
      res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      })
      return
    }

    next()
  }
}

/**
 * Get rate limit configuration from environment variables
 *
 * Environment variables:
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 60000)
 * - RATE_LIMIT_MAX_REQUESTS: Max requests per window (default: 100)
 */
export function getRateLimitConfigFromEnv(): RateLimitConfig {
  const windowMs = Number.parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '60000', 10)
  const maxRequests = Number.parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10)

  const config: RateLimitConfig = {
    windowMs: Number.isNaN(windowMs) ? DEFAULT_CONFIG.windowMs : windowMs,
    maxRequests: Number.isNaN(maxRequests) ? DEFAULT_CONFIG.maxRequests : maxRequests,
  }
  if (DEFAULT_CONFIG.message !== undefined) {
    config.message = DEFAULT_CONFIG.message
  }
  return config
}

/**
 * Stop the rate limiter cleanup interval
 *
 * Call this during graceful shutdown to prevent memory leaks.
 * Safe to call multiple times or when no interval is active.
 */
export function stopRateLimiterCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
  rateLimiterCreated = false
}
