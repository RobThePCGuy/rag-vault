"use strict";
// VectorStore implementation with LanceDB integration
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorStore = exports.DatabaseError = void 0;
exports.isValidFilePath = isValidFilePath;
exports.generateChunkFingerprint = generateChunkFingerprint;
const node_crypto_1 = require("node:crypto");
const lancedb_1 = require("@lancedb/lancedb");
const index_js_1 = require("../errors/index.js");
// Re-export error class for backwards compatibility
var index_js_2 = require("../errors/index.js");
Object.defineProperty(exports, "DatabaseError", { enumerable: true, get: function () { return index_js_2.DatabaseError; } });
// ============================================
// Constants (configurable via environment variables)
// ============================================
/**
 * Parse a numeric environment variable with fallback
 */
function parseEnvNumber(envVar, defaultValue) {
    const value = process.env[envVar];
    if (!value)
        return defaultValue;
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? defaultValue : parsed;
}
/**
 * Parse an integer environment variable with fallback
 */
function parseEnvInt(envVar, defaultValue) {
    const value = process.env[envVar];
    if (!value)
        return defaultValue;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? defaultValue : parsed;
}
/**
 * Standard deviation multiplier for detecting group boundaries.
 * A gap is considered a "boundary" if it exceeds mean + k*std.
 * Value of 1.5 means gaps > 1.5 standard deviations above mean are boundaries.
 * Configure via RAG_GROUPING_STD_MULTIPLIER environment variable.
 */
const GROUPING_BOUNDARY_STD_MULTIPLIER = parseEnvNumber('RAG_GROUPING_STD_MULTIPLIER', 1.5);
/**
 * Multiplier for candidate count in hybrid search (to allow reranking).
 * Configure via RAG_HYBRID_CANDIDATE_MULTIPLIER environment variable.
 */
const HYBRID_SEARCH_CANDIDATE_MULTIPLIER = parseEnvInt('RAG_HYBRID_CANDIDATE_MULTIPLIER', 2);
/** FTS index name (bump version when changing tokenizer settings) */
const FTS_INDEX_NAME = 'fts_index_v2';
/** Threshold for cleaning up old index versions (1 minute) */
const FTS_CLEANUP_THRESHOLD_MS = 60 * 1000;
/**
 * FTS circuit breaker: max failures before disabling FTS.
 * Configure via RAG_FTS_MAX_FAILURES environment variable.
 */
const FTS_MAX_FAILURES = parseEnvInt('RAG_FTS_MAX_FAILURES', 3);
/**
 * FTS circuit breaker: cooldown period before retry in milliseconds.
 * Default: 5 minutes (300000ms).
 * Configure via RAG_FTS_COOLDOWN_MS environment variable.
 */
const FTS_COOLDOWN_MS = parseEnvInt('RAG_FTS_COOLDOWN_MS', 5 * 60 * 1000);
// ============================================
// Error Codes (for robust error handling)
// ============================================
/**
 * Known LanceDB error patterns for delete operations
 * Used instead of fragile string matching
 */
const DELETE_IGNORABLE_PATTERNS = [
    'not found',
    'does not exist',
    'no matching',
    'no rows',
    'empty result',
];
/**
 * Regex for validating file paths before use in queries.
 * Allows alphanumeric characters, slashes, dots, underscores, hyphens, colons (Windows), and spaces.
 * Rejects paths with SQL injection attempts or path traversal.
 */
const SAFE_PATH_REGEX = /^[a-zA-Z0-9\\/_.:\- ]+$/;
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
function isValidFilePath(filePath) {
    if (!filePath || typeof filePath !== 'string')
        return false;
    if (filePath.includes('..'))
        return false; // Path traversal
    if (filePath.includes("'") || filePath.includes('"'))
        return false; // Quote injection
    if (filePath.includes(';'))
        return false; // SQL terminator
    if (filePath.includes('--'))
        return false; // SQL comment
    return SAFE_PATH_REGEX.test(filePath);
}
// ============================================
// Chunk Fingerprinting (Resilient Linking v0)
// ============================================
/**
 * Normalize text for fingerprinting.
 * - Converts to lowercase
 * - Collapses whitespace
 * - Trims leading/trailing whitespace
 */
