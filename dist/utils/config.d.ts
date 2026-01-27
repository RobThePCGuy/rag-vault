import type { GroupingMode } from '../vectordb/index.js';
/**
 * RAG server configuration (matches RAGServerConfig in server/index.ts)
 */
export interface RAGConfig {
    /** LanceDB database path */
    dbPath: string;
    /** Transformers.js model path */
    modelName: string;
    /** Model cache directory */
    cacheDir: string;
    /** Document base directory */
    baseDir: string;
    /** Maximum file size in bytes */
    maxFileSize: number;
    /** Maximum distance threshold for quality filtering (optional) */
    maxDistance?: number;
    /** Grouping mode for quality filtering (optional) */
    grouping?: GroupingMode;
    /** Hybrid search weight for BM25 (0.0 = vector only, 1.0 = BM25 only) */
    hybridWeight?: number;
}
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
export declare function buildRAGConfig(overrides?: Partial<RAGConfig>): RAGConfig;
//# sourceMappingURL=config.d.ts.map