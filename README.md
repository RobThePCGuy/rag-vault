# RAG Vault

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-green.svg)](https://registry.modelcontextprotocol.io/servers/io.github.RobThePCGuy/rag-vault)

**Your documents. Your machine. Your control.**

RAG Vault gives AI coding assistants fast access to your private documents such as API specs, research papers, and internal docs. Indexing and search run locally, and your data stays on your machine unless you explicitly ingest content from a remote URL.

One command to run, minimal setup, privacy by default.

## Why RAG Vault?

| Pain Point | RAG Vault Solution |
|------------|-------------------|
| "I don't want my docs on someone else's server" | Everything stays local by default. No background cloud calls for indexing or search. |
| "Semantic search misses exact code terms" | Hybrid search: meaning + exact matches like `useEffect` |
| "Setup requires Docker, Python, databases..." | One `npx` command plus a small MCP config block. |
| "Cloud APIs charge per query" | Free forever. No subscriptions. |

## Security

RAG Vault includes security features for production deployment:
- **API Authentication**: Optional API key via `RAG_API_KEY`
- **Rate Limiting**: Configurable request throttling
- **CORS Control**: Restrict allowed origins
- **Security Headers**: Helmet.js protection

See [SECURITY.md](SECURITY.md) for complete documentation.

## First-Time Setup Checklist

Before adding MCP config:

1. Install Node.js 20 or newer.
2. Pick a documents directory and set `BASE_DIR` to that path.
3. Make sure your AI tool process can read `BASE_DIR`.
4. Restart your AI tool after editing config.

## Get Started Quickly

### For Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "local-rag": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "github:RobThePCGuy/rag-vault"],
      "env": {
        "BASE_DIR": "/path/to/your/documents"
      }
    }
  }
}
```

Replace `/path/to/your/documents` with your real absolute path.

### For Claude Code

Add to `.mcp.json` in your project directory:

```json
{
  "mcpServers": {
    "local-rag": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "github:RobThePCGuy/rag-vault"],
      "env": {
        "BASE_DIR": "./documents",
        "DB_PATH": "./documents/.rag-db",
        "CACHE_DIR": "./.cache",
        "RAG_HYBRID_WEIGHT": "0.6",
        "RAG_GROUPING": "related"
      }
    }
  }
}
```

Or add inline via CLI:

```bash
claude mcp add local-rag --scope user --env BASE_DIR=/path/to/your/documents -- npx -y github:RobThePCGuy/rag-vault
```

### For Codex

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.local-rag]
command = "npx"
args = ["-y", "github:RobThePCGuy/rag-vault"]

[mcp_servers.local-rag.env]
BASE_DIR = "/path/to/your/documents"
```

### Install Skills (Optional)

For enhanced AI guidance on query formulation and result interpretation, install the RAG Vault skills:

```bash
# Claude Code (project-level - recommended for team projects)
npx github:RobThePCGuy/rag-vault skills install --claude-code

# Claude Code (user-level - available in all projects)
npx github:RobThePCGuy/rag-vault skills install --claude-code --global

# Codex (user-level)
npx github:RobThePCGuy/rag-vault skills install --codex

# Custom location
npx github:RobThePCGuy/rag-vault skills install --path /your/custom/path
```

Skills teach Claude best practices for:
- Query formulation and expansion strategies
- Score interpretation (< 0.3 = good match, > 0.5 = skip)
- When to use `ingest_file` vs `ingest_data`
- HTML ingestion and URL handling

Restart your AI tool, and start talking:

```
You: "Ingest api-spec.pdf"
AI:  Successfully ingested api-spec.pdf (47 chunks)

You: "How does authentication work?"
AI:  Based on section 3.2, authentication uses OAuth 2.0 with JWT tokens...
```

That's it. No Docker. No Python. No server infrastructure to manage.

## Web Interface

RAG Vault includes a full-featured web UI for managing your documents without the command line.

### Launch the Web UI

```bash
npx github:RobThePCGuy/rag-vault web
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### What You Can Do

- **Upload documents**: Drag and drop PDF, DOCX, Markdown, TXT, JSON, JSONL, and NDJSON files
- **Search instantly**: Type queries and see results with relevance scores
- **Preview content**: Click any result to see the full chunk in context
- **Manage files**: View all indexed documents and delete what you do not need
- **Switch databases**: Create and switch between multiple knowledge bases
- **Monitor status**: See document counts, memory usage, and search mode
- **Export/Import settings**: Back up and restore your vault configuration
- **Theme preferences**: Switch between light, dark, or system theme
- **Folder browser**: Navigate directories to select documents

### REST API

The web server exposes a REST API for programmatic access. Set `RAG_API_KEY` to require authentication:

```bash
# With authentication (when RAG_API_KEY is set)
curl -X POST "http://localhost:3000/api/v1/search" \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"query": "authentication", "limit": 5}'

