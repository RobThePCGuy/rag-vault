// Shared process error handlers
// Used by both MCP server (src/index.ts) and Web server (src/web/index.ts)

/**
 * Setup global process error handlers
 *
 * Handles:
 * - unhandledRejection: Logs promise rejection and exits
 * - uncaughtException: Logs exception and exits
 *
 * @param exitCode - Exit code to use on error (default: 1)
 */
export function setupProcessHandlers(exitCode = 1): void {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
    process.exit(exitCode)
  })

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error)
    process.exit(exitCode)
  })
}
