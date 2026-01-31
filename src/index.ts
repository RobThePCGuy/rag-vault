#!/usr/bin/env node
// Entry point for RAG MCP Server

import { run as runSkillsInstall } from './bin/install-skills.js'
import { RAGServer } from './server/index.js'
import { buildRAGConfig, validateRAGConfig } from './utils/config.js'
import { setupProcessHandlers } from './utils/process-handlers.js'

// ============================================
// Subcommand Routing
// ============================================

const args = process.argv.slice(2)

// Handle "skills" subcommand
if (args[0] === 'skills') {
  if (args[1] === 'install') {
    // npx rag-vault skills install [options]
    runSkillsInstall(args.slice(2))
  } else {
    console.error('Unknown skills subcommand. Usage: npx rag-vault skills install [options]')
    console.error('Run "npx rag-vault skills install --help" for more information.')
    process.exit(1)
  }
} else if (args[0] === 'web') {
  // Handle "web" subcommand - launches HTTP server with web UI
  import('./web/index.js').catch((error) => {
    console.error('Failed to start web server:', error)
    process.exit(1)
  })
} else {
  // ============================================
  // MCP Server (default behavior)
  // ============================================
  setupProcessHandlers()
  main()
}

/**
 * Entry point - Start RAG MCP Server
 */
async function main(): Promise<void> {
  try {
    const config = buildRAGConfig()
    validateRAGConfig(config)

    console.error('Starting RAG MCP Server...')
    console.error('Configuration:', config)

    // Start RAGServer
    const server = new RAGServer(config)
    await server.initialize()
    await server.run()

    console.error('RAG MCP Server started successfully')
  } catch (error) {
    console.error('Failed to start RAG MCP Server:', error)
    process.exit(1)
  }
}
