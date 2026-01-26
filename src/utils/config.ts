// Shared configuration builder for RAG servers
// Used by both MCP server (src/index.ts) and Web server (src/web/index.ts)

import type { GroupingMode } from '../vectordb/index.js'
import { parseGroupingMode, parseHybridWeight, parseMaxDistance } from './config-parsers.js'

/**
 * RAG server configuration (matches RAGServerConfig in server/index.ts)
 */
export interface RAGConfig {
  /** LanceDB database path */
  dbPath: string
  /** Transformers.js model path */
  modelName: string
  /** Model cache directory */
  cacheDir: string
  /** Document base directory */
  baseDir: string
  /** Maximum file size in bytes */
  maxFileSize: number
  /** Maximum distance threshold for quality filtering (optional) */
  maxDistance?: number
  /** Grouping mode for quality filtering (optional) */
  grouping?: GroupingMode
  /** Hybrid search weight for BM25 (0.0 = vector only, 1.0 = BM25 only) */
  hybridWeight?: number
}

/**
 * Default configuration values
 */
const DEFAULTS = {
  dbPath: './lancedb/',
  modelName: 'Xenova/all-MiniLM-L6-v2',
  cacheDir: './models/',
  maxFileSize: 104857600, // 100MB
} as const

/**
 * Build RAG server configuration from environment variables
 *
 * Environment variables:
 * - DB_PATH: LanceDB database path (default: ./lancedb/)
 * - MODEL_NAME: Transformers.js model name (default: Xenova/all-MiniLM-L6-v2)
 * - CACHE_DIR: Model cache directory (default: ./models/)
 * - BASE_DIR: Document base directory (default: process.cwd())
 * - MAX_FILE_SIZE: Maximum file size in bytes (default: 104857600)
 * - RAG_MAX_DISTANCE: Quality filter max distance threshold
 * - RAG_GROUPING: Quality filter grouping mode ('similar' | 'related')
 * - RAG_HYBRID_WEIGHT: Hybrid search weight (0.0-1.0)
 */
export function buildRAGConfig(overrides?: Partial<RAGConfig>): RAGConfig {
  const config: RAGConfig = {
    dbPath: process.env['DB_PATH'] || overrides?.dbPath || DEFAULTS.dbPath,
    modelName: process.env['MODEL_NAME'] || overrides?.modelName || DEFAULTS.modelName,
    cacheDir: process.env['CACHE_DIR'] || overrides?.cacheDir || DEFAULTS.cacheDir,
    baseDir: process.env['BASE_DIR'] || overrides?.baseDir || process.cwd(),
    maxFileSize: Number.parseInt(
      process.env['MAX_FILE_SIZE'] || String(overrides?.maxFileSize || DEFAULTS.maxFileSize),
      10
    ),
  }

  // Add quality filter settings only if defined
  const maxDistance = parseMaxDistance(process.env['RAG_MAX_DISTANCE']) ?? overrides?.maxDistance
  const grouping = parseGroupingMode(process.env['RAG_GROUPING']) ?? overrides?.grouping
  const hybridWeight =
    parseHybridWeight(process.env['RAG_HYBRID_WEIGHT']) ?? overrides?.hybridWeight

  if (maxDistance !== undefined) {
    config.maxDistance = maxDistance
  }
  if (grouping !== undefined) {
    config.grouping = grouping
  }
  if (hybridWeight !== undefined) {
    config.hybridWeight = hybridWeight
  }

  return config
}
