# Security

## Authentication

### API Key Authentication

If you set `RAG_API_KEY`, every endpoint needs a valid key.

**Supported methods:**
- `Authorization: Bearer <key>`
- `Authorization: ApiKey <key>`
- `X-API-Key: <key>` header

**Local-only mode:** If `RAG_API_KEY` isn't set, authentication is off. That's fine for local development, but you don't want to run it that way in production.

### Timing-Safe Comparison

API key validation uses Node.js `crypto.timingSafeEqual` with padding so it doesn't leak key length or leave the door open for timing attacks.

## CORS Policy

CORS is set up through the `CORS_ORIGINS` environment variable.

**Default origins (localhost only):**
- `http://localhost:5173`
- `http://localhost:3000`
- `http://127.0.0.1:5173`
- `http://127.0.0.1:3000`

**Custom setup:**
- Comma-separated list: `CORS_ORIGINS=https://app.example.com,https://admin.example.com`
- Allow all (not recommended): `CORS_ORIGINS=*`

## Rate Limiting

In-memory rate limiting keeps things from getting abused:

| Setting | Default | Environment Variable |
|---------|---------|---------------------|
| Window | 1 minute | `RATE_LIMIT_WINDOW_MS` |
| Max requests | 100 | `RATE_LIMIT_MAX_REQUESTS` |

Rate limit headers come back in every response:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Window reset timestamp

## Security Headers

The HTTP server uses [Helmet](https://helmetjs.github.io/) to set security headers:

- **Content-Security-Policy**: Restricts resource loading
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-Frame-Options**: Prevents clickjacking
- **X-XSS-Protection**: Legacy XSS protection
- **Strict-Transport-Security**: HTTPS enforcement (when behind HTTPS)

## File Upload Security

### Validation Layers

1. **Extension check**: Only allowed extensions (`.pdf`, `.docx`, `.txt`, `.md`, `.html`, `.json`)
2. **MIME type check**: Validates Content-Type header
3. **Magic byte validation**: Uses [file-type](https://github.com/sindresorhus/file-type) to check the actual file content
4. **Size limit**: 100MB maximum

### Path Traversal Prevention

Database scanning is locked to paths inside `ALLOWED_SCAN_ROOTS`:
- Default: User's home directory
- Custom: `ALLOWED_SCAN_ROOTS=/path/one,/path/two`

Symlinks get resolved before path validation so they can't be used to break out of allowed directories.

## Dependency Security

### Security Overrides

These dependency overrides are set in `package.json`:

| Package | Minimum Version | Reason |
|---------|----------------|--------|
| `tar` | `>=7.5.4` | CVE fixes for path traversal |
| `hono` | `>=4.11.4` | Security patches |
| `diff` | `>=4.0.4` | Security patches |

### Audit Commands

```bash
# Check for vulnerabilities
pnpm audit

# Auto-fix where possible
pnpm audit:fix
```

## Request Timeouts

API requests time out after 30 seconds to prevent resource exhaustion:
- Returns `503 Service Unavailable` with `REQUEST_TIMEOUT` error code
- Protects against slow loris and similar attacks

## Best Practices

### Production Deployment

You'll want to cover these before going live:

1. **Set `RAG_API_KEY`**. Running without it in production means no authentication at all.
2. **Specify your CORS origins** instead of using `*`. Lock it down to the domains that actually need access.
3. **Put it behind HTTPS** with a reverse proxy (nginx, Caddy).
4. **Set `NODE_ENV=production`** so stack traces don't show up in error responses.
5. **Keep an eye on rate limit headers** to catch abuse patterns early.

### Development

1. Use `.env.example` as a starting point for your local config
2. Don't commit `.env` files with secrets in them
3. Run `pnpm audit` before deploying

## Reporting Vulnerabilities

If you find a security issue, report it through GitHub Security Advisories or email the repository maintainer.

Don't create public issues for security vulnerabilities.
