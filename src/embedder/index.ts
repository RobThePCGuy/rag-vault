// Embedder implementation with Transformers.js

import { env, pipeline } from '@huggingface/transformers'
import { EmbeddingError } from '../errors/index.js'

// Re-export error class for backwards compatibility
export { EmbeddingError } from '../errors/index.js'

// ============================================
// Type Definitions
// ============================================

/**
 * Embedder configuration
 */
export interface EmbedderConfig {
  /** HuggingFace model path */
  modelPath: string
  /** Batch size */
  batchSize: number
  /** Model cache directory */
  cacheDir: string
}

// ============================================
// Embedder Class
// ============================================

/**
 * Embedding generation class using Transformers.js
 *
 * Responsibilities:
 * - Generate embedding vectors (dimension depends on model)
 * - Transformers.js wrapper
 * - Batch processing (size 8)
 */
export class Embedder {
  // Using unknown to avoid TS2590 (union type too complex with @types/jsdom)
  private model: unknown = null
  private initPromise: Promise<void> | null = null
  private readonly config: EmbedderConfig

  constructor(config: EmbedderConfig) {
    this.config = config
  }

  /**
   * Get the model name/path
   */
  getModelName(): string {
    return this.config.modelPath
  }

  /**
   * Initialize Transformers.js model
   */
  async initialize(): Promise<void> {
    // Skip if already initialized
    if (this.model) {
      return
    }

    try {
      // Set cache directory BEFORE creating pipeline
      env.cacheDir = this.config.cacheDir

      console.error(`Embedder: Setting cache directory to "${this.config.cacheDir}"`)
      console.error(`Embedder: Loading model "${this.config.modelPath}"...`)
      // Use type assertion to avoid TS2590 (union type too complex with @types/jsdom)
      this.model = await pipeline('feature-extraction', this.config.modelPath)
      console.error('Embedder: Model loaded successfully')
    } catch (error) {
      throw new EmbeddingError(
        `Failed to initialize Embedder: ${(error as Error).message}`,
        error as Error
      )
    }
  }

  /**
   * Ensure model is initialized (lazy initialization)
   * This method is called automatically by embed() and embedBatch()
   */
  private async ensureInitialized(): Promise<void> {
    // Already initialized
    if (this.model) {
      return
    }

    // Initialization already in progress, wait for it
    if (this.initPromise) {
      await this.initPromise
      return
    }

    // Start initialization
    console.error(
      'Embedder: First use detected. Initializing model (downloading ~90MB, may take 1-2 minutes)...'
    )

    this.initPromise = this.initialize().catch((error) => {
      // Clear initPromise on failure to allow retry
      this.initPromise = null

      // Enhance error message with detailed guidance
      throw new EmbeddingError(
        `Failed to initialize embedder on first use: ${(error as Error).message}\n\nPossible causes:\n  • Network connectivity issues during model download\n  • Insufficient disk space (need ~90MB)\n  • Corrupted model cache\n\nRecommended actions:\n  1. Check your internet connection and try again\n  2. Ensure sufficient disk space is available\n  3. If problem persists, delete cache: ${this.config.cacheDir}\n  4. Then retry your query\n`,
        error as Error
      )
    })

    await this.initPromise
  }

  /**
   * Convert single text to embedding vector
   *
   * @param text - Text
   * @returns Embedding vector (dimension depends on model)
   */
  async embed(text: string): Promise<number[]> {
    // Lazy initialization: initialize on first use if not already initialized
    await this.ensureInitialized()

    try {
      // Fail-fast for empty string: cannot generate meaningful embedding
      if (text.length === 0) {
        throw new EmbeddingError('Cannot generate embedding for empty text')
      }

      // Use type assertion to avoid complex Transformers.js type definitions
      // This is due to external library type definition constraints, runtime behavior is guaranteed
      const options = { pooling: 'mean', normalize: true }
      const modelCall = this.model as (
        text: string,
        options: unknown
      ) => Promise<{ data: Float32Array }>
      const output = await modelCall(text, options)

      // Access raw data via .data property
      const embedding = Array.from(output.data)
      return embedding
    } catch (error) {
      if (error instanceof EmbeddingError) {
        throw error
      }
      throw new EmbeddingError(
        `Failed to generate embedding: ${(error as Error).message}`,
        error as Error
      )
    }
  }

  /**
   * Convert multiple texts to embedding vectors with batch processing
   *
   * @param texts - Array of texts
   * @param signal - Optional AbortSignal for cancellation support
   * @returns Array of embedding vectors (dimension depends on model)
   */
  async embedBatch(texts: string[], signal?: AbortSignal): Promise<number[][]> {
    // Lazy initialization: initialize on first use if not already initialized
    await this.ensureInitialized()

    if (texts.length === 0) {
      return []
    }

    try {
      const embeddings: number[][] = []

      // Process in batches according to batch size
      for (let i = 0; i < texts.length; i += this.config.batchSize) {
        // Check for cancellation before each batch
        if (signal?.aborted) {
          throw new EmbeddingError('Embedding operation was cancelled')
        }

        const batch = texts.slice(i, i + this.config.batchSize)
        const batchEmbeddings = await Promise.all(batch.map((text) => this.embed(text)))
        embeddings.push(...batchEmbeddings)
      }

      return embeddings
    } catch (error) {
      if (error instanceof EmbeddingError) {
        throw error
      }
      const message = error instanceof Error ? error.message : String(error)
      throw new EmbeddingError(
        `Failed to generate batch embeddings: ${message}`,
        error instanceof Error ? error : undefined
      )
    }
  }
}
