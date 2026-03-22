// Shared configuration parsing utilities
// Used by both MCP server (src/index.ts) and Web server (src/web/index.ts)

import type { GroupingMode } from '../vectordb/index.js'

/**
 * Parse grouping mode from environment variable
 */
export function parseGroupingMode(value: string | undefined): GroupingMode | undefined {
  if (!value) return undefined
  const normalized = value.toLowerCase().trim()
  if (normalized === 'similar' || normalized === 'related') {
    return normalized
  }
  console.error(
    `Invalid RAG_GROUPING value: "${value}". Expected "similar" or "related". Ignoring.`
  )
  return undefined
}

/**
 * Parse max distance from environment variable
 */
export function parseMaxDistance(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number.parseFloat(value)
  if (Number.isNaN(parsed) || parsed <= 0) {
    console.error(`Invalid RAG_MAX_DISTANCE value: "${value}". Expected positive number. Ignoring.`)
    return undefined
  }
  return parsed
}

/**
 * Parse hybrid weight from environment variable
 */
export function parseHybridWeight(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number.parseFloat(value)
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
    console.error(
      `Invalid RAG_HYBRID_WEIGHT value: "${value}". Expected 0.0-1.0. Using default (0.6).`
    )
    return undefined
  }
  return parsed
}

/**
 * Search mode: how vector and BM25 results are combined
 * - 'rrf': Reciprocal Rank Fusion (recommended, treats channels as independent voters)
 * - 'boost': Legacy mode (BM25 multiplicatively boosts vector distances)
 */
export type SearchMode = 'rrf' | 'boost'

/**
 * Parse search mode from environment variable
 */
export function parseSearchMode(value: string | undefined): SearchMode | undefined {
  if (!value) return undefined
  const normalized = value.toLowerCase().trim()
  if (normalized === 'rrf' || normalized === 'boost') {
    return normalized
  }
  console.error(
    `Invalid RAG_SEARCH_MODE value: "${value}". Expected "rrf" or "boost". Using default ("rrf").`
  )
  return undefined
}

/**
 * Parse RRF K constant from environment variable
 */
export function parseRrfK(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < 1) {
    console.error(
      `Invalid RAG_RRF_K value: "${value}". Expected positive integer. Using default (60).`
    )
    return undefined
  }
  return parsed
}
