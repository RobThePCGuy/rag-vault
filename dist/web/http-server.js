// HTTP server for web frontend
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import { fileTypeFromBuffer } from 'file-type';
import helmet from 'helmet';
import multer from 'multer';
import { createApiRouter } from './api-routes.js';
import { createConfigRouter } from './config-routes.js';
import { apiKeyAuth, createRateLimiter, createRequestLogger, errorHandler, getRateLimitConfigFromEnv, isRequestLoggingEnabled, notFoundHandler, } from './middleware/index.js';
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
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
/** Upload/ingest timeout (5 minutes - embedding models can be slow) */
const UPLOAD_TIMEOUT_MS = 300_000;
/** Minimum allowed request timeout (1 second) */
const MIN_REQUEST_TIMEOUT_MS = 1_000;
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
    'application/x-ndjson',
    'application/ndjson',
    'application/jsonl',
];
/**
 * Create and configure Express app with DatabaseManager
 */
export async function createHttpServerWithManager(dbManager, config) {
    // Create server accessor
    const serverAccessor = () => {
        return dbManager.getServer();
    };
    // Create config router to add before error handlers
    const configRouter = createConfigRouter(dbManager);
    const app = await createHttpServerInternal(serverAccessor, config, configRouter);
    return app;
}
/**
 * Create and configure Express app (legacy - direct RAGServer)
 */
export async function createHttpServer(ragServer, config) {
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
        const buffer = await readFile(filePath);
        const type = await fileTypeFromBuffer(buffer);
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
        // Clear timeout on all completion scenarios to prevent memory leaks
        res.on('finish', () => clearTimeout(timeoutId));
        res.on('close', () => clearTimeout(timeoutId));
        res.on('error', () => clearTimeout(timeoutId));
        req.on('aborted', () => clearTimeout(timeoutId));
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
    const app = express();
    // Security headers (helmet)
    app.use(helmet({
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
    app.use(compression());
    // Request timeout for API routes (configurable via REQUEST_TIMEOUT_MS env var)
    // Upload/ingest routes automatically get longer timeout (5 min) for slow embedding models
    app.use('/api', requestTimeout(getRequestTimeoutMs()));
    // CORS configuration
    // CORS_ORIGINS env var: comma-separated list of allowed origins, or "*" for all
    const corsOrigins = parseCorsOrigins(process.env['CORS_ORIGINS']);
    app.use(cors({
        origin: corsOrigins,
        methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    }));
    // JSON body parser with size limit to prevent DoS
    const jsonLimit = process.env['JSON_BODY_LIMIT'] || DEFAULT_JSON_LIMIT;
    app.use(express.json({ limit: jsonLimit }));
    // Request ID tracking for tracing and debugging
    app.use((req, res, next) => {
        const requestId = req.headers['x-request-id'] || randomUUID();
        res.setHeader('X-Request-ID', requestId);
        next();
    });
    // Request logging (enabled when REQUEST_LOGGING=true)
    if (isRequestLoggingEnabled()) {
        app.use(createRequestLogger());
    }
    // Rate limiting (configurable via RATE_LIMIT_* env vars)
    const rateLimitConfig = getRateLimitConfigFromEnv();
    app.use('/api', createRateLimiter(rateLimitConfig));
    // API Key authentication (enabled when RAG_API_KEY env var is set)
    app.use('/api', apiKeyAuth);
    // Ensure upload directory exists
    if (!existsSync(config.uploadDir)) {
        await mkdir(config.uploadDir, { recursive: true });
    }
    // Configure multer for file uploads
    const storage = multer.diskStorage({
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
    const upload = multer({
        storage,
        limits: {
            fileSize: FILE_SIZE_LIMIT_BYTES,
        },
        fileFilter: (_req, file, cb) => {
            // Allow common document types by MIME type or extension
            const allowedExtensions = [
                '.pdf',
                '.docx',
                '.txt',
                '.md',
                '.html',
                '.json',
                '.jsonl',
                '.ndjson',
            ];
            const ext = path.extname(file.originalname).toLowerCase();
            if (ALLOWED_MIME_TYPES.includes(file.mimetype) || allowedExtensions.includes(ext)) {
                cb(null, true);
            }
            else {
                cb(new Error(`File type not allowed: ${file.mimetype}`));
            }
        },
    });
    // API routes
    const apiRouter = createApiRouter(serverAccessor);
    // Apply multer middleware to upload endpoint with magic byte validation
    app.use('/api/v1/files/upload', upload.single('file'), async (req, res, next) => {
        // Multer adds file to req.file
        const file = req.file;
        if (file) {
            // Validate file content using magic bytes
            const isValid = await validateFileContent(file.path);
            if (!isValid) {
                // Delete the uploaded file
                const { unlink } = await import('node:fs/promises');
                try {
                    await unlink(file.path);
                }
                catch (unlinkError) {
                    // Log deletion errors for debugging (may indicate permission issues)
                    console.warn(`Failed to delete invalid upload file: ${file.path}`, unlinkError);
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
    if (config.staticDir && existsSync(config.staticDir)) {
        app.use(express.static(config.staticDir));
        // SPA fallback - serve index.html for all non-API routes
        app.get('*', (req, res) => {
            if (!req.path.startsWith('/api/')) {
                res.sendFile(path.join(config.staticDir, 'index.html'));
            }
        });
    }
    // 404 handler for API routes
    // NOTE: Express 5 no longer accepts unnamed wildcards like '/api/*'.
    // Mount on '/api' after all API routers so only unmatched API requests reach this handler.
    app.use('/api', notFoundHandler);
    // Error handling middleware
    app.use(errorHandler);
    return app;
}
/**
 * Start HTTP server
 */
export function startServer(app, port) {
    return new Promise((resolve, reject) => {
        const server = app.listen(port);
        const onError = (error) => {
            server.off('listening', onListening);
            reject(error);
        };
        const onListening = () => {
            server.off('error', onError);
            console.log(`Web server running at http://localhost:${port}`);
            resolve();
        };
        server.once('error', onError);
        server.once('listening', onListening);
    });
}
//# sourceMappingURL=http-server.js.map