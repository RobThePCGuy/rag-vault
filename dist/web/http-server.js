"use strict";
// HTTP server for web frontend
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHttpServer = createHttpServer;
exports.startServer = startServer;
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const api_routes_js_1 = require("./api-routes.js");
const index_js_1 = require("./middleware/index.js");
/**
 * Create and configure Express app
 */
async function createHttpServer(ragServer, config) {
    const app = (0, express_1.default)();
    // Middleware
    app.use((0, cors_1.default)());
    app.use(express_1.default.json({ limit: '50mb' }));
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
            fileSize: 100 * 1024 * 1024, // 100MB
        },
        fileFilter: (_req, file, cb) => {
            // Allow common document types
            const allowedTypes = [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
                'text/markdown',
                'text/html',
                'application/json',
            ];
            const allowedExtensions = ['.pdf', '.docx', '.txt', '.md', '.html', '.json'];
            const ext = node_path_1.default.extname(file.originalname).toLowerCase();
            if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
                cb(null, true);
            }
            else {
                cb(new Error(`File type not allowed: ${file.mimetype}`));
            }
        },
    });
    // API routes
    const apiRouter = (0, api_routes_js_1.createApiRouter)(ragServer);
    // Apply multer middleware to upload endpoint
    app.use('/api/v1/files/upload', upload.single('file'), (_req, _res, next) => {
        // Multer adds file to req.file
        next();
    });
    app.use('/api/v1', apiRouter);
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