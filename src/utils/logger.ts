// Centralized logging utility
// Provides structured logging with levels and optional metadata

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogMeta {
  [key: string]: unknown
}

/**
 * Format a log message with optional metadata
 */
function formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`

  if (meta && Object.keys(meta).length > 0) {
    return `${prefix} ${message} ${JSON.stringify(meta)}`
  }
  return `${prefix} ${message}`
}

/**
 * Check if debug logging is enabled
 */
function isDebugEnabled(): boolean {
  return process.env['DEBUG'] === 'true' || process.env['LOG_LEVEL'] === 'debug'
}

/**
 * Logger utility with structured output
 *
 * All output goes to stderr to avoid interfering with MCP stdio transport.
 * Use this instead of console.log/console.error directly.
 *
 * @internal - This is for internal use only, not part of public API.
 * Currently exported for future migration of console.error() calls.
 *
 * @example
 * logger.info('Server started', { port: 3000 })
 * logger.error('Failed to process', { error: err.message })
 */
export const logger = {
  /**
   * Debug-level logging (only when DEBUG=true or LOG_LEVEL=debug)
   */
  debug(message: string, meta?: LogMeta): void {
    if (isDebugEnabled()) {
      console.error(formatMessage('debug', message, meta))
    }
  },

  /**
   * Info-level logging for normal operations
   */
  info(message: string, meta?: LogMeta): void {
    console.error(formatMessage('info', message, meta))
  },

  /**
   * Warning-level logging for potential issues
   */
  warn(message: string, meta?: LogMeta): void {
    console.error(formatMessage('warn', message, meta))
  },

  /**
   * Error-level logging for failures
   */
  error(message: string, meta?: LogMeta): void {
    console.error(formatMessage('error', message, meta))
  },
}
