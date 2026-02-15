/**
 * Remote MCP transport: Streamable HTTP + SSE (backwards-compat)
 *
 * Allows RAG Vault to be connected from Claude.ai, Claude Desktop,
 * or any MCP client that supports remote servers.
 *
 * Usage:
 *   npx github:RobThePCGuy/rag-vault --remote          # starts on port 3001
 *   npx github:RobThePCGuy/rag-vault --remote --port 8080
 */

import express, { type Request, type Response } from 'express'
import { randomUUID } from 'node:crypto'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'

// =============================================================================
// TYPES
// =============================================================================

export interface RemoteTransportOptions {
  /** Port to listen on (default: 3001, or WEB_PORT env) */
  port?: number
  /** Factory that returns a fresh McpServer per session */
  createServer: () => McpServer
  /** Optional API key for authentication (uses RAG_API_KEY env if not set) */
  apiKey?: string
  /** Allowed CORS origins (default: "*" for dev, restrict in production) */
  corsOrigins?: string | string[]
}

// =============================================================================
// TRANSPORT SETUP
// =============================================================================

/**
 * Starts the MCP server with Streamable HTTP + SSE transports.
 *
 *   POST/GET/DELETE /mcp  -> Streamable HTTP (modern clients)
 *   GET  /sse             -> SSE endpoint (legacy clients)
 *   POST /messages        -> SSE message endpoint (legacy clients)
 *   GET  /health          -> Health check
 */
export async function startRemoteTransport(options: RemoteTransportOptions): Promise<void> {
  const {
    createServer,
    port = Number.parseInt(process.env['WEB_PORT'] || '3001', 10),
    apiKey = process.env['RAG_API_KEY'],
    corsOrigins = process.env['CORS_ORIGINS'] || '*',
  } = options

  const app = express()
  app.use(express.json())

  // ---------------------------------------------------------------------------
  // CORS - required for Claude.ai to connect
  // ---------------------------------------------------------------------------
  app.use((_req, res, next) => {
    const origin = Array.isArray(corsOrigins) ? corsOrigins.join(', ') : corsOrigins
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id')
    res.header('Access-Control-Expose-Headers', 'Mcp-Session-Id')
    next()
  })

  // Handle preflight separately to avoid return-type issues
  app.options('{*path}', (_req, res) => {
    res.sendStatus(204)
  })

  // ---------------------------------------------------------------------------
  // Optional: API Key Authentication
  // ---------------------------------------------------------------------------
  const authMiddleware = (req: Request, res: Response, next: () => void) => {
    if (!apiKey) return next()

    const authHeader = req.headers.authorization
    if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    next()
  }

  // ---------------------------------------------------------------------------
  // Session tracking
  // ---------------------------------------------------------------------------
  const sessions = new Map<
    string,
    {
      transport: StreamableHTTPServerTransport | SSEServerTransport
      server: McpServer
    }
  >()

  // ---------------------------------------------------------------------------
  // 1. STREAMABLE HTTP TRANSPORT (modern - recommended)
  // ---------------------------------------------------------------------------

  app.post('/mcp', authMiddleware, async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined

    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!
      const transport = session.transport as StreamableHTTPServerTransport
      await transport.handleRequest(req, res, req.body)
    } else if (!sessionId && isInitializeRequest(req.body)) {
      const server = createServer()
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          sessions.set(newSessionId, { transport, server })
        },
      })

      res.on('close', () => {
        const sid = (transport as unknown as { sessionId?: string }).sessionId
        if (sid) sessions.delete(sid)
        transport.close()
        server.close()
      })

      // biome-ignore lint/suspicious/noExplicitAny: McpServer.connect accepts Transport but TS exact-optional mismatch
      await server.connect(transport as any)
      await transport.handleRequest(req, res, req.body)
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session' },
        id: null,
      })
    }
  })

  app.get('/mcp', authMiddleware, async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!
      const transport = session.transport as StreamableHTTPServerTransport
      await transport.handleRequest(req, res)
    } else {
      res.status(400).json({ error: 'No valid session for GET' })
    }
  })

  app.delete('/mcp', authMiddleware, async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!
      sessions.delete(sessionId)
      session.transport.close()
      session.server.close()
      res.status(200).json({ message: 'Session closed' })
    } else {
      res.status(404).json({ error: 'Session not found' })
    }
  })

  // ---------------------------------------------------------------------------
  // 2. SSE TRANSPORT (legacy - backwards compatibility)
  // ---------------------------------------------------------------------------

  app.get('/sse', authMiddleware, async (_req: Request, res: Response) => {
    const transport = new SSEServerTransport('/messages', res)
    const server = createServer()

    sessions.set(transport.sessionId, { transport, server })

    res.on('close', () => {
      sessions.delete(transport.sessionId)
      server.close()
    })

    // biome-ignore lint/suspicious/noExplicitAny: McpServer.connect accepts Transport but TS exact-optional mismatch
    await server.connect(transport as any)
  })

  app.post('/messages', authMiddleware, async (req: Request, res: Response) => {
    const sessionId = req.query['sessionId'] as string
    const session = sessions.get(sessionId)

    if (session && session.transport instanceof SSEServerTransport) {
      await session.transport.handlePostMessage(req, res)
    } else {
      res.status(404).json({ error: 'Session not found' })
    }
  })

  // ---------------------------------------------------------------------------
  // 3. HEALTH CHECK
  // ---------------------------------------------------------------------------
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      transport: 'streamable-http + sse',
      sessions: sessions.size,
    })
  })

  // ---------------------------------------------------------------------------
  // START
  // ---------------------------------------------------------------------------
  app.listen(port, () => {
    console.error(`RAG Vault MCP server (remote) listening on port ${port}`)
    console.error(`  Streamable HTTP: http://localhost:${port}/mcp`)
    console.error(`  SSE (legacy):    http://localhost:${port}/sse`)
    console.error(`  Health check:    http://localhost:${port}/health`)
    console.error()
    console.error('To connect from Claude.ai or Claude Desktop:')
    console.error(`  URL: http://localhost:${port}/mcp`)
    if (apiKey) {
      console.error('  Auth: Bearer token required (RAG_API_KEY is set)')
    } else {
      console.error('  Auth: None (set RAG_API_KEY for production)')
    }
  })
}