function normalizeTextForFingerprint(text) {
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
}
/**
 * Generate a content-based fingerprint for a chunk.
 * Uses SHA-256 hash of normalized text (first 16 hex chars for compactness).
 * This enables stable chunk identification across re-indexing.
 */
function generateChunkFingerprint(text) {
    const normalized = normalizeTextForFingerprint(text);
    const hash = (0, node_crypto_1.createHash)('sha256').update(normalized, 'utf8').digest('hex');
    // Use first 16 characters (64 bits) - sufficient for practical uniqueness
    return hash.slice(0, 16);
}
// ============================================
// Type Guards
// ============================================
/**
 * Type guard for DocumentMetadata
 */
function isDocumentMetadata(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const obj = value;
    return (typeof obj['fileName'] === 'string' &&
        typeof obj['fileSize'] === 'number' &&
        typeof obj['fileType'] === 'string');
}
/**
 * Type guard for LanceDB raw search result
 */
function isLanceDBRawResult(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const obj = value;
    return (typeof obj['filePath'] === 'string' &&
        typeof obj['chunkIndex'] === 'number' &&
        typeof obj['text'] === 'string' &&
        isDocumentMetadata(obj['metadata']));
}
/**
 * Convert LanceDB raw result to SearchResult with type validation
 * @throws DatabaseError if the result is invalid
 */
