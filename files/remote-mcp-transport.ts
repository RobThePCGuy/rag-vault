/**
 * remote-mcp-transport.ts
 * 
 * Drop this into your rag-vault project at: src/server/remote-transport.ts
 * 
 * This adds Streamable HTTP + SSE (backwards-compat) transport to your 
 * existing MCP server, so it can be connected to remotely from Claude.ai,
 * Claude Desktop, or any MCP client that supports remote servers.
 *
 * Usage (same npx feel):
 *   npx github:RobThePCGuy/rag-vault --remote          # starts on port 3001
 *   npx github:RobThePCGuy/rag-vault --remote --port 8080
 *
 * Then in Claude.ai (Pro/Max/Team/Enterprise), add as a custom connector:
 *   URL: https://your-host:3001/mcp
 *
 * Or in Claude Desktop / Claude Code:
 *   claude mcp add --transport http rag-vault https://your-host:3001/mcp
 * 
 * For local testing with Claude Desktop (stdio still works):
 *   npx github:RobThePCGuy/rag-vault   # unchanged, still stdio
 * 
 * REQUIREMENTS:
 *   pnpm add @modelcontextprotocol/sdk@^1.10.0   (you likely already have this)
 *   pnpm add express                              (you already have this for web-ui)
 *   pnpm add cors                                 (optional, for CORS control)
 */

import express, { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

// =============================================================================
// TYPES
// =============================================================================

interface RemoteTransportOptions {
  /** Port to listen on (default: 3001, or WEB_PORT env) */
  port?: number;
  /** Your existing MCP Server factory — returns a fresh Server per session */
  createServer: () => Server;
  /** Optional API key for authentication (uses RAG_API_KEY env if not set) */
  apiKey?: string;
  /** Allowed CORS origins (default: "*" for dev, restrict in production) */
  corsOrigins?: string | string[];
}

// =============================================================================
// TRANSPORT SETUP
// =============================================================================

/**
 * Starts your MCP server with Streamable HTTP + SSE transports.
 * 
 * This creates a single Express app with:
 *   POST/GET /mcp     → Streamable HTTP (modern clients: Claude.ai, Claude Desktop)
 *   GET     /sse      → SSE endpoint (legacy clients)
 *   POST    /messages  → SSE message endpoint (legacy clients)
 *   GET     /health    → Health check
 */
export async function startRemoteTransport(options: RemoteTransportOptions) {
  const {
    createServer,
    port = parseInt(process.env.WEB_PORT || "3001", 10),
    apiKey = process.env.RAG_API_KEY,
    corsOrigins = process.env.CORS_ORIGINS || "*",
  } = options;

  const app = express();
  app.use(express.json());

  // ---------------------------------------------------------------------------
  // CORS — required for Claude.ai to connect
  // ---------------------------------------------------------------------------
  app.use((req, res, next) => {
    const origin = Array.isArray(corsOrigins) 
      ? corsOrigins.join(", ") 
      : corsOrigins;
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");
    res.header("Access-Control-Expose-Headers", "Mcp-Session-Id");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  // ---------------------------------------------------------------------------
  // Optional: API Key Authentication
  // ---------------------------------------------------------------------------
  const authMiddleware = (req: Request, res: Response, next: () => void) => {
    if (!apiKey) return next(); // No auth required if RAG_API_KEY not set

    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  // ---------------------------------------------------------------------------
  // Session tracking (shared between Streamable HTTP and SSE)
  // ---------------------------------------------------------------------------
  const sessions = new Map<
    string,
    { 
      transport: StreamableHTTPServerTransport | SSEServerTransport;
      server: Server;
    }
  >();

  // ---------------------------------------------------------------------------
  // 1. STREAMABLE HTTP TRANSPORT (modern — recommended)
  //    Single endpoint: POST /mcp and GET /mcp
  // ---------------------------------------------------------------------------
  
  // Handle POST /mcp — client sends JSON-RPC messages
  app.post("/mcp", authMiddleware, async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && sessions.has(sessionId)) {
      // Existing session — forward message
      const session = sessions.get(sessionId)!;
      const transport = session.transport as StreamableHTTPServerTransport;
      await transport.handleRequest(req, res, req.body);
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New session initialization
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          const server = createServer();
          sessions.set(newSessionId, { transport, server });
          
          // Clean up on close
          res.on("close", () => {
            sessions.delete(newSessionId);
            transport.close();
            server.close();
          });
        },
      });

      const server = createServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } else {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Bad Request: No valid session" },
        id: null,
      });
    }
  });

  // Handle GET /mcp — optional SSE stream for server-initiated messages
  app.get("/mcp", authMiddleware, async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      const transport = session.transport as StreamableHTTPServerTransport;
      await transport.handleRequest(req, res);
    } else {
      res.status(400).json({ error: "No valid session for GET" });
    }
  });

  // Handle DELETE /mcp — session teardown
  app.delete("/mcp", authMiddleware, async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      sessions.delete(sessionId);
      session.transport.close();
      session.server.close();
      res.status(200).json({ message: "Session closed" });
    } else {
      res.status(404).json({ error: "Session not found" });
    }
  });

  // ---------------------------------------------------------------------------
  // 2. SSE TRANSPORT (legacy — backwards compatibility)
  //    Two endpoints: GET /sse + POST /messages?sessionId=xxx
  // ---------------------------------------------------------------------------

  app.get("/sse", authMiddleware, async (req: Request, res: Response) => {
    const transport = new SSEServerTransport("/messages", res);
    const server = createServer();

    sessions.set(transport.sessionId, { transport, server });

    res.on("close", () => {
      sessions.delete(transport.sessionId);
      server.close();
    });

    await server.connect(transport);
  });

  app.post("/messages", authMiddleware, async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const session = sessions.get(sessionId);

    if (session && session.transport instanceof SSEServerTransport) {
      await session.transport.handlePostMessage(req, res);
    } else {
      res.status(404).json({ error: "Session not found" });
    }
  });

  // ---------------------------------------------------------------------------
  // 3. HEALTH CHECK
  // ---------------------------------------------------------------------------
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      transport: "streamable-http + sse",
      sessions: sessions.size,
    });
  });

  // ---------------------------------------------------------------------------
  // START
  // ---------------------------------------------------------------------------
  app.listen(port, () => {
    console.log(`RAG Vault MCP server (remote) listening on port ${port}`);
    console.log(`  Streamable HTTP: http://localhost:${port}/mcp`);
    console.log(`  SSE (legacy):    http://localhost:${port}/sse`);
    console.log(`  Health check:    http://localhost:${port}/health`);
    console.log();
    console.log("To connect from Claude.ai or Claude Desktop:");
    console.log(`  URL: http://localhost:${port}/mcp`);
    if (apiKey) {
      console.log(`  Auth: Bearer token required (RAG_API_KEY is set)`);
    } else {
      console.log(`  Auth: None (set RAG_API_KEY for production)`);
    }
  });

  return app;
}
