// Shared process error handlers
// Used by both MCP server (src/index.ts) and Web server (src/web/index.ts)

/** Cleanup callbacks registered for graceful shutdown */
const cleanupCallbacks: Array<() => void | Promise<void>> = []

/** Track if process handlers have been registered (prevent duplicate registration) */
let processHandlersRegistered = false

/** Track if graceful shutdown handlers have been registered (prevent duplicate registration) */
let gracefulShutdownRegistered = false

/** Timeout for cleanup operations (10 seconds) */
const CLEANUP_TIMEOUT_MS = 10_000

/** Timeout for individual cleanup callback (5 seconds) */
const CALLBACK_TIMEOUT_MS = 5_000

/**
 * Register a cleanup callback for graceful shutdown
 *
 * Callbacks are executed in order when SIGTERM or SIGINT is received.
 *
 * @param callback - Cleanup function to execute on shutdown
 */
export function onShutdown(callback: () => void | Promise<void>): void {
  cleanupCallbacks.push(callback)
}

/**
 * Run all cleanup callbacks with timeout protection
 * @returns Promise that resolves when cleanup is done (or timeout)
 */
async function runCleanupCallbacks(): Promise<void> {
  for (const callback of cleanupCallbacks) {
    try {
      // Wrap each callback with a timeout to prevent hanging
      await Promise.race([
        callback(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Cleanup callback timeout')), CALLBACK_TIMEOUT_MS)
        ),
      ])
    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }
}

/**
 * Setup global process error handlers
 *
 * Handles:
 * - unhandledRejection: Logs promise rejection, runs cleanup, and exits
 * - uncaughtException: Logs exception, runs cleanup, and exits
 *
 * Guards against duplicate registration to prevent multiple handlers.
 *
 * @param exitCode - Exit code to use on error (default: 1)
 */
export function setupProcessHandlers(exitCode = 1): void {
  // Guard against duplicate registration
  if (processHandlersRegistered) {
    return
  }
  processHandlersRegistered = true

  const exitWithCleanup = async (reason: string, detail: unknown): Promise<void> => {
    console.error(reason, detail)
    try {
      await runCleanupCallbacks()
    } catch {
      // Ignore cleanup errors during error exit
    }
    process.exit(exitCode)
  }

  process.on('unhandledRejection', (reason, promise) => {
    // Add .catch() to handle any errors from async cleanup
    exitWithCleanup('Unhandled Rejection at:', { promise, reason }).catch((err) => {
      console.error('Error during cleanup after unhandled rejection:', err)
      process.exit(exitCode)
    })
  })

  process.on('uncaughtException', (error) => {
    // Add .catch() to handle any errors from async cleanup
    exitWithCleanup('Uncaught Exception:', error).catch((err) => {
      console.error('Error during cleanup after uncaught exception:', err)
      process.exit(exitCode)
    })
  })
}

/**
 * Setup graceful shutdown handlers for SIGTERM and SIGINT
 *
 * Executes all registered cleanup callbacks before exiting.
 * Use onShutdown() to register cleanup functions.
 * Includes a forced exit timeout to prevent hanging on slow cleanup.
 * Guards against duplicate registration to prevent multiple handlers.
 */
export function setupGracefulShutdown(): void {
  // Guard against duplicate registration
  if (gracefulShutdownRegistered) {
    return
  }
  gracefulShutdownRegistered = true

  let isShuttingDown = false

  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
      console.error('Shutdown already in progress...')
      return
    }
    isShuttingDown = true

    console.error(`Received ${signal}, shutting down gracefully...`)

    // Set up forced exit timeout (prevents hanging on slow cleanup)
    const forceExitTimeout = setTimeout(() => {
      console.error('Forced exit due to cleanup timeout')
      process.exit(1)
    }, CLEANUP_TIMEOUT_MS)
    forceExitTimeout.unref() // Don't keep process alive just for this timer

    // Execute cleanup callbacks with per-callback timeout
    await runCleanupCallbacks()

    clearTimeout(forceExitTimeout)
    console.error('Shutdown complete')
    process.exit(0)
  }

  // Add .catch() to handle any errors from async shutdown
  process.on('SIGTERM', () => {
    shutdown('SIGTERM').catch((err) => {
      console.error('Error during SIGTERM shutdown:', err)
      process.exit(1)
    })
  })
  process.on('SIGINT', () => {
    shutdown('SIGINT').catch((err) => {
      console.error('Error during SIGINT shutdown:', err)
      process.exit(1)
    })
  })
}
