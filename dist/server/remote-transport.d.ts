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
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export interface RemoteTransportOptions {
    /** Port to listen on (default: 3001, or WEB_PORT env) */
    port?: number;
    /** Factory that returns a fresh McpServer per session */
    createServer: () => McpServer;
    /** Optional API key for authentication (uses RAG_API_KEY env if not set) */
    apiKey?: string;
    /** Allowed CORS origins (default: "*" for dev, restrict in production) */
    corsOrigins?: string | string[];
}
/**
 * Starts the MCP server with Streamable HTTP + SSE transports.
 *
 *   POST/GET/DELETE /mcp  -> Streamable HTTP (modern clients)
 *   GET  /sse             -> SSE endpoint (legacy clients)
 *   POST /messages        -> SSE message endpoint (legacy clients)
 *   GET  /health          -> Health check
 */
export declare function startRemoteTransport(options: RemoteTransportOptions): Promise<void>;
//# sourceMappingURL=remote-transport.d.ts.map