// Embedder implementation with Transformers.js
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { env, pipeline } from '@huggingface/transformers';
import { EmbeddingError } from '../errors/index.js';
// Re-export error class for backwards compatibility
export { EmbeddingError } from '../errors/index.js';
const SUPPORTED_EMBEDDING_DEVICES = [
    'auto',
    'gpu',
    'cpu',
    'wasm',
    'webgpu',
    'cuda',
    'dml',
    'webnn',
    'webnn-npu',
    'webnn-gpu',
    'webnn-cpu',
];
const SUPPORTED_EMBEDDING_DEVICE_SET = new Set(SUPPORTED_EMBEDDING_DEVICES);
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
    model = null;
    initPromise = null;
    config;
    constructor(config) {
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
            env.cacheDir = this.config.cacheDir;
            const device = this.resolveDevice();
            console.error(`Embedder: Setting cache directory to "${this.config.cacheDir}"`);
            console.error(`Embedder: Using device preference "${device}"`);
            console.error(`Embedder: Loading model "${this.config.modelPath}"...`);
            // Use type assertion to avoid TS2590 (union type too complex with @types/jsdom)
            this.model = await pipeline('feature-extraction', this.config.modelPath, { device });
            console.error('Embedder: Model loaded successfully');
        }
        catch (error) {
            // Some ONNX caches fail with "Protobuf parsing failed". Retry once with isolated cache path.
            if (this.isRecoverableCacheError(error)) {
                const recoveryCacheDir = this.getRecoveryCacheDir();
                console.error(`Embedder: Detected corrupted model cache. Retrying with isolated cache: "${recoveryCacheDir}"`);
                try {
                    await mkdir(recoveryCacheDir, { recursive: true });
                    env.cacheDir = recoveryCacheDir;
                    const device = this.resolveDevice();
                    this.model = await pipeline('feature-extraction', this.config.modelPath, { device });
                    console.error('Embedder: Model loaded successfully via recovery cache');
                    return;
                }
                catch (recoveryError) {
                    throw new EmbeddingError(`Failed to initialize Embedder after cache recovery attempt: ${recoveryError.message}`, recoveryError);
                }
            }
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
     * @param signal - Optional AbortSignal for cancellation support
     * @returns Array of embedding vectors (dimension depends on model)
     */
    async embedBatch(texts, signal) {
        // Lazy initialization: initialize on first use if not already initialized
        await this.ensureInitialized();
        if (texts.length === 0) {
            return [];
        }
        try {
            const embeddings = [];
            // Process in batches according to batch size
            for (let i = 0; i < texts.length; i += this.config.batchSize) {
                // Check for cancellation before each batch
                if (signal?.aborted) {
                    throw new EmbeddingError('Embedding operation was cancelled');
                }
                const batch = texts.slice(i, i + this.config.batchSize);
                const batchEmbeddings = await Promise.all(batch.map((text) => this.embed(text)));
                embeddings.push(...batchEmbeddings);
            }
            return embeddings;
        }
        catch (error) {
            if (error instanceof EmbeddingError) {
                throw error;
            }
            const message = error instanceof Error ? error.message : String(error);
            throw new EmbeddingError(`Failed to generate batch embeddings: ${message}`, error instanceof Error ? error : undefined);
        }
    }
    /**
     * Detect known cache-corruption signatures from ONNX/protobuf loaders.
     */
    isRecoverableCacheError(error) {
        if (!(error instanceof Error)) {
            return false;
        }
        const message = error.message.toLowerCase();
        return (message.includes('protobuf parsing failed') ||
            (message.includes('protobuf') && message.includes('failed to parse')));
    }
    /**
     * Build a model-specific fallback cache path to avoid reusing corrupted artifacts.
     */
    getRecoveryCacheDir() {
        const safeModelName = this.config.modelPath.replace(/[^a-z0-9_./-]/gi, '_').replace(/\//g, '__');
        return path.join(this.config.cacheDir, '.recovery-cache', safeModelName);
    }
    /**
     * Resolve device preference for Transformers.js.
     * Priority: constructor config -> RAG_EMBEDDING_DEVICE env -> auto
     */
    resolveDevice() {
        const rawDevice = this.config.device ?? process.env['RAG_EMBEDDING_DEVICE'] ?? 'auto';
        const normalized = rawDevice.trim().toLowerCase();
        if (normalized === 'directml') {
            return 'dml';
        }
        if (SUPPORTED_EMBEDDING_DEVICE_SET.has(normalized)) {
            return normalized;
        }
        console.warn(`Embedder: Unsupported device "${rawDevice}". Falling back to "auto". Supported values: ${SUPPORTED_EMBEDDING_DEVICES.join(', ')}`);
        return 'auto';
    }
}
//# sourceMappingURL=index.js.map