"use strict";
// Shared process error handlers
// Used by both MCP server (src/index.ts) and Web server (src/web/index.ts)
Object.defineProperty(exports, "__esModule", { value: true });
exports.onShutdown = onShutdown;
exports.setupProcessHandlers = setupProcessHandlers;
exports.setupGracefulShutdown = setupGracefulShutdown;
/** Cleanup callbacks registered for graceful shutdown */
const cleanupCallbacks = [];
/**
 * Register a cleanup callback for graceful shutdown
 *
 * Callbacks are executed in order when SIGTERM or SIGINT is received.
 *
 * @param callback - Cleanup function to execute on shutdown
 */
function onShutdown(callback) {
    cleanupCallbacks.push(callback);
}
/**
 * Setup global process error handlers
 *
 * Handles:
 * - unhandledRejection: Logs promise rejection and exits
 * - uncaughtException: Logs exception and exits
 *
 * @param exitCode - Exit code to use on error (default: 1)
 */
function setupProcessHandlers(exitCode = 1) {
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        process.exit(exitCode);
    });
    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        process.exit(exitCode);
    });
}
/**
 * Setup graceful shutdown handlers for SIGTERM and SIGINT
 *
 * Executes all registered cleanup callbacks before exiting.
 * Use onShutdown() to register cleanup functions.
 */
function setupGracefulShutdown() {
    let isShuttingDown = false;
    const shutdown = async (signal) => {
        if (isShuttingDown) {
            console.error('Shutdown already in progress...');
            return;
        }
        isShuttingDown = true;
        console.error(`Received ${signal}, shutting down gracefully...`);
        // Execute cleanup callbacks
        for (const callback of cleanupCallbacks) {
            try {
                await callback();
            }
            catch (error) {
                console.error('Error during cleanup:', error);
            }
        }
        console.error('Shutdown complete');
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
//# sourceMappingURL=process-handlers.js.map