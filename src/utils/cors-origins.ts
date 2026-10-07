// CORS origin parsing shared by the web UI server and the remote MCP transport

/** Default allowed CORS origins (localhost only for security) */
const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
]

/**
 * Parse CORS origins from environment variable with validation
 */
export function parseCorsOrigins(env: string | undefined): string | string[] {
  if (!env || env.trim() === '') return DEFAULT_CORS_ORIGINS
  if (env === '*') {
    console.warn(
      '[SECURITY] CORS_ORIGINS="*" allows all origins. This is not recommended for production environments.'
    )
    return '*'
  }
  return env
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
}
