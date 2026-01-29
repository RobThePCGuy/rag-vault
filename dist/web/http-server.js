"use strict";
// HTTP server for web frontend
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHttpServerWithManager = createHttpServerWithManager;
exports.createHttpServer = createHttpServer;
exports.startServer = startServer;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const compression_1 = __importDefault(require("compression"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const file_type_1 = require("file-type");
const helmet_1 = __importDefault(require("helmet"));
const multer_1 = __importDefault(require("multer"));
const api_routes_js_1 = require("./api-routes.js");
const config_routes_js_1 = require("./config-routes.js");
const index_js_1 = require("./middleware/index.js");
// ============================================
// Constants
// ============================================
/** Default JSON body limit (5MB) - prevents DoS from large payloads */
const DEFAULT_JSON_LIMIT = '5mb';
/** Default allowed CORS origins (localhost only for security) */
const DEFAULT_CORS_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
];
/** File size limit for uploads (100MB) */
const FILE_SIZE_LIMIT_BYTES = 100 * 1024 * 1024;
/** Default request timeout (30 seconds) */
const DEFAULT_REQUEST_TIMEOUT_MS = 30000;
/** Upload/ingest timeout (5 minutes - embedding models can be slow) */
const UPLOAD_TIMEOUT_MS = 300000;
/** Minimum allowed request timeout (1 second) */
const MIN_REQUEST_TIMEOUT_MS = 1000;
/**
 * Get request timeout from environment variable or use default
 * @returns Request timeout in milliseconds
 */
function getRequestTimeoutMs() {
    const envValue = process.env['REQUEST_TIMEOUT_MS'];
    if (!envValue)
        return DEFAULT_REQUEST_TIMEOUT_MS;
    const parsed = Number.parseInt(envValue, 10);
    if (Number.isNaN(parsed) || parsed < MIN_REQUEST_TIMEOUT_MS) {
        console.warn(`Invalid REQUEST_TIMEOUT_MS value "${envValue}". Using default ${DEFAULT_REQUEST_TIMEOUT_MS}ms.`);
        return DEFAULT_REQUEST_TIMEOUT_MS;
    }
    return parsed;
}
/** Allowed MIME types for file uploads (validated by magic bytes) */
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/html',
    'application/json',
];
/**
 * Create and configure Express app with DatabaseManager
 */
async function createHttpServerWithManager(dbManager, config) {
    // Create server accessor
    const serverAccessor = () => {
        return dbManager.getServer();
    };
    // Create config router to add before error handlers
    const configRouter = (0, config_routes_js_1.createConfigRouter)(dbManager);
    const app = await createHttpServerInternal(serverAccessor, config, configRouter);
    return app;
}
/**
 * Create and configure Express app (legacy - direct RAGServer)
 */
async function createHttpServer(ragServer, config) {
    return createHttpServerInternal(() => ragServer, config);
}
/**
 * Internal function to create Express app
 */
/**
 * Validate file content using magic bytes
 * Returns true if file type is allowed, false otherwise
 */
async function validateFileContent(filePath) {
    try {
        const buffer = await (0, promises_1.readFile)(filePath);
        const type = await (0, file_type_1.fileTypeFromBuffer)(buffer);
        // Allow text files which may not have magic bytes
        if (!type) {
            // Check if it's likely a text file by looking for common text patterns
            const sample = buffer.subarray(0, 1024).toString('utf-8');
            const isLikelyText = !sample.includes('\x00'); // No null bytes
            return isLikelyText;
        }
        return ALLOWED_MIME_TYPES.includes(type.mime);
    }
    catch {
        return false;
    }
}
/** Routes that need longer timeout (upload/ingest with slow embedding models) */
const LONG_TIMEOUT_ROUTES = ['/v1/files/upload', '/v1/data'];
/**
 * Request timeout middleware
 * Aborts requests that take longer than the specified timeout
 * Uses longer timeout for upload/ingest routes (embedding can be slow)
 */
function requestTimeout(defaultTimeoutMs) {
    return (req, res, next) => {
        // Use longer timeout for upload/ingest routes (req.path is relative to mount point)
        const timeoutMs = LONG_TIMEOUT_ROUTES.some((route) => req.path.startsWith(route))
            ? UPLOAD_TIMEOUT_MS
            : defaultTimeoutMs;
        const timeoutId = setTimeout(() => {
            if (!res.headersSent) {
                res.status(503).json({
                    error: 'Request timeout',
                    code: 'REQUEST_TIMEOUT',
                });
            }
        }, timeoutMs);
        res.on('finish', () => clearTimeout(timeoutId));
        res.on('close', () => clearTimeout(timeoutId));
        next();
    };
}
/**
 * Parse CORS origins from environment variable with validation
 */
