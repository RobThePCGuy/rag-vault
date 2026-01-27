// Request logging middleware for audit trail

import type { NextFunction, Request, Response } from 'express'

/**
 * Log entry structure
 */
export interface RequestLogEntry {
  timestamp: string
  method: string
  path: string
  statusCode: number
  responseTime: number
  clientIp: string
  userAgent: string
  contentLength?: number
}

/**
 * Logger function type
 */
export type LoggerFn = (entry: RequestLogEntry) => void

/**
 * Default logger - outputs to stderr in structured format
 */
const defaultLogger: LoggerFn = (entry) => {
  const logLine = [
    `[${entry.timestamp}]`,
    entry.method,
    entry.path,
    entry.statusCode,
    `${entry.responseTime}ms`,
    entry.clientIp,
  ].join(' ')

  console.error(logLine)
}

/**
 * Request logging configuration
 */
export interface RequestLoggerConfig {
  /** Custom logger function */
  logger?: LoggerFn
  /** Skip logging for certain paths (e.g., health checks) */
  skip?: (req: Request) => boolean
  /** Include request body in logs (careful with sensitive data) */
  includeBody?: boolean
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
export function createRequestLogger(config: RequestLoggerConfig = {}) {
  const { logger = defaultLogger, skip } = config

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip logging if configured
    if (skip?.(req)) {
      next()
      return
    }

    const startTime = Date.now()

    // Capture response finish
    res.on('finish', () => {
      const entry: RequestLogEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        responseTime: Date.now() - startTime,
        clientIp: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      }

      // Add content length if available
      const contentLength = res.get('content-length')
      if (contentLength) {
        entry.contentLength = Number.parseInt(contentLength, 10)
      }

      logger(entry)
    })

    next()
  }
}

/**
 * Check if request logging is enabled via environment variable
 *
 * Enable with: REQUEST_LOGGING=true
 */
export function isRequestLoggingEnabled(): boolean {
  const envValue = process.env['REQUEST_LOGGING']
  return envValue === 'true' || envValue === '1'
}
