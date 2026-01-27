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
    /** Hybrid search weight for BM25 (0.0 = vector only, 1.0 = BM25 only, default 0.6) */
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
    /** Distance score using dot product (0 = identical, 1 = orthogonal, 2 = opposite) */
    score: number;
    /** Metadata */
    metadata: DocumentMetadata;
}
/**
 * Database error
 */
export declare class DatabaseError extends Error {
    readonly cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
/**
 * Vector storage class using LanceDB
 *
 * Responsibilities:
 * - LanceDB operations (insert, delete, search)
 * - Transaction handling (atomicity of delete→insert)
 * - Metadata management
 */
export declare class VectorStore {
    private db;
    private table;
    private readonly config;
    private ftsEnabled;
    constructor(config: VectorStoreConfig);
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
     * Get list of ingested files
     *
     * @returns Array of file information
     */
    listFiles(): Promise<{
        filePath: string;
        chunkCount: number;
        timestamp: string;
    }[]>;
    /**
     * Close the database connection and release resources
     */
    close(): Promise<void>;
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