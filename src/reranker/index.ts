// Cross-encoder reranker implementation with Transformers.js

import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { env, pipeline } from '@huggingface/transformers'

// ============================================
// Type Definitions
// ============================================

/**
 * Reranker configuration
 */
export interface RerankerConfig {
  /** HuggingFace cross-encoder model path */
  modelPath: string
  /** Model cache directory */
  cacheDir: string
  /**
   * Device hint for Transformers.js runtime.
   * Examples: auto, cpu, cuda, dml, webgpu
   */
  device?: string
  /**
   * Timeout for model initialization/download in milliseconds.
   * Default: 600000 (10 minutes).
   */
  initTimeoutMs?: number
}

/**
 * Reranked result with score
 */
export interface RerankedResult {
  /** Original index in the input array */
  index: number
  /** Cross-encoder relevance score (higher = more relevant) */
  score: number
}

const SUPPORTED_DEVICES = [
  'auto',
  'gpu',
  'cpu',
  'wasm',
  'webgpu',
  'cuda',
  'dml',
  'webnn',
  'webnn-npu',
  'webnn-gpu',
  'webnn-cpu',
] as const

type DeviceType = (typeof SUPPORTED_DEVICES)[number]
const SUPPORTED_DEVICE_SET = new Set<string>(SUPPORTED_DEVICES)

/** Default init timeout: 10 minutes */
const DEFAULT_INIT_TIMEOUT_MS = 10 * 60 * 1000

function getInitTimeoutMs(configValue?: number): number {
  if (configValue !== undefined && configValue > 0) return configValue
  const envValue = process.env['RERANKER_INIT_TIMEOUT_MS']
  if (envValue) {
    const parsed = Number.parseInt(envValue, 10)
    if (!Number.isNaN(parsed) && parsed > 0) return parsed
  }
  return DEFAULT_INIT_TIMEOUT_MS
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
      ms
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

// ============================================
// Reranker Class
// ============================================

/**
 * Cross-encoder reranker using Transformers.js
 *
 * Scores (query, passage) pairs for relevance using a cross-encoder model.
 * Unlike bi-encoders, cross-encoders jointly encode both texts, producing
 * more accurate relevance judgments at the cost of speed.
 *
 * Default model: Xenova/ms-marco-MiniLM-L-6-v2 (~23MB ONNX)
 */
export class Reranker {
  // Using unknown to avoid TS2590 (union type too complex with @types/jsdom)
  private model: unknown = null
  private initPromise: Promise<void> | null = null
  private readonly config: RerankerConfig

  constructor(config: RerankerConfig) {
    this.config = config
  }

  /**
   * Get the model name/path
   */
  getModelName(): string {
    return this.config.modelPath
  }

  /**
   * Resolve the device to use for inference
   */
  private resolveDevice(): DeviceType {
    // Check config first
    if (this.config.device && SUPPORTED_DEVICE_SET.has(this.config.device)) {
      return this.config.device as DeviceType
    }

    // Check environment variable
    const envDevice = process.env['RAG_RERANKER_DEVICE'] || process.env['RAG_EMBEDDING_DEVICE']
    if (envDevice && SUPPORTED_DEVICE_SET.has(envDevice.toLowerCase())) {
      return envDevice.toLowerCase() as DeviceType
    }

    return 'auto'
  }

  /**
   * Get a recovery cache directory for corrupted model caches
   */
  private getRecoveryCacheDir(): string {
    return path.join(this.config.cacheDir, '.recovery-reranker')
  }

  /**
   * Check if an error is recoverable by using a fresh cache
   */
  private isRecoverableCacheError(error: unknown): boolean {
    if (!(error instanceof Error)) return false
    const msg = error.message.toLowerCase()
    return msg.includes('protobuf') || msg.includes('parsing failed') || msg.includes('corrupt')
  }

  /**
   * Initialize Transformers.js cross-encoder model
   */
  async initialize(): Promise<void> {
    if (this.model) return

    try {
      env.cacheDir = this.config.cacheDir
      const device = this.resolveDevice()
      const timeoutMs = getInitTimeoutMs(this.config.initTimeoutMs)

      console.error(`Reranker: Using device preference "${device}"`)
      console.error(
        `Reranker: Loading model "${this.config.modelPath}" (timeout: ${Math.round(timeoutMs / 1000)}s)...`
      )

      this.model = await withTimeout(
        pipeline('text-classification', this.config.modelPath, { device }),
        timeoutMs,
        'Reranker model initialization'
      )
      console.error('Reranker: Model loaded successfully')
    } catch (error) {
      if (this.isRecoverableCacheError(error)) {
        const recoveryCacheDir = this.getRecoveryCacheDir()
        console.error(
          `Reranker: Detected corrupted cache. Retrying with isolated cache: "${recoveryCacheDir}"`
        )

        try {
          await mkdir(recoveryCacheDir, { recursive: true })
          env.cacheDir = recoveryCacheDir
          const device = this.resolveDevice()
          this.model = await withTimeout(
            pipeline('text-classification', this.config.modelPath, { device }),
            getInitTimeoutMs(this.config.initTimeoutMs),
            'Reranker model initialization (recovery)'
          )
          console.error('Reranker: Model loaded successfully via recovery cache')
          return
        } catch (recoveryError) {
          throw new Error(
            `Failed to initialize Reranker after cache recovery: ${(recoveryError as Error).message}`
          )
        }
      }

      throw new Error(`Failed to initialize Reranker: ${(error as Error).message}`)
    }
  }

  /**
   * Ensure model is initialized (lazy initialization)
   */
  private async ensureInitialized(): Promise<void> {
    if (this.model) return

    if (this.initPromise) {
      await this.initPromise
      return
    }

    console.error(
      'Reranker: First use detected. Initializing model (downloading ~23MB, may take a moment)...'
    )

    const initWork = this.initialize().catch((error) => {
      this.initPromise = null
      throw new Error(
        `Failed to initialize reranker on first use: ${(error as Error).message}\n\nPossible causes:\n  • Network connectivity issues during model download\n  • Insufficient disk space\n  • Corrupted model cache\n\nRecommended actions:\n  1. Check your internet connection and try again\n  2. Delete cache: ${this.config.cacheDir}\n  3. Retry your query\n`
      )
    })
    this.initPromise = initWork

    await this.initPromise
  }

  /**
   * Rerank passages by relevance to a query using cross-encoder scoring.
   *
   * @param query - The search query
   * @param passages - Array of passage texts to score
   * @returns Array of {index, score} sorted by score descending (most relevant first)
   */
  async rerank(query: string, passages: string[]): Promise<RerankedResult[]> {
    if (passages.length === 0) return []

    await this.ensureInitialized()

    try {
      // Cross-encoder expects pairs of (text_a, text_b)
      // For ms-marco models, we use the text_pair approach
      const modelCall = this.model as (
        texts: string[],
        options: { text_pair: string[] }
      ) => Promise<Array<{ label: string; score: number }>>

      // Prepare inputs: query repeated for each passage
      const queries = passages.map(() => query)

      const outputs = await modelCall(queries, { text_pair: passages })

      // Map results back with original indices
      const results: RerankedResult[] = outputs.map((output, index) => ({
        index,
        // For ms-marco models, the raw score is the relevance score
        // Higher score = more relevant
        score: output.score,
      }))

      // Sort by score descending (most relevant first)
      results.sort((a, b) => b.score - a.score)

      return results
    } catch (error) {
      console.error(`Reranker: Scoring failed: ${(error as Error).message}`)
      // Return original order on failure (graceful degradation)
      return passages.map((_, index) => ({ index, score: 0 }))
    }
  }
}
