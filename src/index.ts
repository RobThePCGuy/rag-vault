#!/usr/bin/env node
// Entry point for RAG MCP Server

import { run as runSkillsInstall } from './bin/install-skills.js'
import { RAGServer } from './server/index.js'
import { startRemoteTransport } from './server/remote-transport.js'
import { applyEmbeddingDeviceCliOverride } from './utils/embedding-device-cli.js'
import { buildRAGConfig, validateRAGConfig } from './utils/config.js'
import {
  setupProcessHandlers,
  setupGracefulShutdown,
  onShutdown,
} from './utils/process-handlers.js'

// ============================================
// Subcommand Routing
// ============================================

const rawArgs = process.argv.slice(2)

// Handle "skills" subcommand
if (rawArgs[0] === 'skills') {
  if (rawArgs[1] === 'install') {
    // npx rag-vault skills install [options]
    runSkillsInstall(rawArgs.slice(2))
  } else {
    console.error('Unknown skills subcommand. Usage: npx rag-vault skills install [options]')
    console.error('Run "npx rag-vault skills install --help" for more information.')
    process.exit(1)
  }
} else {
  let args: string[]

  try {
    args = applyEmbeddingDeviceCliOverride(rawArgs)
  } catch (error) {
    console.error(
      `Invalid CLI arguments: ${error instanceof Error ? error.message : String(error)}`
    )
    process.exit(1)
  }

  const isRemote = args.includes('--remote')

  if (args[0] === 'web') {
    // Handle "web" subcommand - launches HTTP server with web UI
    import('./web/index.js').catch((error) => {
      console.error('Failed to start web server:', error)
      process.exit(1)
    })
  } else if (isRemote) {
    // ============================================
    // Remote MCP Server (Streamable HTTP + SSE)
    // ============================================
    setupProcessHandlers()
    setupGracefulShutdown()
    mainRemote(args).catch((error) => {
      console.error('Fatal error during remote startup:', error)
      process.exit(1)
    })
  } else {
    // ============================================
    // MCP Server (default stdio behavior)
    // ============================================
    setupProcessHandlers()
    setupGracefulShutdown() // Listen for SIGTERM/SIGINT
    // Add .catch() to handle initialization errors and prevent unhandled rejections
    main().catch((error) => {
      console.error('Fatal error during startup:', error)
      process.exit(1)
    })
  }
}

/**
 * Entry point - Start RAG MCP Server (stdio)
 */
async function main(): Promise<void> {
  try {
    const config = buildRAGConfig()
    validateRAGConfig(config)

    console.error('Starting RAG MCP Server...')
    console.error('Configuration:', config)

    // Start RAGServer
    const server = new RAGServer(config)

    // Register cleanup callback for graceful shutdown
    onShutdown(async () => {
      console.error('Closing RAG server...')
      await server.close()
    })

    await server.initialize()
    await server.run()

    console.error('RAG MCP Server started successfully')
  } catch (error) {
    console.error('Failed to start RAG MCP Server:', error)
    process.exit(1)
  }
}

/**
 * Entry point - Start RAG MCP Server (remote HTTP + SSE)
 */
async function mainRemote(args: string[]): Promise<void> {
  try {
    const config = buildRAGConfig()
    validateRAGConfig(config)

    // Parse optional --port flag
    const portIdx = args.indexOf('--port')
    const portArg = portIdx !== -1 ? args[portIdx + 1] : undefined
    const port = portArg ? Number.parseInt(portArg, 10) : undefined

    console.error('Starting RAG MCP Server (remote)...')
    console.error('Configuration:', config)

    // Create and initialize a shared RAGServer for backend resources
    const ragServer = new RAGServer(config)

    onShutdown(async () => {
      console.error('Closing RAG server...')
      await ragServer.close()
    })

    await ragServer.initialize()

    // Start remote transport - creates per-session MCP servers sharing the same backend
    const transportOptions: Parameters<typeof startRemoteTransport>[0] = {
      createServer: () => ragServer.createSession(),
    }
    if (port) transportOptions.port = port
    await startRemoteTransport(transportOptions)
  } catch (error) {
    console.error('Failed to start RAG MCP Server (remote):', error)
    process.exit(1)
  }
}
