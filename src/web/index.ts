#!/usr/bin/env node
// Entry point for RAG Web Server

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildRAGConfig, validateAllowedScanRoots, validateRAGConfig } from '../utils/config.js'
import {
  onShutdown,
  setupGracefulShutdown,
  setupProcessHandlers,
} from '../utils/process-handlers.js'
import { stopRateLimiterCleanup } from './middleware/index.js'

// Setup global error handlers
setupProcessHandlers()

// Setup graceful shutdown
setupGracefulShutdown()

// Register rate limiter cleanup for graceful shutdown
onShutdown(() => {
  console.error('Cleaning up rate limiter...')
  stopRateLimiterCleanup()
})

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as NodeJS.ErrnoException).code === 'string'
  )
}

/**
 * Entry point - Start RAG Web Server
 */
async function main(): Promise<void> {
  const port = Number.parseInt(process.env['WEB_PORT'] || '3000', 10)

  try {
    // Dynamic imports to avoid loading heavy modules at CLI parse time
    const { RAGServer } = await import('../server/index.js')
    const { createHttpServerWithManager, startServer } = await import('./http-server.js')
    const { DatabaseManager } = await import('./database-manager.js')

    // Configuration from environment
    const uploadDir = process.env['UPLOAD_DIR'] || './uploads/'

    // Determine static files directory
    // Check multiple locations: cwd for dev, package dir for npx/global install
    let staticDir: string | undefined
    const cwd = process.cwd()
    // import.meta.url points to dist/web/ when compiled, so go up to package root
    const currentDir = path.dirname(fileURLToPath(import.meta.url))
    const packageDir = path.resolve(currentDir, '../..')

    const possiblePaths = [
      path.resolve(cwd, 'web-ui/dist'), // Dev: running from repo root
      path.resolve(packageDir, 'web-ui/dist'), // npx/global: relative to package
      path.resolve(cwd, 'dist/web-ui'), // Legacy prod path
    ]

    // Find first existing path
    for (const p of possiblePaths) {
      if (existsSync(p)) {
        staticDir = p
        break
      }
    }

    // Build and validate RAG config from environment
    const config = buildRAGConfig()
    validateRAGConfig(config)

    // Validate allowed scan roots (logs warnings for non-existent paths)
    validateAllowedScanRoots()

    console.log('Starting RAG Web Server...')
    console.log('Configuration:', { ...config, port, uploadDir, staticDir })

    // Create DatabaseManager with server factory
    const { dbPath, ...baseConfig } = config
    const dbManager = new DatabaseManager((cfg) => new RAGServer(cfg), baseConfig)

    // Initialize with the configured database
    await dbManager.initialize(dbPath)

    // Create and start HTTP server with DatabaseManager
    const httpConfig: Parameters<typeof createHttpServerWithManager>[1] = {
      port,
      uploadDir,
    }
    if (staticDir !== undefined) {
      httpConfig.staticDir = staticDir
    }

    const app = await createHttpServerWithManager(dbManager, httpConfig)

    await startServer(app, port)

    console.log('RAG Web Server started successfully')
    if (staticDir) {
      console.log(`Serving UI from: ${staticDir}`)
    } else {
      console.log('No UI build found. Run "pnpm ui:build" to build the frontend.')
    }
  } catch (error) {
    if (isErrnoException(error) && error.code === 'EADDRINUSE') {
      console.error(
        `Port ${port} is already in use. Close the other RAG Vault web server or run with a different port (example: WEB_PORT=3001 npx @robthepcguy/rag-vault web).`
      )
      process.exit(1)
    }
    console.error('Failed to start RAG Web Server:', error)
    process.exit(1)
  }
}

// Execute main with error handling to prevent unhandled rejections
main().catch((error) => {
  console.error('Fatal error during startup:', error)
  process.exit(1)
})
