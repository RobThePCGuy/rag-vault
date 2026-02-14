# Adding Remote MCP Transport to RAG Vault

## Overview

This adds a `--remote` flag to RAG Vault so you can connect to it from Claude.ai, 
Claude Desktop, or any MCP client that supports remote servers — with the same `npx` 
experience you already have.

```bash
# Stdio (unchanged — works with Cursor, Claude Code, Codex)
npx github:RobThePCGuy/rag-vault

# Remote (new — works with Claude.ai, Claude Desktop, any HTTP MCP client)
npx github:RobThePCGuy/rag-vault --remote
npx github:RobThePCGuy/rag-vault --remote --port 8080
```

## Files to Add/Modify

### 1. Add `src/server/remote-transport.ts`

Copy `remote-mcp-transport.ts` into your project. This provides the 
`startRemoteTransport()` function that handles both Streamable HTTP (modern) 
and SSE (legacy) MCP transports on a single Express server.

### 2. Modify your entry point (src/index.ts or similar)

Your current entry point likely does something like:

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server/index.js";  // your server factory

const server = createMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
```

Add a check for the `--remote` flag:

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { startRemoteTransport } from "./server/remote-transport.js";
import { createMcpServer } from "./server/index.js";

const args = process.argv.slice(2);
const isRemote = args.includes("--remote");

if (isRemote) {
  // Parse optional --port flag
  const portIdx = args.indexOf("--port");
  const port = portIdx !== -1 ? parseInt(args[portIdx + 1], 10) : undefined;

  await startRemoteTransport({
    createServer: () => createMcpServer(),
    port,
  });
} else {
  // Original stdio behavior — completely unchanged
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
```

**Key point:** `createServer` is a factory function that returns a *new* `Server` 
instance per session. This is required because each remote client gets its own 
session. If your current code creates a single global server, you'll need to 
wrap that creation logic in a function.

### 3. Check your dependencies

You likely already have these, but verify:

```bash
pnpm add @modelcontextprotocol/sdk@latest express
```

Make sure your SDK version is ≥ 1.10.0 (that's when `StreamableHTTPServerTransport` 
was added).

### 4. Update package.json bin/scripts (optional)

If you want a dedicated command:

```json
{
  "scripts": {
    "dev": "tsx src/index.ts",
    "dev:remote": "tsx src/index.ts --remote",
    "web:dev": "tsx src/web/index.ts"
  }
}
```

## Connecting from Claude.ai

1. Go to Claude.ai Settings → Custom Connectors (requires Pro/Max/Team/Enterprise)
2. Add a new connector with URL: `https://your-host:3001/mcp`
3. If you set `RAG_API_KEY`, enter it as the Bearer token

**For local development**, you'll need to expose your local server. Options:

- **Cloudflare Tunnel** (recommended): `cloudflared tunnel --url http://localhost:3001`
- **ngrok**: `ngrok http 3001`
- Deploy to any cloud provider (Railway, Fly.io, Render, Koyeb, etc.)

## Connecting from Claude Desktop

```json
{
  "mcpServers": {
    "rag-vault-remote": {
      "type": "url",
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

Or via Claude Code CLI:

```bash
claude mcp add --transport http rag-vault http://localhost:3001/mcp
```

## Connecting from Claude.ai via the API (mcp_servers parameter)

```json
{
  "model": "claude-sonnet-4-5-20250514",
  "max_tokens": 1000,
  "messages": [{ "role": "user", "content": "Search my documents for auth info" }],
  "mcp_servers": [{
    "type": "url",
    "url": "https://your-host:3001/mcp",
    "name": "rag-vault"
  }]
}
```

## Security Considerations

For production/remote deployment:

1. **Always set `RAG_API_KEY`** — without it, anyone who can reach the URL has full access
2. **Use HTTPS** — either via a reverse proxy (nginx, Caddy) or a tunnel service
3. **Restrict CORS** — set `CORS_ORIGINS` to your specific client origins
4. **Consider OAuth** — the MCP spec supports OAuth 2.1; see the SDK docs for helpers

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │            RAG Vault Server              │
                    │                                         │
  Claude.ai ──────►│  POST/GET /mcp  → StreamableHTTP        │
                    │                    Transport             │
  Claude Desktop ──►│  GET /sse       → SSE Transport         │
  (legacy)          │  POST /messages   (backwards compat)    │
                    │                                         │
  Cursor ──────────►│  stdio          → StdioServerTransport  │
  Claude Code       │                   (unchanged)           │
                    │                                         │
                    │  ┌─────────────────────────────────┐    │
                    │  │  Same MCP tools:                 │    │
                    │  │  • ingest_file                   │    │
                    │  │  • ingest_data                   │    │
                    │  │  • query_documents               │    │
                    │  │  • list_files                    │    │
                    │  │  • delete_file                   │    │
                    │  └─────────────────────────────────┘    │
                    └─────────────────────────────────────────┘
```

All transports share the same MCP tools and document store. The only difference 
is how the client connects.
