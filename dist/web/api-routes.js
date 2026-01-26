"use strict";
// REST API routes for web frontend
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiRouter = createApiRouter;
const express_1 = require("express");
const index_js_1 = require("../errors/index.js");
const index_js_2 = require("./middleware/index.js");
/**
 * Create API router with all endpoints
 */
function createApiRouter(server) {
    const router = (0, express_1.Router)();
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
        // Use the uploaded file path
        const result = await server.handleIngestFile({ filePath: file.path });
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
        const result = await server.handleIngestData({ content, metadata });
        const data = JSON.parse(result.content[0].text);
        res.json(data);
    }));
    // GET /api/v1/files - List ingested files
    router.get('/files', (0, index_js_2.asyncHandler)(async (_req, res) => {
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
        const result = await server.handleDeleteFile(deleteInput);
        const data = JSON.parse(result.content[0].text);
        res.json(data);
    }));
    // GET /api/v1/status - System status
    router.get('/status', (0, index_js_2.asyncHandler)(async (_req, res) => {
        const result = await server.handleStatus();
        const data = JSON.parse(result.content[0].text);
        res.json(data);
    }));
    return router;
}
//# sourceMappingURL=api-routes.js.map