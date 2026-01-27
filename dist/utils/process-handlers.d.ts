/**
 * Register a cleanup callback for graceful shutdown
 *
 * Callbacks are executed in order when SIGTERM or SIGINT is received.
 *
 * @param callback - Cleanup function to execute on shutdown
 */
export declare function onShutdown(callback: () => void | Promise<void>): void;
/**
 * Setup global process error handlers
 *
 * Handles:
 * - unhandledRejection: Logs promise rejection and exits
 * - uncaughtException: Logs exception and exits
 *
 * @param exitCode - Exit code to use on error (default: 1)
 */
export declare function setupProcessHandlers(exitCode?: number): void;
/**
 * Setup graceful shutdown handlers for SIGTERM and SIGINT
 *
 * Executes all registered cleanup callbacks before exiting.
 * Use onShutdown() to register cleanup functions.
 */
export declare function setupGracefulShutdown(): void;
//# sourceMappingURL=process-handlers.d.ts.map