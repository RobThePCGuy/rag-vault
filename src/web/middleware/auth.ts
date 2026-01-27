// API Key authentication middleware

import { timingSafeEqual } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

/**
 * API Key authentication middleware
 *
 * Validates requests against RAG_API_KEY environment variable.
 * If RAG_API_KEY is not set, authentication is disabled (local-only mode).
 *
 * Accepts API key via:
 * - Authorization header: "Bearer <key>" or "ApiKey <key>"
 * - X-API-Key header
 *
 * @example
 * // Enable by setting environment variable
 * RAG_API_KEY=your-secret-key npm start
 *
 * // Client usage
 * fetch('/api/v1/search', {
 *   headers: { 'Authorization': 'Bearer your-secret-key' }
 * })
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const configuredKey = process.env['RAG_API_KEY']

  // If no API key configured, skip authentication (local-only mode)
  if (!configuredKey) {
    next()
    return
  }

  // Extract API key from request
  const authHeader = req.headers['authorization']
  const xApiKey = req.headers['x-api-key']

  let providedKey: string | undefined

  if (authHeader) {
    // Support "Bearer <key>" and "ApiKey <key>" formats
    const match = authHeader.match(/^(?:Bearer|ApiKey)\s+(.+)$/i)
    if (match?.[1]) {
      providedKey = match[1]
    }
  } else if (typeof xApiKey === 'string') {
    providedKey = xApiKey
  }

  // Validate API key using timing-safe comparison
  if (!providedKey || !safeCompare(providedKey, configuredKey)) {
    res.status(401).json({
      error: 'Unauthorized',
      code: 'AUTH_REQUIRED',
      message: 'Valid API key required. Set RAG_API_KEY environment variable.',
    })
    return
  }

  next()
}

/**
 * Timing-safe string comparison to prevent timing attacks
 *
 * Uses Node.js crypto.timingSafeEqual with padding to prevent length leaks.
 * Both strings are padded to the same length before comparison.
 * Length comparison is computed BEFORE timing-safe comparison to prevent
 * timing leaks from short-circuit evaluation.
 */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)

  // Compute length match FIRST (constant time for number comparison)
  // This prevents timing leaks from short-circuit evaluation
  const lengthsMatch = bufA.length === bufB.length

  // Pad to same length to prevent length timing leak in content comparison
  const maxLen = Math.max(bufA.length, bufB.length)
  const padA = Buffer.alloc(maxLen)
  const padB = Buffer.alloc(maxLen)
  bufA.copy(padA)
  bufB.copy(padB)

  // Use Node.js timing-safe comparison and verify original lengths match
  // lengthsMatch is already computed, so no timing leak from && evaluation
  return timingSafeEqual(padA, padB) && lengthsMatch
}
