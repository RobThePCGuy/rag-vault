// Shared configuration builder for RAG servers
// Used by both MCP server (src/index.ts) and Web server (src/web/index.ts)

import { existsSync } from 'node:fs'
import path from 'node:path'
import type { GroupingMode } from '../vectordb/index.js'
import {
  type SearchMode,
  parseGroupingMode,
  parseHybridWeight,
  parseMaxDistance,
  parseRrfK,
  parseSearchMode,
} from './config-parsers.js'

/**
 * Configuration validation error (internal use only)
 */
class ConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string
  ) {
    super(message)
    this.name = 'ConfigValidationError'
  }
}

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
  /** Search mode: 'rrf' (Reciprocal Rank Fusion) or 'boost' (legacy keyword boost) */
  searchMode?: SearchMode
  /** RRF K constant (smoothing factor, default: 60) */
  rrfK?: number
  /** Enable cross-encoder reranking */
  rerankerEnabled?: boolean
  /** Cross-encoder model name */
  rerankerModel?: string
  /** Reranker candidate multiplier (rerank limit * this many candidates) */
  rerankerCandidateMultiplier?: number
  /** Enable HyDE query expansion */
  hydeEnabled?: boolean
  /** HyDE backend: 'rule-based' or 'api' */
  hydeBackend?: string
  /** Number of HyDE expansions to generate */
  hydeExpansions?: number
  /** API key for HyDE API backend (optional, only used when hydeBackend='api') */
  hydeApiKey?: string
  /** API base URL for HyDE API backend (optional, default: https://api.anthropic.com) */
  hydeApiBaseUrl?: string
  /** API model for HyDE API backend (optional) */
  hydeApiModel?: string
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

  // Advanced RAG settings
  const searchMode = parseSearchMode(process.env['RAG_SEARCH_MODE']) ?? overrides?.searchMode
  const rrfK = parseRrfK(process.env['RAG_RRF_K']) ?? overrides?.rrfK

  if (searchMode !== undefined) {
    config.searchMode = searchMode
  }
  if (rrfK !== undefined) {
    config.rrfK = rrfK
  }

  // Reranker settings
  config.rerankerEnabled =
    process.env['RAG_RERANKER_ENABLED']?.toLowerCase() === 'true' ||
    overrides?.rerankerEnabled ||
    false
  config.rerankerModel =
    process.env['RAG_RERANKER_MODEL'] || overrides?.rerankerModel || 'Xenova/ms-marco-MiniLM-L-6-v2'
  const rerankerMult = Number.parseFloat(process.env['RAG_RERANKER_CANDIDATE_MULTIPLIER'] || '')
  config.rerankerCandidateMultiplier =
    !Number.isNaN(rerankerMult) && rerankerMult > 0
      ? rerankerMult
      : overrides?.rerankerCandidateMultiplier ?? 2

  // HyDE settings
  config.hydeEnabled =
    process.env['RAG_HYDE_ENABLED']?.toLowerCase() === 'true' || overrides?.hydeEnabled || false
  config.hydeBackend = process.env['RAG_HYDE_BACKEND'] || overrides?.hydeBackend || 'rule-based'
  const hydeExp = Number.parseInt(process.env['RAG_HYDE_EXPANSIONS'] || '', 10)
  config.hydeExpansions =
    !Number.isNaN(hydeExp) && hydeExp > 0 ? hydeExp : overrides?.hydeExpansions ?? 2

  // HyDE API settings (only relevant when hydeBackend='api')
  config.hydeApiKey = process.env['RAG_HYDE_API_KEY'] || overrides?.hydeApiKey
  config.hydeApiBaseUrl = process.env['RAG_HYDE_API_BASE_URL'] || overrides?.hydeApiBaseUrl
  config.hydeApiModel = process.env['RAG_HYDE_API_MODEL'] || overrides?.hydeApiModel

  return config
}

/**
 * Validate RAG configuration at startup
 * Throws ConfigValidationError if configuration is invalid
 *
 * @param config - The configuration to validate
 * @throws ConfigValidationError if validation fails
 */
export function validateRAGConfig(config: RAGConfig): void {
  // Validate dbPath - must be a valid path format
  if (!config.dbPath || typeof config.dbPath !== 'string') {
    throw new ConfigValidationError('dbPath must be a non-empty string', 'dbPath')
  }

  // Validate modelName - must be non-empty
  if (!config.modelName || typeof config.modelName !== 'string') {
    throw new ConfigValidationError('modelName must be a non-empty string', 'modelName')
  }

  // Validate cacheDir - must be a valid path format
  if (!config.cacheDir || typeof config.cacheDir !== 'string') {
    throw new ConfigValidationError('cacheDir must be a non-empty string', 'cacheDir')
  }

  // Validate baseDir - must be a non-empty string (directory will be created if needed)
  if (!config.baseDir || typeof config.baseDir !== 'string') {
    throw new ConfigValidationError('baseDir must be a non-empty string', 'baseDir')
  }

  // Validate maxFileSize - must be positive
  if (config.maxFileSize <= 0) {
    throw new ConfigValidationError(
      `maxFileSize must be a positive number, got: ${config.maxFileSize}`,
      'maxFileSize'
    )
  }

  // Validate maxDistance - must be positive if provided
  if (config.maxDistance !== undefined && config.maxDistance <= 0) {
    throw new ConfigValidationError(
      `maxDistance must be a positive number, got: ${config.maxDistance}`,
      'maxDistance'
    )
  }

  // Validate hybridWeight - must be between 0 and 1 if provided
  if (config.hybridWeight !== undefined && (config.hybridWeight < 0 || config.hybridWeight > 1)) {
    throw new ConfigValidationError(
      `hybridWeight must be between 0.0 and 1.0, got: ${config.hybridWeight}`,
      'hybridWeight'
    )
  }

  // Validate grouping - must be valid enum if provided
  if (
    config.grouping !== undefined &&
    config.grouping !== 'similar' &&
    config.grouping !== 'related'
  ) {
    throw new ConfigValidationError(
      `grouping must be 'similar' or 'related', got: ${config.grouping}`,
      'grouping'
    )
  }
}

/**
 * Validate ALLOWED_SCAN_ROOTS environment variable
 * Logs warnings for non-existent paths but doesn't throw
 *
 * @returns Array of validated root paths
 */
export function validateAllowedScanRoots(): string[] {
  const envRoots = process.env['ALLOWED_SCAN_ROOTS']
  if (!envRoots) {
    return []
  }

  const roots = envRoots.split(',').map((p) => path.resolve(p.trim()))
  const validRoots: string[] = []

  for (const root of roots) {
    if (!root) continue

    if (!existsSync(root)) {
      console.warn(`ALLOWED_SCAN_ROOTS: Path does not exist: ${root}`)
      continue
    }

    validRoots.push(root)
  }

  return validRoots
}
