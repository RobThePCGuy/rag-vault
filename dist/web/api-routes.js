"use strict";
// REST API routes for web frontend
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiRouter = createApiRouter;
const node_path_1 = __importDefault(require("node:path"));
const express_1 = require("express");
const index_js_1 = require("../errors/index.js");
const index_js_2 = require("./middleware/index.js");
/**
 * Create API router with all endpoints
 * @param serverOrAccessor - RAGServer instance or accessor function
 */
function createApiRouter(serverOrAccessor) {
    const router = (0, express_1.Router)();
    // Helper to get server (supports both direct instance and accessor function)
    const getServer = () => {
        if (typeof serverOrAccessor === 'function') {
            return serverOrAccessor();
        }
        return serverOrAccessor;
    };
    // POST /api/v1/search - Search documents
    router.post('/search', (0, index_js_2.asyncHandler)(async (req, res) => {
        const { query, limit } = req.body;
        if (!query || typeof query !== 'string') {
            throw new index_js_1.ValidationError('Query is required and must be a string');
        }
        const queryInput = { query };
        if (limit !== undefined) {
            queryInput.limit = limit;
        }
        const server = getServer();
        const result = await server.handleQueryDocuments(queryInput);
        const data = JSON.parse(result.content[0].text);
        res.json({ results: data });
    }));
    // POST /api/v1/files/upload - Upload files (multipart)
    router.post('/files/upload', (0, index_js_2.asyncHandler)(async (req, res) => {
        // File is attached by multer middleware
        const file = req.file;
        if (!file) {
            throw new index_js_1.ValidationError('No file uploaded');
        }
        // Use the uploaded file path (convert to absolute)
        const server = getServer();
        const absolutePath = node_path_1.default.resolve(file.path);
        const result = await server.handleIngestFile({ filePath: absolutePath });
        const data = JSON.parse(result.content[0].text);
        res.json(data);
    }));
    // POST /api/v1/data - Ingest content strings
    router.post('/data', (0, index_js_2.asyncHandler)(async (req, res) => {
        const { content, metadata } = req.body;
        if (!content || typeof content !== 'string') {
            throw new index_js_1.ValidationError('Content is required and must be a string');
        }
        if (!metadata || !metadata.source || !metadata.format) {
            throw new index_js_1.ValidationError('Metadata with source and format is required');
        }
        const server = getServer();
        const result = await server.handleIngestData({ content, metadata });
        const data = JSON.parse(result.content[0].text);
        res.json(data);
    }));
    // GET /api/v1/files - List ingested files
    router.get('/files', (0, index_js_2.asyncHandler)(async (_req, res) => {
        const server = getServer();
        const result = await server.handleListFiles();
        const data = JSON.parse(result.content[0].text);
        res.json({ files: data });
    }));
    // DELETE /api/v1/files - Delete file/source
    router.delete('/files', (0, index_js_2.asyncHandler)(async (req, res) => {
        const { filePath, source } = req.body;
        if (!filePath && !source) {
            throw new index_js_1.ValidationError('Either filePath or source is required');
        }
        const deleteInput = {};
        if (filePath !== undefined) {
            deleteInput.filePath = filePath;
        }
        if (source !== undefined) {
            deleteInput.source = source;
        }
        const server = getServer();
        const result = await server.handleDeleteFile(deleteInput);
        const data = JSON.parse(result.content[0].text);
        res.json(data);
    }));
    // GET /api/v1/status - System status
    router.get('/status', (0, index_js_2.asyncHandler)(async (_req, res) => {
        const server = getServer();
        const result = await server.handleStatus();
        const data = JSON.parse(result.content[0].text);
        res.json(data);
    }));
    return router;
}
//# sourceMappingURL=api-routes.js.map