function parseCorsOrigins(env) {
    if (!env || env.trim() === '')
        return DEFAULT_CORS_ORIGINS;
    if (env === '*') {
        console.warn('[SECURITY] CORS_ORIGINS="*" allows all origins. This is not recommended for production environments.');
        return '*';
    }
    return env
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
}
async function createHttpServerInternal(serverAccessor, config, configRouter) {
    const app = (0, express_1.default)();
    // Security headers (helmet)
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"], // For Tailwind CSS
                imgSrc: ["'self'", 'data:'],
                connectSrc: ["'self'"],
            },
        },
    }));
    // Response compression
    app.use((0, compression_1.default)());
    // Request timeout for API routes (configurable via REQUEST_TIMEOUT_MS env var)
    // Upload/ingest routes automatically get longer timeout (5 min) for slow embedding models
    app.use('/api', requestTimeout(getRequestTimeoutMs()));
    // CORS configuration
    // CORS_ORIGINS env var: comma-separated list of allowed origins, or "*" for all
    const corsOrigins = parseCorsOrigins(process.env['CORS_ORIGINS']);
    app.use((0, cors_1.default)({
        origin: corsOrigins,
        methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    }));
    // JSON body parser with size limit to prevent DoS
    const jsonLimit = process.env['JSON_BODY_LIMIT'] || DEFAULT_JSON_LIMIT;
    app.use(express_1.default.json({ limit: jsonLimit }));
    // Request ID tracking for tracing and debugging
    app.use((req, res, next) => {
        const requestId = req.headers['x-request-id'] || (0, node_crypto_1.randomUUID)();
        res.setHeader('X-Request-ID', requestId);
        next();
    });
    // Request logging (enabled when REQUEST_LOGGING=true)
    if ((0, index_js_1.isRequestLoggingEnabled)()) {
        app.use((0, index_js_1.createRequestLogger)());
    }
    // Rate limiting (configurable via RATE_LIMIT_* env vars)
    const rateLimitConfig = (0, index_js_1.getRateLimitConfigFromEnv)();
    app.use('/api', (0, index_js_1.createRateLimiter)(rateLimitConfig));
    // API Key authentication (enabled when RAG_API_KEY env var is set)
    app.use('/api', index_js_1.apiKeyAuth);
    // Ensure upload directory exists
    if (!(0, node_fs_1.existsSync)(config.uploadDir)) {
        await (0, promises_1.mkdir)(config.uploadDir, { recursive: true });
    }
    // Configure multer for file uploads
    const storage = multer_1.default.diskStorage({
        destination: (_req, _file, cb) => {
            cb(null, config.uploadDir);
        },
        filename: (_req, file, cb) => {
            // Preserve original filename with timestamp prefix
            const timestamp = Date.now();
            const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            cb(null, `${timestamp}-${safeName}`);
        },
    });
    const upload = (0, multer_1.default)({
        storage,
        limits: {
            fileSize: FILE_SIZE_LIMIT_BYTES,
        },
        fileFilter: (_req, file, cb) => {
            // Allow common document types by MIME type or extension
            const allowedExtensions = ['.pdf', '.docx', '.txt', '.md', '.html', '.json'];
            const ext = node_path_1.default.extname(file.originalname).toLowerCase();
            if (ALLOWED_MIME_TYPES.includes(file.mimetype) || allowedExtensions.includes(ext)) {
                cb(null, true);
            }
            else {
                cb(new Error(`File type not allowed: ${file.mimetype}`));
            }
        },
    });
    // API routes
    const apiRouter = (0, api_routes_js_1.createApiRouter)(serverAccessor);
    // Apply multer middleware to upload endpoint with magic byte validation
    app.use('/api/v1/files/upload', upload.single('file'), async (req, res, next) => {
        // Multer adds file to req.file
        const file = req.file;
        if (file) {
            // Validate file content using magic bytes
            const isValid = await validateFileContent(file.path);
            if (!isValid) {
                // Delete the uploaded file
                const { unlink } = await Promise.resolve().then(() => __importStar(require('node:fs/promises')));
                try {
                    await unlink(file.path);
                }
                catch {
                    // Ignore deletion errors
                }
                res.status(400).json({
                    error: 'File content does not match allowed types',
                    code: 'INVALID_FILE_CONTENT',
                });
                return;
            }
        }
        next();
    });
    app.use('/api/v1', apiRouter);
    // Add config routes if provided (must be before error handlers)
    if (configRouter) {
        app.use('/api/v1/config', configRouter);
    }
    // Serve static files in production
    if (config.staticDir && (0, node_fs_1.existsSync)(config.staticDir)) {
        app.use(express_1.default.static(config.staticDir));
        // SPA fallback - serve index.html for all non-API routes
        app.get('*', (req, res) => {
            if (!req.path.startsWith('/api/')) {
                res.sendFile(node_path_1.default.join(config.staticDir, 'index.html'));
            }
        });
    }
    // 404 handler for API routes
    app.use('/api/*', index_js_1.notFoundHandler);
    // Error handling middleware
    app.use(index_js_1.errorHandler);
    return app;
}
/**
 * Start HTTP server
 */
function startServer(app, port) {
    return new Promise((resolve) => {
        app.listen(port, () => {
            console.log(`Web server running at http://localhost:${port}`);
            resolve();
        });
    });
}
//# sourceMappingURL=http-server.js.map