function toSearchResult(raw) {
    if (!isLanceDBRawResult(raw)) {
        throw new index_js_1.DatabaseError('Invalid search result format from LanceDB');
    }
    const result = {
        filePath: raw.filePath,
        chunkIndex: raw.chunkIndex,
        text: raw.text,
        score: raw._distance ?? raw._score ?? 0,
        metadata: raw.metadata,
    };
    // Include fingerprint if present, otherwise generate on-the-fly for backwards compatibility
    if (raw.fingerprint) {
        result.fingerprint = raw.fingerprint;
    }
    else {
        // Generate fingerprint from text for legacy data without stored fingerprints
        result.fingerprint = generateChunkFingerprint(raw.text);
    }
    return result;
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
 *
 * FTS Circuit Breaker:
 * - Tracks FTS failures (max 3 before disabling)
 * - Auto-recovers after 5-minute cooldown
 * - Prevents permanent FTS disable from transient errors
 */
class VectorStore {
    constructor(config) {
        this.db = null;
        this.table = null;
        this.ftsEnabled = false;
        this.ftsFailureCount = 0;
        this.ftsLastFailure = null;
        /** Mutex to prevent race conditions in circuit breaker state transitions */
        this.circuitBreakerResetting = false;
        /** Runtime override for hybrid weight (allows dynamic adjustment) */
        this.hybridWeightOverride = null;
        this.config = config;
    }
    /**
     * Get the current hybrid weight (runtime override or config default)
     */
    getHybridWeight() {
        return this.hybridWeightOverride ?? this.config.hybridWeight ?? 0.6;
    }
    /**
     * Set the hybrid weight at runtime
     * @param weight - Value between 0.0 (vector-only) and 1.0 (max keyword boost)
     */
    setHybridWeight(weight) {
        if (weight < 0 || weight > 1) {
            throw new Error('Hybrid weight must be between 0.0 and 1.0');
        }
        this.hybridWeightOverride = weight;
    }
    /**
     * Check if FTS should be attempted (circuit breaker logic)
     * - Returns false if max failures reached and cooldown not elapsed
     * - Resets failure count after successful cooldown period
     * - Uses mutex to prevent race conditions during reset
     */
    shouldAttemptFts() {
        if (!this.ftsEnabled)
            return false;
        // If under failure threshold, allow FTS
        if (this.ftsFailureCount < FTS_MAX_FAILURES)
            return true;
        // Check if cooldown period has elapsed
        if (this.ftsLastFailure && Date.now() - this.ftsLastFailure > FTS_COOLDOWN_MS) {
            // Use mutex to prevent multiple concurrent resets (race condition protection)
            if (this.circuitBreakerResetting) {
                // Another call is already resetting, don't allow FTS yet
                return false;
            }
            // Acquire mutex and reset circuit breaker (half-open state)
            this.circuitBreakerResetting = true;
            this.ftsFailureCount = 0;
            this.ftsLastFailure = null;
            this.circuitBreakerResetting = false;
            console.error('VectorStore: FTS circuit breaker reset - attempting recovery');
            return true;
        }
        return false;
    }
    /**
     * Record FTS failure (circuit breaker)
     */
    recordFtsFailure(error) {
        this.ftsFailureCount++;
        this.ftsLastFailure = Date.now();
        console.error(`VectorStore: FTS failure ${this.ftsFailureCount}/${FTS_MAX_FAILURES}: ${error.message}`);
        if (this.ftsFailureCount >= FTS_MAX_FAILURES) {
            console.error(`VectorStore: FTS circuit breaker OPEN - will retry after ${FTS_COOLDOWN_MS / 1000}s cooldown`);
        }
    }
    /**
     * Record FTS success (resets circuit breaker)
     */
    recordFtsSuccess() {
        if (this.ftsFailureCount > 0) {
            console.error('VectorStore: FTS recovered successfully - circuit breaker reset');
            this.ftsFailureCount = 0;
            this.ftsLastFailure = null;
        }
    }
    /**
     * Initialize LanceDB and create table
     */
    async initialize() {
        try {
            // Connect to LanceDB
            this.db = await (0, lancedb_1.connect)(this.config.dbPath);
            // Check table existence and create if needed
            const tableNames = await this.db.tableNames();
            if (tableNames.includes(this.config.tableName)) {
                // Open existing table
                this.table = await this.db.openTable(this.config.tableName);
                console.log(`VectorStore: Opened existing table "${this.config.tableName}"`);
                // Ensure FTS index exists (migration for existing databases)
                await this.ensureFtsIndex();
            }
            else {
                // Create new table (schema auto-defined on first data insertion)
                console.log(`VectorStore: Table "${this.config.tableName}" will be created on first data insertion`);
            }
            console.log(`VectorStore initialized: ${this.config.dbPath}`);
        }
        catch (error) {
            throw new index_js_1.DatabaseError('Failed to initialize VectorStore', error);
        }
    }
    /**
     * Delete all chunks for specified file path
     *
     * @param filePath - File path (absolute)
     */
    async deleteChunks(filePath) {
        if (!this.table) {
            // If table doesn't exist, no deletion targets, return normally
            console.log('VectorStore: Skipping deletion as table does not exist');
            return;
        }
        // Validate file path before use in query to prevent SQL injection
        if (!isValidFilePath(filePath)) {
            throw new index_js_1.DatabaseError(`Invalid file path: contains disallowed characters or patterns`);
        }
        // Escape path before try block so it's available in catch for logging
        const escapedFilePath = filePath.replace(/'/g, "''");
        try {
            // Use LanceDB delete API to remove records matching filePath
            // Path is pre-validated, escaping is belt-and-suspenders defense
            // LanceDB's delete method doesn't throw errors if targets don't exist,
            // so call delete directly
            // Note: Field names are case-sensitive, use backticks for camelCase fields
            await this.table.delete(`\`filePath\` = '${escapedFilePath}'`);
            console.log(`VectorStore: Deleted chunks for file "${filePath}"`);
            // Rebuild FTS index after deleting data
            await this.rebuildFtsIndex();
        }
        catch (error) {
            // Build error context for debugging
            const errorContext = {
                operation: 'deleteChunks',
                filePath,
                query: `\`filePath\` = '${escapedFilePath}'`,
                errorMessage: error.message,
            };
            console.warn('VectorStore delete error:', errorContext);
            // Check if this is a known ignorable error (no matching records)
            const errorMessage = error.message.toLowerCase();
            const isIgnorable = DELETE_IGNORABLE_PATTERNS.some((pattern) => errorMessage.includes(pattern));
            if (!isIgnorable) {
                throw new index_js_1.DatabaseError(`Failed to delete chunks for file: ${filePath}`, error);
            }
            // Ignorable errors (no matching records) are logged but not thrown
        }
    }
    /**
     * Batch insert vector chunks
     *
     * @param chunks - Array of vector chunks
     */
    async insertChunks(chunks) {
        if (chunks.length === 0) {
            return;
        }
        try {
            // Ensure all chunks have fingerprints (Resilient Linking v0)
            const chunksWithFingerprints = chunks.map((chunk) => ({
                ...chunk,
                fingerprint: chunk.fingerprint || generateChunkFingerprint(chunk.text),
            }));
            if (!this.table) {
                // Create table on first insertion
                if (!this.db) {
                    throw new index_js_1.DatabaseError('VectorStore is not initialized. Call initialize() first.');
                }
                // LanceDB's createTable API accepts data as Record<string, unknown>[]
                const records = chunksWithFingerprints.map((chunk) => chunk);
                this.table = await this.db.createTable(this.config.tableName, records);
                console.log(`VectorStore: Created table "${this.config.tableName}"`);
                // Create FTS index for hybrid search
                await this.ensureFtsIndex();
            }
            else {
                // Add data to existing table
                const records = chunksWithFingerprints.map((chunk) => chunk);
                await this.table.add(records);
                // Rebuild FTS index after adding new data
                await this.rebuildFtsIndex();
            }
            console.log(`VectorStore: Inserted ${chunks.length} chunks`);
        }
        catch (error) {
            throw new index_js_1.DatabaseError('Failed to insert chunks', error);
        }
    }
    /**
     * Ensure FTS index exists for hybrid search
     * Creates ngram-based index if it doesn't exist, drops old versions
     * @throws DatabaseError if index creation fails (Fail-Fast principle)
     */
    async ensureFtsIndex() {
        if (!this.table) {
            return;
        }
        // Check existing indices
        const indices = await this.table.listIndices();
        const existingFtsIndices = indices.filter((idx) => idx.indexType === 'FTS');
        const hasExpectedIndex = existingFtsIndices.some((idx) => idx.name === FTS_INDEX_NAME);
        if (hasExpectedIndex) {
            this.ftsEnabled = true;
            return;
        }
        // Create new FTS index with ngram tokenizer for multilingual support
        // - min=2: Capture Japanese bi-grams (e.g., "東京", "設計")
        // - max=3: Balance between precision and index size
        // - prefixOnly=false: Generate ngrams from all positions for proper CJK support
        await this.table.createIndex('text', {
            config: lancedb_1.Index.fts({
                baseTokenizer: 'ngram',
                ngramMinLength: 2,
                ngramMaxLength: 3,
                prefixOnly: false,
                stem: false,
            }),
            name: FTS_INDEX_NAME,
        });
        this.ftsEnabled = true;
        console.log(`VectorStore: FTS index "${FTS_INDEX_NAME}" created successfully`);
        // Drop old FTS indices
        for (const idx of existingFtsIndices) {
            if (idx.name !== FTS_INDEX_NAME) {
                await this.table.dropIndex(idx.name);
                console.log(`VectorStore: Dropped old FTS index "${idx.name}"`);
            }
        }
    }
    /**
     * Rebuild FTS index after data changes (insert/delete)
     * LanceDB OSS requires explicit optimize() call to update FTS index
     * Also cleans up old index versions to prevent storage bloat
     */
    async rebuildFtsIndex() {
        if (!this.table || !this.ftsEnabled) {
            return;
        }
        // TODO(perf): optimize() after every write keeps FTS correct, but can be expensive at scale.
        // If ingestion throughput becomes an issue, consider debouncing or batching optimize calls.
        // Optimize table and clean up old versions
        const cleanupThreshold = new Date(Date.now() - FTS_CLEANUP_THRESHOLD_MS);
        await this.table.optimize({ cleanupOlderThan: cleanupThreshold });
    }
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
    applyGrouping(results, mode) {
        if (results.length <= 1)
            return results;
        // Calculate gaps between consecutive results with their indices
        const gaps = [];
        for (let i = 0; i < results.length - 1; i++) {
            const current = results[i];
            const next = results[i + 1];
            if (current !== undefined && next !== undefined) {
                gaps.push({ index: i + 1, gap: next.score - current.score });
            }
        }
        if (gaps.length === 0)
            return results;
        // Calculate statistical threshold to identify significant gaps (group boundaries)
        const gapValues = gaps.map((g) => g.gap);
        const mean = gapValues.reduce((a, b) => a + b, 0) / gapValues.length;
        const variance = gapValues.reduce((a, b) => a + (b - mean) ** 2, 0) / gapValues.length;
        const std = Math.sqrt(variance);
        const threshold = mean + GROUPING_BOUNDARY_STD_MULTIPLIER * std;
        // Find all significant gaps (group boundaries)
        const boundaries = gaps.filter((g) => g.gap > threshold).map((g) => g.index);
        // If no boundaries found, return all results
        if (boundaries.length === 0)
            return results;
        // Determine how many groups to include based on mode
        // 'similar': 1 group (cut at first boundary)
        // 'related': 2 groups (cut at second boundary, or return all if only 1 boundary)
        const groupsToInclude = mode === 'similar' ? 1 : 2;
        const boundaryIndex = groupsToInclude - 1;
        // If we don't have enough boundaries, return all results for 'related' mode
        if (boundaryIndex >= boundaries.length) {
            return mode === 'related' ? results : results.slice(0, boundaries[0]);
        }
        // Cut at the appropriate boundary
        return results.slice(0, boundaries[boundaryIndex]);
    }
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
    async search(queryVector, queryText, limit = 10) {
        if (!this.table) {
            console.log('VectorStore: Returning empty results as table does not exist');
            return [];
        }
        if (limit < 1 || limit > 20) {
            throw new index_js_1.DatabaseError(`Invalid limit: expected 1-20, got ${limit}`);
        }
        try {
            // Step 1: Semantic (vector) search - always the primary search
            const candidateLimit = limit * HYBRID_SEARCH_CANDIDATE_MULTIPLIER;
            // Assumes normalized embeddings so dot behaves like cosine distance (lower is better, [0,2]).
            let query = this.table.vectorSearch(queryVector).distanceType('dot').limit(candidateLimit);
            // Apply distance threshold at query level
            if (this.config.maxDistance !== undefined) {
                query = query.distanceRange(undefined, this.config.maxDistance);
            }
            const vectorResults = await query.toArray();
            // Convert to SearchResult format with type validation
            let results = vectorResults.map((result) => toSearchResult(result));
            // Step 2: Apply grouping filter on vector distances (before keyword boost)
            // Grouping is meaningful only on semantic distances, not after keyword boost
            if (this.config.grouping && results.length > 1) {
                results = this.applyGrouping(results, this.config.grouping);
            }
            // Step 3: Apply keyword boost if enabled (with circuit breaker)
            const hybridWeight = this.getHybridWeight();
            if (this.shouldAttemptFts() && queryText && queryText.trim().length > 0 && hybridWeight > 0) {
                try {
                    // Get unique filePaths from vector results to filter FTS search
                    const uniqueFilePaths = [...new Set(results.map((r) => r.filePath))];
                    // Build WHERE clause with IN for targeted FTS search
                    // Use backticks for column name (required for camelCase in LanceDB)
                    const escapedPaths = uniqueFilePaths.map((p) => `'${p.replace(/'/g, "''")}'`);
                    const whereClause = `\`filePath\` IN (${escapedPaths.join(', ')})`;
                    const ftsResults = await this.table
                        .search(queryText, 'fts', 'text')
                        .where(whereClause)
                        .select(['filePath', 'chunkIndex', 'text', 'metadata', '_score'])
                        .limit(results.length * 2) // Enough to cover all vector results
                        .toArray();
                    results = this.applyKeywordBoost(results, ftsResults, hybridWeight);
                    // FTS succeeded - reset circuit breaker
                    this.recordFtsSuccess();
                }
                catch (ftsError) {
                    // Record failure for circuit breaker (will auto-recover after cooldown)
                    this.recordFtsFailure(ftsError);
                    // Continue with vector-only results
                }
            }
            // Return top results after all filtering and boosting
            return results.slice(0, limit);
        }
        catch (error) {
            throw new index_js_1.DatabaseError('Failed to search vectors', error);
        }
    }
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
    applyKeywordBoost(vectorResults, ftsResults, weight) {
        // Build FTS score map with normalized scores (0-1)
        let maxBm25Score = 0;
        for (const result of ftsResults) {
            if (!result)
                continue;
            const score = result['_score'] ?? 0;
            if (score > maxBm25Score)
                maxBm25Score = score;
        }
        const ftsScoreMap = new Map();
        for (const result of ftsResults) {
            if (!result)
                continue;
            const key = `${result['filePath']}:${result['chunkIndex']}`;
            const rawScore = result['_score'] ?? 0;
            const normalized = maxBm25Score > 0 ? rawScore / maxBm25Score : 0;
            ftsScoreMap.set(key, normalized);
        }
        // Apply multiplicative boost to vector results
        const boostedResults = vectorResults.map((result) => {
            const key = `${result.filePath}:${result.chunkIndex}`;
            const keywordScore = ftsScoreMap.get(key) ?? 0;
            // Multiplicative boost: distance / (1 + keyword * weight)
            // - If keyword matches (score=1) and weight=1: distance halved
            // - If no keyword match (score=0): distance unchanged
            const boostedDistance = result.score / (1 + keywordScore * weight);
            return {
                ...result,
                score: boostedDistance,
            };
        });
        // Re-sort by boosted distance (ascending = better)
        return boostedResults.sort((a, b) => a.score - b.score);
    }
    /**
     * Get list of ingested files with optional pagination
     *
     * @param options - Optional pagination parameters
     * @param options.limit - Maximum number of files to return (default: all)
     * @param options.offset - Number of files to skip (default: 0)
     * @returns Array of file information
     */
    async listFiles(options) {
        if (!this.table) {
            return []; // Return empty array if table doesn't exist
        }
        try {
            // Retrieve all records - LanceDB doesn't support GROUP BY aggregation,
            // so we must fetch records and group in memory
            // TODO(perf): Consider caching file list or using incremental updates for very large datasets
            const allRecords = await this.table.query().toArray();
            // Group by file path
            const fileMap = new Map();
            for (const record of allRecords) {
                const filePath = record.filePath;
                const timestamp = record.timestamp;
                if (fileMap.has(filePath)) {
                    const fileInfo = fileMap.get(filePath);
                    if (fileInfo) {
                        fileInfo.chunkCount += 1;
                        // Keep most recent timestamp
                        if (timestamp > fileInfo.timestamp) {
                            fileInfo.timestamp = timestamp;
                        }
                    }
                }
                else {
                    fileMap.set(filePath, { chunkCount: 1, timestamp });
                }
            }
            // Convert Map to array of objects
            let results = Array.from(fileMap.entries()).map(([filePath, info]) => ({
                filePath,
                chunkCount: info.chunkCount,
                timestamp: info.timestamp,
            }));
            // Sort by timestamp descending (most recent first)
            results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
            // Apply pagination if provided
            const offset = options?.offset ?? 0;
            const limit = options?.limit;
            if (offset > 0) {
                results = results.slice(offset);
            }
            if (limit !== undefined && limit > 0) {
                results = results.slice(0, limit);
            }
            return results;
        }
        catch (error) {
            throw new index_js_1.DatabaseError('Failed to list files', error);
        }
    }
    /**
     * Close the database connection and release resources
     */
    async close() {
        this.db = null;
        this.table = null;
        this.ftsEnabled = false;
        this.ftsFailureCount = 0;
        this.ftsLastFailure = null;
        console.log('VectorStore: Connection closed');
    }
    /**
     * Get all chunks for a document, ordered by chunkIndex
     *
     * @param filePath - File path (absolute)
     * @returns Array of chunks ordered by chunkIndex
     */
    async getDocumentChunks(filePath) {
        if (!this.table) {
            return [];
        }
        // Validate file path before use in query
        if (!isValidFilePath(filePath)) {
            throw new index_js_1.DatabaseError(`Invalid file path: contains disallowed characters or patterns`);
        }
        try {
            const escapedFilePath = filePath.replace(/'/g, "''");
            const results = await this.table
                .query()
                .where(`\`filePath\` = '${escapedFilePath}'`)
                .toArray();
            // Convert to SearchResult format and sort by chunkIndex
            const chunks = results.map((record) => {
                const text = record.text;
                return {
                    filePath: record.filePath,
                    chunkIndex: record.chunkIndex,
                    text,
                    score: 0, // No distance score for direct retrieval
                    metadata: record.metadata,
                    // Include fingerprint - generate if not stored (backwards compatibility)
                    fingerprint: record.fingerprint || generateChunkFingerprint(text),
                };
            });
            return chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
        }
        catch (error) {
            throw new index_js_1.DatabaseError(`Failed to get document chunks for: ${filePath}`, error);
        }
    }
    /**
     * Find related chunks using a chunk's stored embedding
     *
     * @param filePath - File path of the source chunk
     * @param chunkIndex - Index of the source chunk
     * @param limit - Number of results to return (default 5)
     * @param excludeSameDocument - Whether to exclude chunks from the same document (default true)
     * @returns Array of related chunks with similarity scores
     */
    async findRelatedChunks(filePath, chunkIndex, limit = 5, excludeSameDocument = true) {
        if (!this.table) {
            return [];
        }
        // Validate file path before use in query
        if (!isValidFilePath(filePath)) {
            throw new index_js_1.DatabaseError(`Invalid file path: contains disallowed characters or patterns`);
        }
        try {
            // First, fetch the source chunk to get its vector
            const escapedFilePath = filePath.replace(/'/g, "''");
            const sourceResults = await this.table
                .query()
                .where(`\`filePath\` = '${escapedFilePath}' AND \`chunkIndex\` = ${chunkIndex}`)
                .toArray();
            if (sourceResults.length === 0) {
                return [];
            }
            const sourceChunk = sourceResults[0];
            const rawVector = sourceChunk?.vector;
            // LanceDB may return vectors as Arrow Vector or Float32Array, not plain Array
            // Convert to number[] for compatibility
            let sourceVector;
            if (rawVector) {
                if (Array.isArray(rawVector)) {
                    sourceVector = rawVector;
                }
                else if (typeof rawVector === 'object' && 'length' in rawVector) {
                    // Handle Arrow Vector, Float32Array, or other array-like objects
                    sourceVector = Array.from(rawVector);
                }
            }
            if (!sourceVector || sourceVector.length === 0) {
                // Chunk exists but has no embedding (e.g., upload timed out mid-process)
                // Return empty results instead of throwing - allows batch operations to continue
                console.warn(`Chunk ${filePath}:${chunkIndex} has no valid vector (possibly corrupted)`);
                return [];
            }
            // Search for similar chunks using the source vector
            // Request more candidates to allow for filtering
            const candidateLimit = excludeSameDocument ? limit * 3 : limit + 1;
            let query = this.table.vectorSearch(sourceVector).distanceType('dot').limit(candidateLimit);
            // Apply distance threshold if configured
            if (this.config.maxDistance !== undefined) {
                query = query.distanceRange(undefined, this.config.maxDistance);
            }
            const vectorResults = await query.toArray();
            // Convert to SearchResult format with type validation
            let results = vectorResults.map((result) => toSearchResult(result));
            // Filter out the source chunk itself
            results = results.filter((r) => !(r.filePath === filePath && r.chunkIndex === chunkIndex));
            // Optionally filter out same-document chunks
            if (excludeSameDocument) {
                results = results.filter((r) => r.filePath !== filePath);
            }
            return results.slice(0, limit);
        }
        catch (error) {
            const cause = error instanceof Error ? error.message : String(error);
            throw new index_js_1.DatabaseError(`Failed to find related chunks for: ${filePath}:${chunkIndex}: ${cause}`, error);
        }
    }
    /**
     * Get system status
     *
     * @returns System status information
     */
    async getStatus() {
        if (!this.table) {
            return {
                documentCount: 0,
                chunkCount: 0,
                memoryUsage: 0,
                uptime: process.uptime(),
                ftsIndexEnabled: false,
                searchMode: 'vector-only',
            };
        }
        try {
            // Use countRows() for efficient chunk counting instead of fetching all records
            const chunkCount = await this.table.countRows();
            // For document count, we still need to query unique filePaths
            // Use select to only fetch the filePath column (more efficient than full records)
            const filePathRecords = await this.table.query().select(['filePath']).toArray();
            const uniqueFilePaths = new Set(filePathRecords.map((record) => record.filePath));
            const documentCount = uniqueFilePaths.size;
            // Get memory usage (in MB)
            const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
            // Get uptime (in seconds)
            const uptime = process.uptime();
            // Determine effective FTS state (considering circuit breaker)
            const ftsEffectivelyEnabled = this.shouldAttemptFts();
            return {
                documentCount,
                chunkCount,
                memoryUsage,
                uptime,
                ftsIndexEnabled: this.ftsEnabled,
                searchMode: ftsEffectivelyEnabled && this.getHybridWeight() > 0 ? 'hybrid' : 'vector-only',
            };
        }
        catch (error) {
            throw new index_js_1.DatabaseError('Failed to get status', error);
        }
    }
}
exports.VectorStore = VectorStore;
//# sourceMappingURL=index.js.map