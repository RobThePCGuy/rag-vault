#!/usr/bin/env node
// Entry point for RAG Web Server

import { existsSync } from 'node:fs'
import path from 'node:path'
import { buildRAGConfig } from '../utils/config.js'
import { setupProcessHandlers } from '../utils/process-handlers.js'

// Setup global error handlers
setupProcessHandlers()

/**
 * Entry point - Start RAG Web Server
 */
async function main(): Promise<void> {
  try {
    // Dynamic imports to avoid loading heavy modules at CLI parse time
    const { RAGServer } = await import('../server/index.js')
    const { createHttpServerWithManager, startServer } = await import('./http-server.js')
    const { DatabaseManager } = await import('./database-manager.js')

    // Configuration from environment
    const port = Number.parseInt(process.env['WEB_PORT'] || '3000', 10)
    const uploadDir = process.env['UPLOAD_DIR'] || './uploads/'

    // Determine static files directory
    // Check relative to cwd for development and relative to dist for production
    let staticDir: string | undefined
    const cwd = process.cwd()
    const devStaticPath = path.resolve(cwd, 'web-ui/dist')
    const prodStaticPath = path.resolve(cwd, 'dist/web-ui')

    // Check which exists
    if (existsSync(devStaticPath)) {
      staticDir = devStaticPath
    } else if (existsSync(prodStaticPath)) {
      staticDir = prodStaticPath
    }

    // Build RAG config from environment
    const config = buildRAGConfig()

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
    console.error('Failed to start RAG Web Server:', error)
    process.exit(1)
  }
}

// Execute main
main()
