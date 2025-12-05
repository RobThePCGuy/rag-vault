// DocumentChunker implementation with RecursiveCharacterTextSplitter

import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

// ============================================
// Type Definitions
// ============================================

/**
 * DocumentChunker configuration
 */
export interface ChunkerConfig {
  /** Chunk size (characters) */
  chunkSize: number
  /** Overlap (characters) */
  chunkOverlap: number
}

/**
 * Text chunk
 */
export interface TextChunk {
  /** Chunk text */
  text: string
  /** Chunk index (zero-based) */
  index: number
}

// ============================================
// DocumentChunker Class
// ============================================

/**
 * Text chunking class using RecursiveCharacterTextSplitter
 *
 * Responsibilities:
 * - Split text into chunks (chunkSize: 512, chunkOverlap: 100)
 * - RecursiveCharacterTextSplitter wrapper
 */
export class DocumentChunker {
  private splitter: RecursiveCharacterTextSplitter | null = null
  private readonly config: ChunkerConfig

  constructor(config: ChunkerConfig) {
    this.config = config
  }

  /**
   * Initialize RecursiveCharacterTextSplitter
   */
  async initialize(): Promise<void> {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.config.chunkSize,
      chunkOverlap: this.config.chunkOverlap,
    })

    console.error(
      `DocumentChunker initialized: chunkSize=${this.config.chunkSize}, chunkOverlap=${this.config.chunkOverlap}`
    )
  }

  /**
   * Split text into chunks
   *
   * @param text - Text to split
   * @returns Array of chunks (each chunk has an index)
   */
  async chunkText(text: string): Promise<TextChunk[]> {
    if (!this.splitter) {
      throw new Error('DocumentChunker not initialized')
    }

    // Empty string handling: return empty array (no error)
    if (text.length === 0) {
      return []
    }

    try {
      const startTime = Date.now()

      // Split text
      const chunks = await this.splitter.splitText(text)

      // Assign chunk indices
      const result: TextChunk[] = chunks.map((chunk, index) => ({
        text: chunk,
        index,
      }))

      const duration = Date.now() - startTime
      console.error(`Chunked text into ${result.length} chunks in ${duration}ms`)

      return result
    } catch (error) {
      console.error('Failed to chunk text:', error)
      throw error
    }
  }
}
