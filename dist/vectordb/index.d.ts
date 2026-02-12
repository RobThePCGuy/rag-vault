export { DatabaseError } from '../errors/index.js';
/**
 * Validate file path to prevent SQL injection and path traversal attacks.
 * @param filePath - The file path to validate
 * @returns true if path is safe for use in queries
 */
/**
 * Validate file path to prevent SQL injection and path traversal attacks.
 * @param filePath - The file path to validate
 * @returns true if path is safe for use in queries
 */
export declare function isValidFilePath(filePath: string): boolean;
/**
 * Generate a content-based fingerprint for a chunk.
 * Uses SHA-256 hash of normalized text (first 16 hex chars for compactness).
 * This enables stable chunk identification across re-indexing.
 */
export declare function generateChunkFingerprint(text: string): string;
/**
 * Grouping mode for quality filtering
 * - 'similar': Only return the most similar group (stops at first distance jump)
 * - 'related': Include related groups (stops at second distance jump)
 */
export type GroupingMode = 'similar' | 'related';
/**
 * VectorStore configuration
 */
export interface VectorStoreConfig {
    /** LanceDB database path */
    dbPath: string;
    /** Table name */
    tableName: string;
    /** Maximum distance threshold for filtering results (optional) */
    maxDistance?: number;
    /** Grouping mode for quality filtering (optional) */
    grouping?: GroupingMode;
    /**
     * Hybrid weight: controls how strongly BM25 boosts candidates from vector search.
     * 0 = no keyword boost (vector-only), higher values increase keyword match influence.
     * Default: 0.6
     */
    hybridWeight?: number;
}
/**
 * Document metadata
 */
export interface DocumentMetadata {
    /** File name */
    fileName: string;
    /** File size in bytes */
    fileSize: number;
    /** File type (extension) */
    fileType: string;
    /** Optional custom metadata fields (e.g., author, domain, tags) */
    custom?: Record<string, string>;
}
/**
 * Vector chunk
 */
export interface VectorChunk {
    /** Chunk ID (UUID) */
    id: string;
    /** File path (absolute) */
    filePath: string;
    /** Chunk index (zero-based) */
    chunkIndex: number;
    /** Chunk text */
    text: string;
    /** Embedding vector (dimension depends on model) */
    vector: number[];
    /** Metadata */
    metadata: DocumentMetadata;
    /** Ingestion timestamp (ISO 8601 format) */
    timestamp: string;
    /** Content-based fingerprint for resilient linking (SHA-256 prefix) */
    fingerprint?: string;
}
/**
 * Search result
 */
export interface SearchResult {
    /** File path */
    filePath: string;
    /** Chunk index */
    chunkIndex: number;
    /** Chunk text */
    text: string;
    /**
     * Distance score (lower = more similar).
     * Uses dot product on normalized embeddings (equivalent to cosine distance).
     * Range: [0, 2] where 0 = identical, 1 = orthogonal, 2 = opposite.
     */
    score: number;
    /** Metadata */
    metadata: DocumentMetadata;
    /** Content-based fingerprint for resilient linking */
    fingerprint?: string;
}
/**
 * Vector storage class using LanceDB
 *
 * Responsibilities:
 * - LanceDB operations (insert, delete, search)
 * - Transaction handling (atomicity of delete→insert)
 * - Metadata management
 *
 * FTS Circuit Breaker:
 * - Tracks FTS failures (max 3 before disabling)
 * - Auto-recovers after 5-minute cooldown
 * - Prevents permanent FTS disable from transient errors
 */
