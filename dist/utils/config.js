"use strict";
// Shared configuration builder for RAG servers
// Used by both MCP server (src/index.ts) and Web server (src/web/index.ts)
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRAGConfig = buildRAGConfig;
const config_parsers_js_1 = require("./config-parsers.js");
/**
 * Default configuration values
 */
const DEFAULTS = {
    dbPath: './lancedb/',
    modelName: 'Xenova/all-MiniLM-L6-v2',
    cacheDir: './models/',
    maxFileSize: 104857600, // 100MB
};
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
function buildRAGConfig(overrides) {
    const config = {
        dbPath: process.env['DB_PATH'] || overrides?.dbPath || DEFAULTS.dbPath,
        modelName: process.env['MODEL_NAME'] || overrides?.modelName || DEFAULTS.modelName,
        cacheDir: process.env['CACHE_DIR'] || overrides?.cacheDir || DEFAULTS.cacheDir,
        baseDir: process.env['BASE_DIR'] || overrides?.baseDir || process.cwd(),
        maxFileSize: Number.parseInt(process.env['MAX_FILE_SIZE'] || String(overrides?.maxFileSize || DEFAULTS.maxFileSize), 10),
    };
    // Add quality filter settings only if defined
    const maxDistance = (0, config_parsers_js_1.parseMaxDistance)(process.env['RAG_MAX_DISTANCE']) ?? overrides?.maxDistance;
    const grouping = (0, config_parsers_js_1.parseGroupingMode)(process.env['RAG_GROUPING']) ?? overrides?.grouping;
    const hybridWeight = (0, config_parsers_js_1.parseHybridWeight)(process.env['RAG_HYBRID_WEIGHT']) ?? overrides?.hybridWeight;
    if (maxDistance !== undefined) {
        config.maxDistance = maxDistance;
    }
    if (grouping !== undefined) {
        config.grouping = grouping;
    }
    if (hybridWeight !== undefined) {
        config.hybridWeight = hybridWeight;
    }
    return config;
}
//# sourceMappingURL=config.js.map