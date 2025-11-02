// Embedder implementation with Transformers.js

import { env, pipeline } from '@huggingface/transformers'

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
// Error Classes
// ============================================

/**
 * Embedding generation error
 */
export class EmbeddingError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'EmbeddingError'
  }
}

// ============================================
// Embedder Class
// ============================================

/**
 * Embedding generation class using Transformers.js
 *
 * Responsibilities:
 * - Generate embedding vectors (384 dimensions)
 * - Transformers.js wrapper
 * - Batch processing (size 8)
 */
export class Embedder {
  private model: Awaited<ReturnType<typeof pipeline>> | null = null
  private readonly config: EmbedderConfig

  constructor(config: EmbedderConfig) {
    this.config = config
  }

  /**
   * Initialize Transformers.js model
   */
  async initialize(): Promise<void> {
    try {
      // Set cache directory BEFORE creating pipeline
      env.cacheDir = this.config.cacheDir

      console.log(`Embedder: Setting cache directory to "${this.config.cacheDir}"`)
      console.log(`Embedder: Loading model "${this.config.modelPath}"...`)
      this.model = await pipeline('feature-extraction', this.config.modelPath)
      console.log('Embedder: Model loaded successfully')
    } catch (error) {
      throw new EmbeddingError(
        `Failed to initialize Embedder: ${(error as Error).message}`,
        error as Error
      )
    }
  }

  /**
   * Convert single text to embedding vector
   *
   * @param text - Text
   * @returns 384-dimensional vector
   */
  async embed(text: string): Promise<number[]> {
    if (!this.model) {
      throw new EmbeddingError('Embedder is not initialized. Call initialize() first.')
    }

    try {
      // Return zero vector for empty string
      if (text.length === 0) {
        return new Array(384).fill(0)
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
   * @returns Array of 384-dimensional vectors
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.model) {
      throw new EmbeddingError('Embedder is not initialized. Call initialize() first.')
    }

    if (texts.length === 0) {
      return []
    }

    try {
      const embeddings: number[][] = []

      // Process in batches according to batch size
      for (let i = 0; i < texts.length; i += this.config.batchSize) {
        const batch = texts.slice(i, i + this.config.batchSize)
        const batchEmbeddings = await Promise.all(batch.map((text) => this.embed(text)))
        embeddings.push(...batchEmbeddings)
      }

      return embeddings
    } catch (error) {
      throw new EmbeddingError(
        `Failed to generate batch embeddings: ${(error as Error).message}`,
        error as Error
      )
    }
  }
}
