"use strict";
// Embedder implementation with Transformers.js
Object.defineProperty(exports, "__esModule", { value: true });
exports.Embedder = exports.EmbeddingError = void 0;
const transformers_1 = require("@huggingface/transformers");
// ============================================
// Error Classes
// ============================================
/**
 * Embedding generation error
 */
class EmbeddingError extends Error {
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'EmbeddingError';
    }
}
exports.EmbeddingError = EmbeddingError;
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
class Embedder {
    constructor(config) {
        // Using unknown to avoid TS2590 (union type too complex with @types/jsdom)
        this.model = null;
        this.initPromise = null;
        this.config = config;
    }
    /**
     * Get the model name/path
     */
    getModelName() {
        return this.config.modelPath;
    }
    /**
     * Initialize Transformers.js model
     */
    async initialize() {
        // Skip if already initialized
        if (this.model) {
            return;
        }
        try {
            // Set cache directory BEFORE creating pipeline
            transformers_1.env.cacheDir = this.config.cacheDir;
            console.error(`Embedder: Setting cache directory to "${this.config.cacheDir}"`);
            console.error(`Embedder: Loading model "${this.config.modelPath}"...`);
            // Use type assertion to avoid TS2590 (union type too complex with @types/jsdom)
            this.model = await (0, transformers_1.pipeline)('feature-extraction', this.config.modelPath);
            console.error('Embedder: Model loaded successfully');
        }
        catch (error) {
            throw new EmbeddingError(`Failed to initialize Embedder: ${error.message}`, error);
        }
    }
    /**
     * Ensure model is initialized (lazy initialization)
     * This method is called automatically by embed() and embedBatch()
     */
    async ensureInitialized() {
        // Already initialized
        if (this.model) {
            return;
        }
        // Initialization already in progress, wait for it
        if (this.initPromise) {
            await this.initPromise;
            return;
        }
        // Start initialization
        console.error('Embedder: First use detected. Initializing model (downloading ~90MB, may take 1-2 minutes)...');
        this.initPromise = this.initialize().catch((error) => {
            // Clear initPromise on failure to allow retry
            this.initPromise = null;
            // Enhance error message with detailed guidance
            throw new EmbeddingError(`Failed to initialize embedder on first use: ${error.message}\n\nPossible causes:\n  • Network connectivity issues during model download\n  • Insufficient disk space (need ~90MB)\n  • Corrupted model cache\n\nRecommended actions:\n  1. Check your internet connection and try again\n  2. Ensure sufficient disk space is available\n  3. If problem persists, delete cache: ${this.config.cacheDir}\n  4. Then retry your query\n`, error);
        });
        await this.initPromise;
    }
    /**
     * Convert single text to embedding vector
     *
     * @param text - Text
     * @returns Embedding vector (dimension depends on model)
     */
    async embed(text) {
        // Lazy initialization: initialize on first use if not already initialized
        await this.ensureInitialized();
        try {
            // Fail-fast for empty string: cannot generate meaningful embedding
            if (text.length === 0) {
                throw new EmbeddingError('Cannot generate embedding for empty text');
            }
            // Use type assertion to avoid complex Transformers.js type definitions
            // This is due to external library type definition constraints, runtime behavior is guaranteed
            const options = { pooling: 'mean', normalize: true };
            const modelCall = this.model;
            const output = await modelCall(text, options);
            // Access raw data via .data property
            const embedding = Array.from(output.data);
            return embedding;
        }
        catch (error) {
            if (error instanceof EmbeddingError) {
                throw error;
            }
            throw new EmbeddingError(`Failed to generate embedding: ${error.message}`, error);
        }
    }
    /**
     * Convert multiple texts to embedding vectors with batch processing
     *
     * @param texts - Array of texts
     * @returns Array of embedding vectors (dimension depends on model)
     */
    async embedBatch(texts) {
        // Lazy initialization: initialize on first use if not already initialized
        await this.ensureInitialized();
        if (texts.length === 0) {
            return [];
        }
        try {
            const embeddings = [];
            // Process in batches according to batch size
            for (let i = 0; i < texts.length; i += this.config.batchSize) {
                const batch = texts.slice(i, i + this.config.batchSize);
                const batchEmbeddings = await Promise.all(batch.map((text) => this.embed(text)));
                embeddings.push(...batchEmbeddings);
            }
            return embeddings;
        }
        catch (error) {
            throw new EmbeddingError(`Failed to generate batch embeddings: ${error.message}`, error);
        }
    }
}
exports.Embedder = Embedder;
//# sourceMappingURL=index.js.map