# Search documents (no auth required if RAG_API_KEY is not set)
curl -X POST "http://localhost:3000/api/v1/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "authentication", "limit": 5}'

# List all files
curl "http://localhost:3000/api/v1/files"

# Upload a document
curl -X POST "http://localhost:3000/api/v1/files/upload" \
  -F "file=@spec.pdf"

# Delete a file
curl -X DELETE "http://localhost:3000/api/v1/files" \
  -H "Content-Type: application/json" \
  -d '{"filePath": "/path/to/spec.pdf"}'

# Get system status
curl "http://localhost:3000/api/v1/status"

# Health check (for load balancers)
curl "http://localhost:3000/api/v1/health"
```

### Reader API Endpoints

For programmatic document reading and cross-document discovery:

```bash
# Get all chunks for a document (ordered by index)
curl "http://localhost:3000/api/v1/documents/chunks?filePath=/path/to/doc.pdf"

# Find related chunks for cross-document discovery
curl "http://localhost:3000/api/v1/chunks/related?filePath=/path/to/doc.pdf&chunkIndex=0&limit=5"

# Batch request for multiple chunks (efficient for UIs)
curl -X POST "http://localhost:3000/api/v1/chunks/batch-related" \
  -H "Content-Type: application/json" \
  -d '{"chunks": [{"filePath": "/path/to/doc.pdf", "chunkIndex": 0}], "limit": 3}'
```

## Remote Mode

RAG Vault can also run as an HTTP server for remote MCP clients like Claude.ai, Claude Desktop, or any client supporting Streamable HTTP or SSE transports.

```bash
# Start remote server (default port 3001)
npx github:RobThePCGuy/rag-vault --remote

# Custom port
npx github:RobThePCGuy/rag-vault --remote --port 8080
```

Stdio mode is unchanged -- omit `--remote` and everything works as before with Cursor, Claude Code, and Codex.

### Connecting from Claude Desktop

Add to your Claude Desktop config:

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

### Connecting from Claude.ai

For Claude.ai (Pro/Max/Team/Enterprise), add as a custom connector with URL `https://your-host:3001/mcp`. For local development, expose your server with a tunnel:

```bash
cloudflared tunnel --url http://localhost:3001
```

Set `RAG_API_KEY` for authentication when exposing remotely. The server supports both Streamable HTTP (`/mcp`) and legacy SSE (`/sse`) transports, plus a health check at `/health`.

## Real-World Examples

### Search Your Codebase Documentation

```
You: "Ingest all the markdown files in /docs"
AI:  Ingested 23 files (847 chunks total)

You: "What's the retry policy for failed API calls?"
AI:  According to error-handling.md, failed requests retry 3 times
     with exponential backoff: 1s, 2s, 4s...
```

### Index Web Documentation

```
You: "Fetch https://docs.example.com/api and ingest the HTML"
AI:  Ingested "docs.example.com/api" (156 chunks)

You: "What rate limits apply to the /users endpoint?"
AI:  The API limits /users to 100 requests per minute per API key...
```

### Build a Personal Knowledge Base

```
You: "Ingest my research papers folder"
AI:  Ingested 12 PDFs (2,341 chunks)

You: "What do recent studies say about transformer attention mechanisms?"
AI:  Based on attention-mechanisms-2024.pdf, the key finding is...
```

### Search Exact Technical Terms

RAG Vault's hybrid search catches both meaning and exact matches:

```
You: "Search for ERR_CONNECTION_REFUSED"
AI:  Found 3 results mentioning ERR_CONNECTION_REFUSED:
     1. troubleshooting.md - "When you see ERR_CONNECTION_REFUSED..."
     2. network-errors.pdf - "Common causes include..."
```

Pure semantic search would miss this. RAG Vault finds it.

## How It Works

```
Document → Parse → Chunk by meaning → Embed locally → Store in LanceDB
                         ↓
Query → Embed → Vector search → Keyword boost → Quality filter → Results
```

**Smart chunking**: Splits by meaning, not character count. Keeps code blocks intact.

