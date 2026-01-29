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
const index_js_2 = require("../explainability/index.js");
const index_js_3 = require("../flywheel/index.js");
const index_js_4 = require("./middleware/index.js");
/**
 * Extract text from a RAG server response with proper bounds checking
 * @throws RAGError if the response format is invalid
 */
function extractResultText(result) {
    if (!result.content || !Array.isArray(result.content) || result.content.length === 0) {
        throw new index_js_1.RAGError('Malformed server response: missing content array', {
            statusCode: 500,
        });
    }
    const firstContent = result.content[0];
    if (!firstContent || typeof firstContent.text !== 'string') {
        throw new index_js_1.RAGError('Malformed server response: missing text in content', {
            statusCode: 500,
        });
    }
    return firstContent.text;
}
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
    router.post('/search', (0, index_js_4.asyncHandler)(async (req, res) => {
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
        const data = JSON.parse(extractResultText(result));
        res.json({ results: data });
    }));
    // POST /api/v1/files/upload - Upload files (multipart)
    router.post('/files/upload', (0, index_js_4.asyncHandler)(async (req, res) => {
        // File is attached by multer middleware
        const file = req.file;
        if (!file) {
            throw new index_js_1.ValidationError('No file uploaded');
        }
        // Use the uploaded file path (convert to absolute)
        const server = getServer();
        const absolutePath = node_path_1.default.resolve(file.path);
        const result = await server.handleIngestFile({ filePath: absolutePath });
        const data = JSON.parse(extractResultText(result));
        res.json(data);
    }));
    // POST /api/v1/data - Ingest content strings
    router.post('/data', (0, index_js_4.asyncHandler)(async (req, res) => {
        const { content, metadata } = req.body;
        if (!content || typeof content !== 'string') {
            throw new index_js_1.ValidationError('Content is required and must be a string');
        }
        if (!metadata || !metadata.source || !metadata.format) {
            throw new index_js_1.ValidationError('Metadata with source and format is required');
        }
        const server = getServer();
        const result = await server.handleIngestData({ content, metadata });
        const data = JSON.parse(extractResultText(result));
        res.json(data);
    }));
    // GET /api/v1/files - List ingested files
    router.get('/files', (0, index_js_4.asyncHandler)(async (_req, res) => {
        const server = getServer();
        const result = await server.handleListFiles();
        const data = JSON.parse(extractResultText(result));
        res.json({ files: data });
    }));
    // DELETE /api/v1/files - Delete file/source
    router.delete('/files', (0, index_js_4.asyncHandler)(async (req, res) => {
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
        const data = JSON.parse(extractResultText(result));
        res.json(data);
    }));
    // GET /api/v1/status - System status
    router.get('/status', (0, index_js_4.asyncHandler)(async (_req, res) => {
        const server = getServer();
        const result = await server.handleStatus();
        const data = JSON.parse(extractResultText(result));
        res.json(data);
    }));
    // GET /api/v1/health - Lightweight health check for load balancers
    router.get('/health', (_req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
        });
    });
    // ============================================
    // Reader Feature Endpoints
    // ============================================
    // GET /api/v1/documents/chunks - Get all chunks for a document
    router.get('/documents/chunks', (0, index_js_4.asyncHandler)(async (req, res) => {
        const filePath = req.query['filePath'];
        if (!filePath || typeof filePath !== 'string') {
            throw new index_js_1.ValidationError('filePath query parameter is required');
        }
        const server = getServer();
        const result = await server.handleGetDocumentChunks(filePath);
        const data = JSON.parse(extractResultText(result));
        res.json({ chunks: data });
    }));
    // GET /api/v1/chunks/related - Get related chunks for a specific chunk
    router.get('/chunks/related', (0, index_js_4.asyncHandler)(async (req, res) => {
        const filePath = req.query['filePath'];
        const chunkIndexStr = req.query['chunkIndex'];
        const limitStr = req.query['limit'];
        const excludeSameDocStr = req.query['excludeSameDoc'];
        const includeExplanationStr = req.query['includeExplanation'];
        if (!filePath || typeof filePath !== 'string') {
            throw new index_js_1.ValidationError('filePath query parameter is required');
        }
        if (!chunkIndexStr) {
            throw new index_js_1.ValidationError('chunkIndex query parameter is required');
        }
        const chunkIndex = Number.parseInt(chunkIndexStr, 10);
        if (Number.isNaN(chunkIndex) || chunkIndex < 0) {
            throw new index_js_1.ValidationError('chunkIndex must be a non-negative integer');
        }
        const limit = limitStr ? Number.parseInt(limitStr, 10) : undefined;
        if (limit !== undefined && (Number.isNaN(limit) || limit < 1 || limit > 20)) {
            throw new index_js_1.ValidationError('limit must be between 1 and 20');
        }
        const excludeSameDocument = excludeSameDocStr !== 'false';
        const includeExplanation = includeExplanationStr === 'true';
        const server = getServer();
        const result = await server.handleFindRelatedChunks(filePath, chunkIndex, limit, excludeSameDocument);
        const data = JSON.parse(extractResultText(result));
        // Add explanations if requested (Explainability feature)
        if (includeExplanation) {
            // Get source chunk text for comparison
            const sourceChunkResult = await server.handleGetDocumentChunks(filePath);
            const sourceChunks = JSON.parse(extractResultText(sourceChunkResult));
            const sourceChunk = sourceChunks.find((c) => c.chunkIndex === chunkIndex);
            const sourceText = sourceChunk?.text || '';
            const dataWithExplanation = data.map((chunk) => ({
                ...chunk,
                explanation: (0, index_js_2.explainChunkSimilarity)(sourceText, chunk.text, chunk.filePath === filePath, chunk.score),
            }));
            res.json({ related: dataWithExplanation });
        }
        else {
            res.json({ related: data });
        }
    }));
    // POST /api/v1/chunks/batch-related - Batch get related chunks
    router.post('/chunks/batch-related', (0, index_js_4.asyncHandler)(async (req, res) => {
        const { chunks, limit } = req.body;
        if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
            throw new index_js_1.ValidationError('chunks array is required and must not be empty');
        }
        // Validate each chunk
        for (const chunk of chunks) {
            if (!chunk.filePath || typeof chunk.filePath !== 'string') {
                throw new index_js_1.ValidationError('Each chunk must have a filePath string');
            }
            if (typeof chunk.chunkIndex !== 'number' || chunk.chunkIndex < 0) {
                throw new index_js_1.ValidationError('Each chunk must have a non-negative chunkIndex');
            }
        }
        if (limit !== undefined && (typeof limit !== 'number' || limit < 1 || limit > 20)) {
            throw new index_js_1.ValidationError('limit must be between 1 and 20');
        }
        const server = getServer();
        const result = await server.handleBatchFindRelatedChunks(chunks, limit);
        const data = JSON.parse(extractResultText(result));
        res.json({ results: data });
    }));
    // POST /api/v1/feedback - Record a feedback event
    router.post('/feedback', (0, index_js_4.asyncHandler)(async (req, res) => {
        const { type, source, target } = req.body;
        // Validate event type
        const validTypes = ['pin', 'unpin', 'dismiss_inferred', 'click_related'];
        if (!type || !validTypes.includes(type)) {
            throw new index_js_1.ValidationError(`type must be one of: ${validTypes.join(', ')}`);
        }
        // Validate source
        if (!source || typeof source.filePath !== 'string' || typeof source.chunkIndex !== 'number') {
            throw new index_js_1.ValidationError('source must have filePath (string) and chunkIndex (number)');
        }
        // Validate target
        if (!target || typeof target.filePath !== 'string' || typeof target.chunkIndex !== 'number') {
            throw new index_js_1.ValidationError('target must have filePath (string) and chunkIndex (number)');
        }
        const feedbackStore = (0, index_js_3.getFeedbackStore)();
        feedbackStore.recordEvent({
            type,
            source,
            target,
            timestamp: new Date(),
        });
        res.json({ success: true });
    }));
    // GET /api/v1/feedback/stats - Get feedback statistics
    router.get('/feedback/stats', (_req, res) => {
        const feedbackStore = (0, index_js_3.getFeedbackStore)();
        const stats = feedbackStore.getStats();
        res.json(stats);
    });
    return router;
}
//# sourceMappingURL=api-routes.js.map