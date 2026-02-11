export { EmbeddingError } from '../errors/index.js';
/**
 * Embedder configuration
 */
export interface EmbedderConfig {
    /** HuggingFace model path */
    modelPath: string;
    /** Batch size */
    batchSize: number;
    /** Model cache directory */
    cacheDir: string;
}
/**
 * Embedding generation class using Transformers.js
 *
 * Responsibilities:
 * - Generate embedding vectors (dimension depends on model)
 * - Transformers.js wrapper
 * - Batch processing (size 8)
 */
export declare class Embedder {
    private model;
    private initPromise;
    private readonly config;
    constructor(config: EmbedderConfig);
    /**
     * Get the model name/path
     */
    getModelName(): string;
    /**
     * Initialize Transformers.js model
     */
    initialize(): Promise<void>;
    /**
     * Ensure model is initialized (lazy initialization)
     * This method is called automatically by embed() and embedBatch()
     */
    private ensureInitialized;
    /**
     * Convert single text to embedding vector
     *
     * @param text - Text
     * @returns Embedding vector (dimension depends on model)
     */
    embed(text: string): Promise<number[]>;
    /**
     * Convert multiple texts to embedding vectors with batch processing
     *
     * @param texts - Array of texts
     * @param signal - Optional AbortSignal for cancellation support
     * @returns Array of embedding vectors (dimension depends on model)
     */
    embedBatch(texts: string[], signal?: AbortSignal): Promise<number[][]>;
    /**
     * Detect known cache-corruption signatures from ONNX/protobuf loaders.
     */
    private isRecoverableCacheError;
    /**
     * Build a model-specific fallback cache path to avoid reusing corrupted artifacts.
     */
    private getRecoveryCacheDir;
}
//# sourceMappingURL=index.d.ts.map