**Hybrid search**: Vector similarity finds related content. Keyword boost ranks exact matches higher.

**Quality filtering**: Groups results by relevance gaps instead of arbitrary top-K cutoffs.

**Local by default**: Embeddings via Transformers.js. Storage via LanceDB. Network is only needed for initial model download or if you explicitly ingest remote URLs.

**MCP tools included**: `query_documents`, `ingest_file`, `ingest_data`, `delete_file`, `list_files`, `status`, `feedback_pin`, `feedback_dismiss`, and `feedback_stats`.

## Supported Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| PDF | `.pdf` | Full text extraction, header/footer filtering |
| Word | `.docx` | Tables, lists, formatting preserved |
| Markdown | `.md` | Code blocks kept intact |
| Text | `.txt` | Plain text |
| JSON | `.json` | Converted to searchable key-value text |
| JSONL / NDJSON | `.jsonl`, `.ndjson` | Parsed line-by-line for logs and structured records |
| HTML | via `ingest_data` | Auto-cleaned with Readability |

## Configuration

### Environment Variables

| Variable | Default | What it does |
|----------|---------|--------------|
| `BASE_DIR` | Current directory | Only files under this path can be accessed |
| `DB_PATH` | `./lancedb/` | Where vectors are stored |
| `MODEL_NAME` | `Xenova/all-MiniLM-L6-v2` | HuggingFace embedding model |
| `RAG_EMBEDDING_DEVICE` | `auto` | Inference device hint (`auto`, `cpu`, `cuda`, `dml`, `webgpu`, etc.) |
| `WEB_PORT` | `3000` | Port for web interface |

One-command override (no `.env` edit):

```bash
# MCP mode
npx github:RobThePCGuy/rag-vault --embedding-device dml

# Web mode
npx github:RobThePCGuy/rag-vault web --embedding-device dml

# Explicitly force auto detection
npx github:RobThePCGuy/rag-vault --gpu-auto
```

### Search Tuning

| Variable | Default | What it does |
|----------|---------|--------------|
| `RAG_HYBRID_WEIGHT` | `0.6` | Keyword boost strength. 0 = semantic-only, higher = stronger boost for exact keyword matches |
| `RAG_GROUPING` | unset | `similar` = top group only, `related` = top 2 groups |
| `RAG_MAX_DISTANCE` | unset | Filter out results below this relevance threshold |

### Security (optional)

| Variable | Default | What it does |
|----------|---------|--------------|
| `RAG_API_KEY` | unset | API key for authentication |
| `CORS_ORIGINS` | localhost | Allowed origins (comma-separated, or `*`) |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit time window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |

### Advanced

| Variable | Default | What it does |
|----------|---------|--------------|
| `ALLOWED_SCAN_ROOTS` | Home directory | Directories allowed for database scanning |
| `JSON_BODY_LIMIT` | `5mb` | Max request body size |
| `REQUEST_TIMEOUT_MS` | `30000` | API request timeout |
| `REQUEST_LOGGING` | `false` | Enable request audit logging |

> Copy [`.env.example`](.env.example) for a complete configuration template.

**For code-heavy content**, try:

```json
"env": {
  "RAG_HYBRID_WEIGHT": "0.8",
  "RAG_GROUPING": "similar"
}
```

## Frequently Asked Questions

<details>
<summary><strong>Is my data really private?</strong></summary>

For local files, yes. Indexing and search run on your machine after the embedding model downloads (~90MB). RAG Vault only uses network if you choose remote URL ingestion or need to download a model.

</details>

<details>
<summary><strong>Does it work offline?</strong></summary>

Yes, after the first run. The model caches locally.

</details>

<details>
<summary><strong>What about GPU acceleration?</strong></summary>

RAG Vault now uses Transformers.js device auto-selection by default (`RAG_EMBEDDING_DEVICE=auto`), which can use GPU providers when available and fall back to CPU.

Practical notes:
- Windows Node runtime typically uses DirectML (`dml`).
- Linux x64 can use CUDA when ONNX Runtime CUDA binaries are available.
- You can force CPU with `RAG_EMBEDDING_DEVICE=cpu` if you prefer stability.

</details>

<details>
<summary><strong>Can I change the embedding model?</strong></summary>

Yes. Set `MODEL_NAME` to any compatible HuggingFace model. You must delete `DB_PATH` and re-ingest because different models produce incompatible vectors.

