// Tests for process handler utilities

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// We need to reset the module state between tests since it uses module-level guards
// Use dynamic import to get fresh module state

describe('Process Handlers', () => {
  let mockExit: ReturnType<typeof vi.fn>
  let mockOn: ReturnType<typeof vi.fn>
  let registeredHandlers: Map<string, Array<(...args: unknown[]) => unknown>>

  beforeEach(() => {
    vi.useFakeTimers()

    // Track registered handlers
    registeredHandlers = new Map()

    // Mock process.exit
    mockExit = vi.fn()
    vi.spyOn(process, 'exit').mockImplementation(mockExit as unknown as typeof process.exit)

    // Mock process.on to capture handlers
    mockOn = vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
      if (!registeredHandlers.has(event)) {
        registeredHandlers.set(event, [])
      }
      registeredHandlers.get(event)!.push(handler)
      return process
    })
    vi.spyOn(process, 'on').mockImplementation(mockOn as unknown as typeof process.on)

    // Suppress console.error during tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  describe('onShutdown', () => {
    it('should register cleanup callbacks', async () => {
      const { onShutdown } = await import('../process-handlers.js')

      const callback = vi.fn()
      onShutdown(callback)

      // Callback is registered but not called yet
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('setupProcessHandlers', () => {
    it('should register unhandledRejection and uncaughtException handlers', async () => {
      const { setupProcessHandlers } = await import('../process-handlers.js')

      setupProcessHandlers()

      expect(mockOn).toHaveBeenCalledWith('unhandledRejection', expect.any(Function))
      expect(mockOn).toHaveBeenCalledWith('uncaughtException', expect.any(Function))
    })

    it('should not register handlers twice', async () => {
      const { setupProcessHandlers } = await import('../process-handlers.js')

      setupProcessHandlers()
      const callCountAfterFirst = mockOn.mock.calls.length

      setupProcessHandlers() // Second call should be no-op

      // No additional handlers registered
      expect(mockOn.mock.calls.length).toBe(callCountAfterFirst)
    })

    it('should run cleanup callbacks on unhandled rejection', async () => {
      const { setupProcessHandlers, onShutdown } = await import('../process-handlers.js')

      const cleanupCallback = vi.fn().mockResolvedValue(undefined)
      onShutdown(cleanupCallback)

      setupProcessHandlers()

      // Trigger unhandled rejection handler
      const rejectionHandler = registeredHandlers.get('unhandledRejection')?.[0]
      expect(rejectionHandler).toBeDefined()

      // The handler is fire-and-forget with .catch(), so we need to let the async work complete
      rejectionHandler!('test reason', Promise.resolve())

      // Wait for microtasks and any pending timers
      await vi.runAllTimersAsync()

      expect(cleanupCallback).toHaveBeenCalled()
      expect(mockExit).toHaveBeenCalledWith(1)
    })

    it('should run cleanup callbacks on uncaught exception', async () => {
      const { setupProcessHandlers, onShutdown } = await import('../process-handlers.js')

      const cleanupCallback = vi.fn().mockResolvedValue(undefined)
      onShutdown(cleanupCallback)

      setupProcessHandlers()

      // Trigger uncaught exception handler
      const exceptionHandler = registeredHandlers.get('uncaughtException')?.[0]
      expect(exceptionHandler).toBeDefined()

      // The handler is fire-and-forget with .catch(), so we need to let the async work complete
      exceptionHandler!(new Error('test error'))

      // Wait for microtasks and any pending timers
      await vi.runAllTimersAsync()

      expect(cleanupCallback).toHaveBeenCalled()
      expect(mockExit).toHaveBeenCalledWith(1)
    })
  })

  describe('setupGracefulShutdown', () => {
    it('should register SIGTERM and SIGINT handlers', async () => {
      const { setupGracefulShutdown } = await import('../process-handlers.js')

      setupGracefulShutdown()

      expect(mockOn).toHaveBeenCalledWith('SIGTERM', expect.any(Function))
      expect(mockOn).toHaveBeenCalledWith('SIGINT', expect.any(Function))
    })

    it('should not register handlers twice', async () => {
      const { setupGracefulShutdown } = await import('../process-handlers.js')

      setupGracefulShutdown()
      const callCountAfterFirst = mockOn.mock.calls.length

      setupGracefulShutdown() // Second call should be no-op

      // No additional handlers registered
      expect(mockOn.mock.calls.length).toBe(callCountAfterFirst)
    })

    it('should run cleanup callbacks on SIGTERM', async () => {
      const { setupGracefulShutdown, onShutdown } = await import('../process-handlers.js')

      const cleanupCallback = vi.fn().mockResolvedValue(undefined)
      onShutdown(cleanupCallback)

      setupGracefulShutdown()

      // Trigger SIGTERM handler
      const sigtermHandler = registeredHandlers.get('SIGTERM')?.[0]
      expect(sigtermHandler).toBeDefined()

      // Start shutdown
      const shutdownPromise = sigtermHandler!()

      // Let cleanup run
      await vi.runAllTimersAsync()
      await shutdownPromise

      expect(cleanupCallback).toHaveBeenCalled()
      expect(mockExit).toHaveBeenCalledWith(0)
    })

    it('should exit with 0 on successful cleanup', async () => {
      const { setupGracefulShutdown, onShutdown } = await import('../process-handlers.js')

      const fastCallback = vi.fn().mockResolvedValue(undefined)
      onShutdown(fastCallback)

      setupGracefulShutdown()

      const sigintHandler = registeredHandlers.get('SIGINT')?.[0]
      const shutdownPromise = sigintHandler!()

      await vi.runAllTimersAsync()
      await shutdownPromise

      expect(fastCallback).toHaveBeenCalled()
      expect(mockExit).toHaveBeenCalledWith(0)
    })

    it('should prevent duplicate shutdown when signal received twice', async () => {
      const { setupGracefulShutdown, onShutdown } = await import('../process-handlers.js')

      const cleanupCallback = vi.fn().mockResolvedValue(undefined)
      onShutdown(cleanupCallback)

      setupGracefulShutdown()

      const sigintHandler = registeredHandlers.get('SIGINT')?.[0]

      // Trigger twice
      const firstPromise = sigintHandler!()
      const secondPromise = sigintHandler!()

      await vi.runAllTimersAsync()
      await firstPromise
      await secondPromise

      // Cleanup should only run once
      expect(cleanupCallback).toHaveBeenCalledTimes(1)
    })
  })

  describe('Timeout Behaviors', () => {
    it('should timeout slow cleanup callbacks after 5 seconds (CALLBACK_TIMEOUT_MS)', async () => {
      const { setupGracefulShutdown, onShutdown } = await import('../process-handlers.js')

      // A callback that never resolves
      const slowCallback = vi.fn().mockImplementation(() => new Promise(() => {}))
      const fastCallback = vi.fn().mockResolvedValue(undefined)

      onShutdown(slowCallback)
      onShutdown(fastCallback)

      setupGracefulShutdown()

      const sigintHandler = registeredHandlers.get('SIGINT')?.[0]
      const shutdownPromise = sigintHandler!()

      // Advance past the 5s individual callback timeout
      await vi.advanceTimersByTimeAsync(5001)

      // Both callbacks should have been called
      expect(slowCallback).toHaveBeenCalled()
      expect(fastCallback).toHaveBeenCalled()

      // Complete shutdown
      await vi.runAllTimersAsync()
      await shutdownPromise

      // Process should exit successfully (slow callback timed out but didn't block)
      expect(mockExit).toHaveBeenCalledWith(0)
    })

    it('should force exit after 10 seconds (CLEANUP_TIMEOUT_MS) if cleanup overall hangs', async () => {
      const { setupGracefulShutdown, onShutdown } = await import('../process-handlers.js')

      // Create multiple callbacks that never resolve - total cleanup time exceeds 10s
      // Since each callback has a 5s timeout, we need 3+ callbacks to exceed 10s total
      const hangingCallback1 = vi.fn().mockImplementation(() => new Promise(() => {}))
      const hangingCallback2 = vi.fn().mockImplementation(() => new Promise(() => {}))
      const hangingCallback3 = vi.fn().mockImplementation(() => new Promise(() => {}))

      onShutdown(hangingCallback1)
      onShutdown(hangingCallback2)
      onShutdown(hangingCallback3)

      setupGracefulShutdown()

      const sigintHandler = registeredHandlers.get('SIGINT')?.[0]
      sigintHandler!() // Don't await - we want to test the timeout

      // First callback starts, times out after 5s
      await vi.advanceTimersByTimeAsync(5001)
      expect(hangingCallback1).toHaveBeenCalled()

      // Second callback starts, but at this point we're at ~5s total
      // The overall 10s timeout fires at 10s from shutdown start
      await vi.advanceTimersByTimeAsync(5001) // Now at ~10s

      // Should force exit with code 1 because overall timeout (10s) triggered
      expect(mockExit).toHaveBeenCalledWith(1)
    })

    it('should clear forced exit timeout on successful cleanup', async () => {
      const { setupGracefulShutdown, onShutdown } = await import('../process-handlers.js')

      const fastCallback = vi.fn().mockResolvedValue(undefined)
      onShutdown(fastCallback)

      setupGracefulShutdown()

      const sigintHandler = registeredHandlers.get('SIGINT')?.[0]
      const shutdownPromise = sigintHandler!()

      // Run cleanup without waiting for force exit timeout
      await vi.runAllTimersAsync()
      await shutdownPromise

      // Should exit with 0 (successful cleanup), not 1 (forced exit)
      expect(mockExit).toHaveBeenCalledWith(0)
      expect(mockExit).toHaveBeenCalledTimes(1)
    })

    it('should continue with other callbacks even if one throws', async () => {
      const { setupGracefulShutdown, onShutdown } = await import('../process-handlers.js')

      const throwingCallback = vi.fn().mockRejectedValue(new Error('Callback error'))
      const successCallback = vi.fn().mockResolvedValue(undefined)

      onShutdown(throwingCallback)
      onShutdown(successCallback)

      setupGracefulShutdown()

      const sigintHandler = registeredHandlers.get('SIGINT')?.[0]
      const shutdownPromise = sigintHandler!()

      await vi.runAllTimersAsync()
      await shutdownPromise

      // Both callbacks should have been called
      expect(throwingCallback).toHaveBeenCalled()
      expect(successCallback).toHaveBeenCalled()

      // Process should still exit successfully
      expect(mockExit).toHaveBeenCalledWith(0)
    })

    it('should use custom exit code when specified', async () => {
      const { setupProcessHandlers, onShutdown } = await import('../process-handlers.js')

      const cleanupCallback = vi.fn().mockResolvedValue(undefined)
      onShutdown(cleanupCallback)

      setupProcessHandlers(42) // Custom exit code

      // Trigger uncaught exception handler
      const exceptionHandler = registeredHandlers.get('uncaughtException')?.[0]
      exceptionHandler!(new Error('test error'))

      await vi.runAllTimersAsync()

      expect(mockExit).toHaveBeenCalledWith(42)
    })
  })
})
