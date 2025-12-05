// VectorStore implementation with LanceDB integration

import { type Connection, type Table, connect } from '@lancedb/lancedb'

// ============================================
// Type Definitions
// ============================================

/**
 * VectorStore configuration
 */
export interface VectorStoreConfig {
  /** LanceDB database path */
  dbPath: string
  /** Table name */
  tableName: string
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  /** File name */
  fileName: string
  /** File size in bytes */
  fileSize: number
  /** File type (extension) */
  fileType: string
}

/**
 * Vector chunk
 */
export interface VectorChunk {
  /** Chunk ID (UUID) */
  id: string
  /** File path (absolute) */
  filePath: string
  /** Chunk index (zero-based) */
  chunkIndex: number
  /** Chunk text */
  text: string
  /** Embedding vector (384 dimensions) */
  vector: number[]
  /** Metadata */
  metadata: DocumentMetadata
  /** Ingestion timestamp (ISO 8601 format) */
  timestamp: string
}

/**
 * Search result
 */
export interface SearchResult {
  /** File path */
  filePath: string
  /** Chunk index */
  chunkIndex: number
  /** Chunk text */
  text: string
  /** Similarity score (0-1, higher means more similar) */
  score: number
  /** Metadata */
  metadata: DocumentMetadata
}

// ============================================
// Error Classes
// ============================================

/**
 * Database error
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

// ============================================
// VectorStore Class
// ============================================

/**
 * Vector storage class using LanceDB
 *
 * Responsibilities:
 * - LanceDB operations (insert, delete, search)
 * - Transaction handling (atomicity of delete→insert)
 * - Metadata management
 */
export class VectorStore {
  private db: Connection | null = null
  private table: Table | null = null
  private readonly config: VectorStoreConfig

  constructor(config: VectorStoreConfig) {
    this.config = config
  }

  /**
   * Initialize LanceDB and create table
   */
  async initialize(): Promise<void> {
    try {
      // Connect to LanceDB
      this.db = await connect(this.config.dbPath)

      // Check table existence and create if needed
      const tableNames = await this.db.tableNames()
      if (tableNames.includes(this.config.tableName)) {
        // Open existing table
        this.table = await this.db.openTable(this.config.tableName)
        console.error(`VectorStore: Opened existing table "${this.config.tableName}"`)
      } else {
        // Create new table (schema auto-defined on first data insertion)
        console.error(
          `VectorStore: Table "${this.config.tableName}" will be created on first data insertion`
        )
      }

      console.error(`VectorStore initialized: ${this.config.dbPath}`)
    } catch (error) {
      throw new DatabaseError('Failed to initialize VectorStore', error as Error)
    }
  }