**Recommended upgrade:** For better quality and multilingual support, use [EmbeddingGemma](https://huggingface.co/onnx-community/embeddinggemma-300m-ONNX):

```json
"MODEL_NAME": "onnx-community/embeddinggemma-300m-ONNX"
```

This model is a strong option for multilingual and higher-quality retrieval use cases.

**Other specialized models:**
- Scientific: `sentence-transformers/allenai-specter`
- Code: `jinaai/jina-embeddings-v2-base-code`

</details>

<details>
<summary><strong>How do I back up my data?</strong></summary>

Copy the `DB_PATH` directory (default: `./lancedb/`).

</details>

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No results found | Documents must be ingested first. Run "List all ingested files" to check. |
| Model download failed | Check internet connection. Model is ~90MB from HuggingFace. |
| File too large | Default limit is 100MB. Set `MAX_FILE_SIZE` higher or split the file. |
| Path outside BASE_DIR | All file paths must be under `BASE_DIR`. Use absolute paths. |
| MCP tools not showing | Verify config syntax, restart your AI tool completely (Cmd+Q on Mac). |
| `mcp-publisher login github` fails with `slow_down` | Use token login instead: `mcp-publisher login github --token "$(gh auth token)"` (or pass a PAT). |
| 401 Unauthorized | API key required. Set `RAG_API_KEY` or use correct header format. |
| 429 Too Many Requests | Rate limited. Wait for reset or increase `RATE_LIMIT_MAX_REQUESTS`. |
| CORS errors | Add your origin to `CORS_ORIGINS` environment variable. |

## Development

```bash
git clone https://github.com/RobThePCGuy/rag-vault.git
cd rag-vault
pnpm install
pnpm --prefix web-ui install

# Install local git hooks (recommended, even for solo dev)
pnpm hooks:install

# Fast local quality gate (backend + web-ui type/lint/format, deps, unused, build, unit tests)
pnpm check:all

# Unit tests only (no model download required)
pnpm test:unit

# Integration/E2E tests (requires model download/network)
pnpm test:integration

# Build
pnpm build

# Run MCP server locally (stdio)
pnpm dev

# Run MCP server locally (remote HTTP + SSE)
pnpm dev:remote

# Run web server locally
pnpm web:dev

# Release to npm (local, guarded)
pnpm release          # patch
pnpm release:minor
pnpm release:major
pnpm release:dry
```


### Test Tiers

- `pnpm test:unit`: deterministic tests for local/CI quality checks, excluding model-download integration paths.
- `pnpm test:integration`: full integration and E2E workflows, including embedding model initialization.

Use `RUN_EMBEDDING_INTEGRATION=1` to explicitly opt into network/model-dependent suites.

### Release Strategy

- Releases are local and scripted via `scripts/release-npm.sh`.
- Supported bumps: `patch`, `minor`, `major`.
- The script runs dependency installs, `pnpm check:all`, and `pnpm ui:build` before touching version files.
- `package.json` and `server.json` versions are updated only after checks pass, and auto-restored if any later step fails.
- `pnpm release:dry` performs the full gate plus npm dry-run publish and always restores version files.

### Project Structure

```
src/
├── bin/             # CLI subcommands (skills install)
├── chunker/         # Semantic text splitting
├── embedder/        # Transformers.js wrapper
├── errors/          # Error handling utilities
├── explainability/  # Keyword-based result explanations
├── flywheel/        # Feedback loop (pin/dismiss reranking)
├── parser/          # PDF, DOCX, HTML parsing
├── query/           # Advanced query syntax parser
├── server/          # MCP tool handlers + remote transport
├── utils/           # Config, file helpers, process handlers
├── vectordb/        # LanceDB + hybrid search
└── web/             # Express server + REST API

web-ui/              # React frontend (Vite + Tailwind)
```

## Documentation

- [SECURITY.md](SECURITY.md): Security configuration and best practices
- [.env.example](.env.example): Complete environment variable template

## License

MIT: free for personal and commercial use.

## Acknowledgments

Built with [Model Context Protocol](https://modelcontextprotocol.io/), [LanceDB](https://lancedb.com/), and [Transformers.js](https://huggingface.co/docs/transformers.js).

> Started as a fork of [mcp-local-rag](https://github.com/shinpr/mcp-local-rag) by [Shinsuke Kagawa](https://github.com/shinpr). Now it’s its own thing.
> Huge credit to upstream contributors for the foundation, I’ve been iterating hard from there.
> Local-first dev tools, all the way.