export declare class VectorStore {
    private db;
    private table;
    private readonly config;
    private ftsEnabled;
    private ftsFailureCount;
    private ftsLastFailure;
    /** Promise-based mutex for atomic circuit breaker reset */
    private ftsRecoveryPromise;
    /** Runtime override for hybrid weight (allows dynamic adjustment) */
    private hybridWeightOverride;
    /** Promise-based mutex for table creation (prevents race on first insert) */
    private tableCreationPromise;
    constructor(config: VectorStoreConfig);
    /**
     * Get the current hybrid weight (runtime override or config default)
     */
    getHybridWeight(): number;
    /**
     * Set the hybrid weight at runtime
     * @param weight - Value between 0.0 (vector-only) and 1.0 (max keyword boost)
     */
    setHybridWeight(weight: number): void;
    /**
     * Check if FTS should be attempted (circuit breaker logic)
     * - Returns false if max failures reached and cooldown not elapsed
     * - Resets failure count after successful cooldown period
     * - Uses promise-based mutex for atomic reset (prevents race conditions)
     */
    private shouldAttemptFts;
    /**
     * Record FTS failure (circuit breaker)
     * Note: This method is synchronous, so ftsFailureCount++ is atomic in Node.js
     * single-threaded execution model (no await points = no interleaving).
     */
    private recordFtsFailure;
    /**
     * Record FTS success (resets circuit breaker)
     */
    private recordFtsSuccess;
    /**
     * Extract unsupported custom metadata field from LanceDB schema mismatch errors.
     *
     * Returns:
     * - specific key (e.g., "character") for metadata.custom.character mismatch
     * - CUSTOM_METADATA_ALL_FIELDS when metadata.custom itself is unsupported
     * - null when error is unrelated
     */
    private extractUnsupportedCustomMetadataField;
    /**
     * Remove unsupported custom metadata field from chunks for schema compatibility.
     *
     * @param chunks - Source chunks
     * @param field - Unsupported field name, or CUSTOM_METADATA_ALL_FIELDS to drop all custom metadata
     * @returns Sanitized chunks and whether any changes were applied
     */
    private stripUnsupportedCustomMetadata;
    /**
     * Add chunks to existing table with automatic fallback for custom metadata schema mismatches.
     *
     * LanceDB infers struct fields from early inserts, so later custom metadata keys may fail.
     * This method retries by stripping only unsupported custom fields when needed.
     */
    private addChunksWithSchemaFallback;
    /**
     * Initialize LanceDB and create table
     */
    initialize(): Promise<void>;
    /**
     * Delete all chunks for specified file path
     *
     * @param filePath - File path (absolute)
     */
    deleteChunks(filePath: string): Promise<void>;
    /**
     * Batch insert vector chunks
     *
     * @param chunks - Array of vector chunks
     */
    insertChunks(chunks: VectorChunk[]): Promise<void>;
    /**
     * Ensure FTS index exists for hybrid search
     * Creates ngram-based index if it doesn't exist, drops old versions
     * @throws DatabaseError if index creation fails (Fail-Fast principle)
     */
    private ensureFtsIndex;
    /**
     * Rebuild FTS index after data changes (insert/delete)
     * LanceDB OSS requires explicit optimize() call to update FTS index
     * Also cleans up old index versions to prevent storage bloat
     */
    private rebuildFtsIndex;
    /**
     * Apply grouping algorithm to filter results by detecting group boundaries.
     *
     * Uses statistical threshold (mean + k*std) to identify significant gaps (group boundaries).
     * - 'similar': Returns only the first group (cuts at first boundary)
     * - 'related': Returns up to 2 groups (cuts at second boundary)
     *
     * @param results - Search results sorted by distance (ascending)
     * @param mode - Grouping mode ('similar' = 1 group, 'related' = 2 groups)
     * @returns Filtered results
     */
    private applyGrouping;
    /**
     * Execute vector search with quality filtering
     * Architecture: Semantic search → Filter (maxDistance, grouping) → Keyword boost
     *
     * This "prefetch then rerank" approach ensures:
     * - maxDistance and grouping work on meaningful vector distances
     * - Keyword matching acts as a boost, not a replacement for semantic similarity
     *
     * @param queryVector - Query vector (dimension depends on model)
     * @param queryText - Optional query text for keyword boost (BM25)
     * @param limit - Number of results to retrieve (default 10)
     * @returns Array of search results (sorted by distance ascending, filtered by quality settings)
     */
    search(queryVector: number[], queryText?: string, limit?: number): Promise<SearchResult[]>;
    /**
     * Apply keyword boost to rerank vector search results
     * Uses multiplicative formula: final_distance = distance / (1 + keyword_normalized * weight)
     *
     * This proportional boost ensures:
     * - Keyword matches improve ranking without dominating semantic similarity
     * - Documents without keyword matches keep their original vector distance
     * - Higher weight = stronger influence of keyword matching
     *
     * @param vectorResults - Results from vector search (already filtered by maxDistance/grouping)
     * @param ftsResults - Raw FTS results with BM25 scores
     * @param weight - Boost weight (0-1, from hybridWeight config)
     */
    private applyKeywordBoost;
    /**
     * Get list of ingested files with optional pagination
     *
     * @param options - Optional pagination parameters
     * @param options.limit - Maximum number of files to return (default: all)
     * @param options.offset - Number of files to skip (default: 0)
     * @returns Array of file information
     */
    listFiles(options?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        filePath: string;
        chunkCount: number;
        timestamp: string;
    }[]>;
    /**
     * Close the database connection and release resources
     *
     * Properly releases LanceDB resources:
     * - Table.close() releases cached index data
     * - Connection.close() releases HTTP connection pools
     * Both are safe to call multiple times.
     *
     * @throws DatabaseError if closing fails (after attempting to close both resources)
     */
    close(): Promise<void>;
    /**
     * Get all chunks for a document, ordered by chunkIndex
     *
     * @param filePath - File path (absolute)
     * @returns Array of chunks ordered by chunkIndex
     */
    getDocumentChunks(filePath: string): Promise<SearchResult[]>;
    /**
     * Find related chunks using a chunk's stored embedding
     *
     * @param filePath - File path of the source chunk
     * @param chunkIndex - Index of the source chunk
     * @param limit - Number of results to return (default 5)
     * @param excludeSameDocument - Whether to exclude chunks from the same document (default true)
     * @returns Array of related chunks with similarity scores
     */
    findRelatedChunks(filePath: string, chunkIndex: number, limit?: number, excludeSameDocument?: boolean): Promise<SearchResult[]>;
    /**
     * Get system status
     *
     * @returns System status information
     */
    getStatus(): Promise<{
        documentCount: number;
        chunkCount: number;
        memoryUsage: number;
        uptime: number;
        ftsIndexEnabled: boolean;
        searchMode: 'hybrid' | 'vector-only';
    }>;
}
//# sourceMappingURL=index.d.ts.map