  /**
   * Delete all chunks for specified file path
   *
   * @param filePath - File path (absolute)
   */
  async deleteChunks(filePath: string): Promise<void> {
    if (!this.table) {
      // If table doesn't exist, no deletion targets, return normally
      console.error('VectorStore: Skipping deletion as table does not exist')
      return
    }

    try {
      // Use LanceDB delete API to remove records matching filePath
      // Escape single quotes to prevent SQL injection
      const escapedFilePath = filePath.replace(/'/g, "''")

      // LanceDB's delete method doesn't throw errors if targets don't exist,
      // so call delete directly
      // Note: Field names are case-sensitive, use backticks for camelCase fields
      await this.table.delete(`\`filePath\` = '${escapedFilePath}'`)
      console.error(`VectorStore: Deleted chunks for file "${filePath}"`)
    } catch (error) {
      // If error occurs, output warning log
      console.warn(`VectorStore: Error occurred while deleting file "${filePath}":`, error)
      // Don't treat as error if deletion targets don't exist or table is empty
      // Otherwise throw exception
      const errorMessage = (error as Error).message.toLowerCase()
      if (
        !errorMessage.includes('not found') &&
        !errorMessage.includes('does not exist') &&
        !errorMessage.includes('no matching')
      ) {
        throw new DatabaseError(`Failed to delete chunks for file: ${filePath}`, error as Error)
      }
    }
  }

  /**
   * Batch insert vector chunks
   *
   * @param chunks - Array of vector chunks
   */
  async insertChunks(chunks: VectorChunk[]): Promise<void> {
    if (chunks.length === 0) {
      return
    }

    try {
      if (!this.table) {
        // Create table on first insertion
        if (!this.db) {
          throw new DatabaseError('VectorStore is not initialized. Call initialize() first.')
        }
        // LanceDB's createTable API accepts data as Record<string, unknown>[]
        const records = chunks.map((chunk) => chunk as unknown as Record<string, unknown>)
        this.table = await this.db.createTable(this.config.tableName, records)
        console.error(`VectorStore: Created table "${this.config.tableName}"`)
      } else {
        // Add data to existing table
        const records = chunks.map((chunk) => chunk as unknown as Record<string, unknown>)
        await this.table.add(records)
      }

      console.error(`VectorStore: Inserted ${chunks.length} chunks`)
    } catch (error) {
      throw new DatabaseError('Failed to insert chunks', error as Error)
    }
  }

  /**
   * Execute vector search
   *
   * @param queryVector - Query vector (384 dimensions)
   * @param limit - Number of results to retrieve (default 5)
   * @returns Array of search results (sorted by score descending)
   */
  async search(queryVector: number[], limit = 5): Promise<SearchResult[]> {
    if (!this.table) {
      // Return empty array if table doesn't exist
      console.error('VectorStore: Returning empty results as table does not exist')
      return []
    }

    if (queryVector.length !== 384) {
      throw new DatabaseError(
        `Invalid query vector dimension: expected 384, got ${queryVector.length}`
      )
    }

    if (limit < 1 || limit > 20) {
      throw new DatabaseError(`Invalid limit: expected 1-20, got ${limit}`)
    }

    try {
      // Use LanceDB's vector search API
      const results = await this.table.vectorSearch(queryVector).limit(limit).toArray()

      // Convert to SearchResult format
      return results.map((result) => ({
        filePath: result.filePath as string,
        chunkIndex: result.chunkIndex as number,
        text: result.text as string,
        score: result._distance as number, // LanceDB returns distance score (closer to 0 means more similar)
        metadata: result.metadata as DocumentMetadata,
      }))
    } catch (error) {
      throw new DatabaseError('Failed to search vectors', error as Error)
    }
  }

  /**
   * Get list of ingested files
   *
   * @returns Array of file information
   */
  async listFiles(): Promise<{ filePath: string; chunkCount: number; timestamp: string }[]> {
    if (!this.table) {
      return [] // Return empty array if table doesn't exist
    }

    try {
      // Retrieve all records
      const allRecords = await this.table.query().toArray()

      // Group by file path
      const fileMap = new Map<string, { chunkCount: number; timestamp: string }>()

      for (const record of allRecords) {
        const filePath = record.filePath as string
        const timestamp = record.timestamp as string

        if (fileMap.has(filePath)) {
          const fileInfo = fileMap.get(filePath)
          if (fileInfo) {
            fileInfo.chunkCount += 1
            // Keep most recent timestamp
            if (timestamp > fileInfo.timestamp) {
              fileInfo.timestamp = timestamp
            }
          }
        } else {
          fileMap.set(filePath, { chunkCount: 1, timestamp })
        }
      }

      // Convert Map to array of objects
      return Array.from(fileMap.entries()).map(([filePath, info]) => ({
        filePath,
        chunkCount: info.chunkCount,
        timestamp: info.timestamp,
      }))
    } catch (error) {
      throw new DatabaseError('Failed to list files', error as Error)
    }
  }

  /**
   * Get system status
   *
   * @returns System status information
   */
  async getStatus(): Promise<{
    documentCount: number
    chunkCount: number
    memoryUsage: number
    uptime: number
  }> {
    if (!this.table) {
      return {
        documentCount: 0,
        chunkCount: 0,
        memoryUsage: 0,
        uptime: process.uptime(),
      }
    }

    try {
      // Retrieve all records
      const allRecords = await this.table.query().toArray()
      const chunkCount = allRecords.length

      // Count unique file paths
      const uniqueFilePaths = new Set(allRecords.map((record) => record.filePath as string))
      const documentCount = uniqueFilePaths.size

      // Get memory usage (in MB)
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024

      // Get uptime (in seconds)
      const uptime = process.uptime()

      return {
        documentCount,
        chunkCount,
        memoryUsage,
        uptime,
      }
    } catch (error) {
      throw new DatabaseError('Failed to get status', error as Error)
    }
  }
}
