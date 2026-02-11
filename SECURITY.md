# Security

This document describes the security model and best practices for RAG-Vault.

## Authentication

### API Key Authentication

When the `RAG_API_KEY` environment variable is set, all API endpoints require authentication.

**Supported methods:**
- `Authorization: Bearer <key>`
- `Authorization: ApiKey <key>`
- `X-API-Key: <key>` header

**Local-only mode:** If `RAG_API_KEY` is not set, authentication is disabled for local development.

### Timing-Safe Comparison

API key validation uses Node.js `crypto.timingSafeEqual` with padding to prevent timing attacks and length leaks.

## CORS Policy

CORS is configured via the `CORS_ORIGINS` environment variable.

**Default origins (localhost only):**
- `http://localhost:5173`
- `http://localhost:3000`
- `http://127.0.0.1:5173`
- `http://127.0.0.1:3000`

**Custom configuration:**
- Comma-separated list: `CORS_ORIGINS=https://app.example.com,https://admin.example.com`
- Allow all (not recommended): `CORS_ORIGINS=*`

## Rate Limiting

In-memory rate limiting protects against abuse:

| Setting | Default | Environment Variable |
|---------|---------|---------------------|
| Window | 1 minute | `RATE_LIMIT_WINDOW_MS` |
| Max requests | 100 | `RATE_LIMIT_MAX_REQUESTS` |

Rate limit headers are included in responses:
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
3. **Magic byte validation**: Uses [file-type](https://github.com/sindresorhus/file-type) to verify actual file content
4. **Size limit**: 100MB maximum

### Path Traversal Prevention

Database scanning is restricted to paths within `ALLOWED_SCAN_ROOTS`:
- Default: User's home directory
- Custom: `ALLOWED_SCAN_ROOTS=/path/one,/path/two`

Symlinks are resolved before path validation to prevent traversal attacks.

## Dependency Security

### Security Overrides

The following dependency overrides are configured in `package.json`:

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

API requests timeout after 30 seconds to prevent resource exhaustion:
- Returns `503 Service Unavailable` with `REQUEST_TIMEOUT` error code
- Protects against slow loris and similar attacks

## Best Practices

### Production Deployment

1. **Always set `RAG_API_KEY`** in production
2. **Configure specific CORS origins** instead of `*`
3. **Use HTTPS** with a reverse proxy (nginx, Caddy)
4. **Set `NODE_ENV=production`** to disable stack traces in errors
5. **Monitor rate limit headers** for abuse patterns

### Development

1. Use `.env.example` as a template for local configuration
2. Never commit `.env` files with secrets
3. Run `pnpm audit` before deploying

## Reporting Vulnerabilities

Please report security vulnerabilities to the repository maintainer via GitHub Security Advisories or email.

Do not create public issues for security vulnerabilities.
