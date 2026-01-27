interface LogMeta {
    [key: string]: unknown;
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
export declare const logger: {
    /**
     * Debug-level logging (only when DEBUG=true or LOG_LEVEL=debug)
     */
    debug(message: string, meta?: LogMeta): void;
    /**
     * Info-level logging for normal operations
     */
    info(message: string, meta?: LogMeta): void;
    /**
     * Warning-level logging for potential issues
     */
    warn(message: string, meta?: LogMeta): void;
    /**
     * Error-level logging for failures
     */
    error(message: string, meta?: LogMeta): void;
};
export {};
//# sourceMappingURL=logger.d.ts.map