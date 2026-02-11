"use strict";
// RAGServer implementation with MCP tools
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGServer = void 0;
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:fs/promises");
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const index_js_1 = require("../chunker/index.js");
const index_js_2 = require("../embedder/index.js");
const index_js_3 = require("../errors/index.js");
const keywords_js_1 = require("../explainability/keywords.js");
const feedback_js_1 = require("../flywheel/feedback.js");
const html_parser_js_1 = require("../parser/html-parser.js");
const index_js_4 = require("../parser/index.js");
const index_js_5 = require("../query/index.js");
const index_js_6 = require("../vectordb/index.js");
const raw_data_utils_js_1 = require("./raw-data-utils.js");
const schemas_js_1 = require("./schemas.js");
// ============================================
// RAGServer Class
// ============================================
/**
 * RAG server compliant with MCP Protocol
 *
 * Responsibilities:
 * - MCP tool integration (6 tools)
 * - Tool handler implementation with Zod validation
 * - Error handling
 * - Initialization (LanceDB, Transformers.js)
 */
class RAGServer {
    constructor(config) {
        this.dbPath = config.dbPath;
        this.server = new mcp_js_1.McpServer({
            name: 'rag-mcp-server',
            version: '1.0.0',
        });
        // Component initialization
        // Only pass quality filter settings if they are defined
        const vectorStoreConfig = {
            dbPath: config.dbPath,
            tableName: 'chunks',
        };
        if (config.maxDistance !== undefined) {
            vectorStoreConfig.maxDistance = config.maxDistance;
        }
        if (config.grouping !== undefined) {
            vectorStoreConfig.grouping = config.grouping;
        }
        if (config.hybridWeight !== undefined) {
            vectorStoreConfig.hybridWeight = config.hybridWeight;
        }
        this.vectorStore = new index_js_6.VectorStore(vectorStoreConfig);
        this.embedder = new index_js_2.Embedder({
            modelPath: config.modelName,
            batchSize: 16,
            cacheDir: config.cacheDir,
        });
        this.chunker = new index_js_1.SemanticChunker();
        this.parser = new index_js_4.DocumentParser({
            baseDir: config.baseDir,
            maxFileSize: config.maxFileSize,
        });
        this.setupHandlers();
    }
    /**
     * Set up MCP handlers using tool() API
     * Note: Type casts are used to work around Zod version compatibility between project and SDK
     */
    setupHandlers() {
        // query_documents tool
        this.server.tool('query_documents', `Search ingested documents using hybrid semantic + keyword search. Advanced syntax supported:
- "exact phrase" → Match phrase exactly
- field:value → Filter by custom metadata (e.g., domain:legal, author:john)
- term1 AND term2 → Both terms required (default)
- term1 OR term2 → Either term matches
- -term → Exclude results containing term
Results include score (0 = most relevant, higher = less relevant). Set explain=true to see why each result matched.`, {
            query: zod_1.z.string(),
            limit: zod_1.z.number().optional(),
            explain: zod_1.z.boolean().optional(),
        }, async (args) => {
            const results = await this.executeQueryDocuments(args);
            return {
                content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
            };
        });
        // ingest_file tool
        this.server.tool('ingest_file', 'Ingest a document file (PDF, DOCX, TXT, MD, JSON, JSONL) into the vector database for semantic search. File path must be an absolute path. Supports re-ingestion to update existing documents. Optional metadata can include author, domain, tags, etc.', {
            filePath: zod_1.z.string(),
            metadata: zod_1.z.record(zod_1.z.string()).optional(),
        }, async (args) => {
            const result = await this.executeIngestFile(args);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        });
        // ingest_data tool
        this.server.tool('ingest_data', 'Ingest content as a string, not from a file. Use for: fetched web pages (format: html), copied text (format: text), or markdown strings (format: markdown). The source identifier enables re-ingestion to update existing content. Optional custom metadata can include author, domain, tags, etc. For files on disk, use ingest_file instead.', {
            content: zod_1.z.string(),
            metadata: zod_1.z.object({
                source: zod_1.z.string(),
                format: zod_1.z.enum(['text', 'html', 'markdown']),
                custom: zod_1.z.record(zod_1.z.string()).optional(),
            }),
        }, async (args) => {
            const result = await this.executeIngestData(args);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        });
        // delete_file tool (uses .refine(), so handle validation in handler)
        this.server.tool('delete_file', 'Delete a previously ingested file or data from the vector database. Use filePath for files ingested via ingest_file, or source for data ingested via ingest_data. Either filePath or source must be provided.', {
            filePath: zod_1.z.string().optional(),
            source: zod_1.z.string().optional(),
        }, async (args) => {
            // Validate with refinement separately
            const parsed = schemas_js_1.DeleteFileSchema.safeParse(args);
            if (!parsed.success) {
                throw new Error(`Invalid arguments: ${parsed.error.message}`);
            }
            const result = await this.executeDeleteFile(parsed.data);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        });
        // list_files tool
        this.server.tool('list_files', 'List all ingested files in the vector database. Returns file paths and chunk counts for each document.', {}, async () => {
            const files = await this.executeListFiles();
            return {
                content: [{ type: 'text', text: JSON.stringify(files, null, 2) }],
            };
        });
        // status tool
        this.server.tool('status', 'Get system status including total documents, total chunks, database size, and configuration information.', {}, async () => {
            const status = await this.executeStatus();
            return {
                content: [{ type: 'text', text: JSON.stringify(status, null, 2) }],
            };
        });
        // feedback_pin tool
        this.server.tool('feedback_pin', 'Pin a search result as relevant for a query. Pinned results will be boosted in future searches. Use when a result was particularly helpful.', {
            sourceQuery: zod_1.z.string().describe('The query that returned this result'),
            targetFilePath: zod_1.z.string().describe('File path of the result to pin'),
            targetChunkIndex: zod_1.z.number().describe('Chunk index of the result to pin'),
            targetFingerprint: zod_1.z
                .string()
                .optional()
                .describe('Optional fingerprint for resilient matching'),
        }, async (args) => {
            try {
                const result = this.executeFeedbackPin(args);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ error: (0, index_js_3.getErrorMessage)(error) }),
                        },
                    ],
                    isError: true,
                };
            }
        });
        // feedback_dismiss tool
        this.server.tool('feedback_dismiss', 'Dismiss a search result as irrelevant for a query. Dismissed results will be penalized in future searches. Use when a result was unhelpful.', {
            sourceQuery: zod_1.z.string().describe('The query that returned this result'),
            targetFilePath: zod_1.z.string().describe('File path of the result to dismiss'),
            targetChunkIndex: zod_1.z.number().describe('Chunk index of the result to dismiss'),
            targetFingerprint: zod_1.z
                .string()
                .optional()
                .describe('Optional fingerprint for resilient matching'),
        }, async (args) => {
            try {
                const result = this.executeFeedbackDismiss(args);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ error: (0, index_js_3.getErrorMessage)(error) }),
                        },
                    ],
                    isError: true,
                };
            }
        });
        // feedback_stats tool
        this.server.tool('feedback_stats', 'Get feedback statistics including total events, pinned pairs, and dismissed pairs.', {}, async () => {
            try {
                const stats = this.executeFeedbackStats();
                return {
                    content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }],
                };
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ error: (0, index_js_3.getErrorMessage)(error) }),
                        },
                    ],
                    isError: true,
                };
            }
        });
    }
    /**
     * Initialization
     */
    async initialize() {
        await this.vectorStore.initialize();
        console.error('RAGServer initialized');
    }
    /**
     * Close the server and release resources
     */
    async close() {
        await this.vectorStore.close();
        console.error('RAGServer closed');
    }
    /**
     * Get the current database configuration
     */
    getConfig() {
        return {
            dbPath: this.dbPath,
            modelName: this.embedder.getModelName(),
        };
    }
    /**
     * Get the current hybrid search weight
     * @returns Value between 0.0 (vector-only) and 1.0 (max keyword boost)
     */
    getHybridWeight() {
        return this.vectorStore.getHybridWeight();
    }
    /**
     * Set the hybrid search weight at runtime
     * @param weight - Value between 0.0 (vector-only) and 1.0 (max keyword boost)
     */
    setHybridWeight(weight) {
        this.vectorStore.setHybridWeight(weight);
    }
    /**
     * Execute query_documents logic (returns plain data)
     *
     * Supports advanced query syntax:
     * - "exact phrase" → Phrase matching (FTS)
     * - field:value → Metadata filter
     * - term1 AND term2 → Both required (default)
     * - term1 OR term2 → Either matches
     * - -term → Exclude term
     */
    async executeQueryDocuments(args) {
        // Parse query for advanced syntax
        const parsed = (0, index_js_5.parseQuery)(args.query);
        const semanticQuery = (0, index_js_5.toSemanticQuery)(parsed);
        // Generate query embedding from semantic terms
        const queryVector = await this.embedder.embed(semanticQuery || args.query);
        // Request extra results to account for post-filtering (capped at 20)
        const userLimit = args.limit || 10;
        const hasFilters = parsed.excludeTerms.length > 0 || parsed.filters.length > 0;
        const requestLimit = hasFilters ? Math.min(userLimit * 2, 20) : userLimit;
        // Hybrid search (vector + BM25 keyword matching)
        let searchResults = await this.vectorStore.search(queryVector, args.query, requestLimit);
        // Apply flywheel reranking based on user feedback
        const feedbackStore = (0, feedback_js_1.getFeedbackStore)();
        const sourceRef = {
            filePath: '__query__',
            chunkIndex: 0,
            fingerprint: args.query,
        };
        searchResults = feedbackStore.rerankResults(searchResults, sourceRef);
        // Apply post-search filters from parsed query
        if (parsed.excludeTerms.length > 0 || parsed.filters.length > 0) {
            searchResults = searchResults.filter((result) => {
                // Exclude results containing excluded terms
                if ((0, index_js_5.shouldExclude)(result.text, parsed.excludeTerms)) {
                    return false;
                }
                // Filter by metadata if filters specified (only if custom metadata exists)
                if (parsed.filters.length > 0 && !(0, index_js_5.matchesFilters)(result.metadata?.custom, parsed.filters)) {
                    return false;
                }
                return true;
            });
        }
        // Trim to requested limit after filtering
        searchResults = searchResults.slice(0, args.limit || 10);
        // Format results with source restoration for raw-data files
        return searchResults.map((result) => {
            const queryResult = {
                filePath: result.filePath,
                chunkIndex: result.chunkIndex,
                text: result.text,
                score: result.score,
            };
            // Restore source for raw-data files (ingested via ingest_data)
            if ((0, raw_data_utils_js_1.isManagedRawDataPath)(this.dbPath, result.filePath)) {
                const source = (0, raw_data_utils_js_1.extractSourceFromPath)(result.filePath);
                if (source) {
                    queryResult.source = source;
                }
            }
            // Include custom metadata if present
            if (result.metadata?.custom) {
                queryResult.metadata = result.metadata.custom;
            }
            // Add explanation if requested
            if (args.explain) {
                const explanation = (0, keywords_js_1.explainChunkSimilarity)(args.query, result.text, false, // Not same document (query vs result)
                result.score);
                queryResult.explanation = explanation;
            }
            return queryResult;
        });
    }
    /**
     * query_documents tool handler (for test compatibility)
     */
    async handleQueryDocuments(args) {
        try {
            const results = await this.executeQueryDocuments(args);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(results, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            console.error('Failed to query documents:', error);
            throw error;
        }
    }
    /**
     * Execute ingest_file logic (returns plain data)
     */
    async executeIngestFile(args) {
        // Parse file (with header/footer filtering for PDFs)
        // For raw-data files (from ingest_data), read directly without validation
        // since the path is internally generated and content is already processed
        const isPdf = args.filePath.toLowerCase().endsWith('.pdf');
        let text;
        if ((0, raw_data_utils_js_1.isManagedRawDataPath)(this.dbPath, args.filePath)) {
            // Raw-data files: skip validation, read directly
            text = await (0, promises_1.readFile)(args.filePath, 'utf-8');
            console.error(`Read raw-data file: ${args.filePath} (${text.length} characters)`);
        }
        else if (isPdf) {
            text = await this.parser.parsePdf(args.filePath, this.embedder);
        }
        else {
            text = await this.parser.parseFile(args.filePath);
        }
        // Split text into semantic chunks
        const chunks = await this.chunker.chunkText(text, this.embedder);
        // Generate embeddings for final chunks
        const embeddings = await this.embedder.embedBatch(chunks.map((chunk) => chunk.text));
        // Note: Full backup with vectors is not implemented because search results don't include vectors.
        // If rollback is needed, re-ingestion from the original file is required.
        // Track if this is a re-ingestion for logging purposes.
        let isReingestion = false;
        try {
            const existingFiles = await this.vectorStore.listFiles();
            const existingFile = existingFiles.find((file) => file.filePath === args.filePath);
            if (existingFile && existingFile.chunkCount > 0) {
                isReingestion = true;
                console.error(`Re-ingesting existing file: ${args.filePath} (${existingFile.chunkCount} existing chunks)`);
            }
        }
        catch (error) {
            // File check failure is warning only (for new files)
            console.warn('Failed to check existing file (new file?):', error);
        }
        // Delete existing data
        await this.vectorStore.deleteChunks(args.filePath);
        console.error(`Deleted existing chunks for: ${args.filePath}`);
        // Validate embeddings and chunks match
        if (embeddings.length !== chunks.length) {
            throw new Error(`Embedding count (${embeddings.length}) doesn't match chunk count (${chunks.length})`);
        }
        // Create vector chunks
        const timestamp = new Date().toISOString();
        const vectorChunks = chunks.map((chunk, index) => {
            const embedding = embeddings[index];
            if (!embedding) {
                throw new Error(`Missing embedding for chunk ${index}`);
            }
            return {
                id: (0, node_crypto_1.randomUUID)(),
                filePath: args.filePath,
                chunkIndex: chunk.index,
                text: chunk.text,
                vector: embedding,
                metadata: {
                    fileName: args.filePath.split('/').pop() || args.filePath,
                    fileSize: text.length,
                    fileType: args.filePath.split('.').pop() || '',
                    ...(args.metadata && { custom: args.metadata }),
                },
                timestamp,
            };
        });
        // Insert vectors (transaction processing)
        try {
            await this.vectorStore.insertChunks(vectorChunks);
            console.error(`Inserted ${vectorChunks.length} chunks for: ${args.filePath}`);
        }
        catch (insertError) {
            // Note: Full rollback is not possible without stored vectors.
            // If this was a re-ingestion and it failed, the old data has been deleted.
            // User should re-ingest from the original file.
            if (isReingestion) {
                console.error('Ingestion failed during re-ingestion. Previous data was deleted. ' +
                    'Please re-ingest from the original file to restore.', insertError);
            }
            throw insertError;
        }
        return {
            filePath: args.filePath,
            chunkCount: chunks.length,
            timestamp,
        };
    }
    /**
     * ingest_file tool handler (for test compatibility)
     */
    async handleIngestFile(args) {
        try {
            const result = await this.executeIngestFile(args);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            const errorMessage = (0, index_js_3.getErrorMessage)(error);
            console.error('Failed to ingest file:', errorMessage);
            throw new Error(`Failed to ingest file: ${errorMessage}`);
        }
    }
    /**
     * Execute ingest_data logic (returns plain data)
     */
    async executeIngestData(args) {
        let contentToSave = args.content;
        let formatToSave = args.metadata.format;
        // For HTML content, convert to Markdown first
        if (args.metadata.format === 'html') {
            console.error(`Parsing HTML from: ${args.metadata.source}`);
            const markdown = await (0, html_parser_js_1.parseHtml)(args.content, args.metadata.source);
            if (!markdown.trim()) {
                throw new Error('Failed to extract content from HTML. The page may have no readable content.');
            }
            contentToSave = markdown;
            formatToSave = 'markdown'; // Save as .md file
            console.error(`Converted HTML to Markdown: ${markdown.length} characters`);
        }
        // Save content to raw-data directory
        const rawDataPath = await (0, raw_data_utils_js_1.saveRawData)(this.dbPath, args.metadata.source, contentToSave, formatToSave);
        console.error(`Saved raw data: ${args.metadata.source} -> ${rawDataPath}`);
        // Call executeIngestFile internally with rollback on failure
        try {
            return await this.executeIngestFile({
                filePath: rawDataPath,
                ...(args.metadata.custom && { metadata: args.metadata.custom }),
            });
        }
        catch (ingestError) {
            // Rollback: delete the raw-data file if ingest fails
            try {
                await (0, promises_1.unlink)(rawDataPath);
                console.error(`Rolled back raw-data file: ${rawDataPath}`);
            }
            catch {
                console.warn(`Failed to rollback raw-data file: ${rawDataPath}`);
            }
            throw ingestError;
        }
    }
    /**
     * ingest_data tool handler (for test compatibility)
     */
    async handleIngestData(args) {
        try {
            const result = await this.executeIngestData(args);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            const errorMessage = (0, index_js_3.getErrorMessage)(error);
            console.error('Failed to ingest data:', errorMessage);
            throw new Error(`Failed to ingest data: ${errorMessage}`);
        }
    }
    /**
     * Execute list_files logic (returns plain data)
     */
    async executeListFiles() {
        const files = await this.vectorStore.listFiles();
        // Enrich raw-data files with source information
        return files.map((file) => {
            if ((0, raw_data_utils_js_1.isManagedRawDataPath)(this.dbPath, file.filePath)) {
                const source = (0, raw_data_utils_js_1.extractSourceFromPath)(file.filePath);
                if (source) {
                    return { ...file, source };
                }
            }
            return file;
        });
    }
    /**
     * list_files tool handler (for test compatibility)
     */
    async handleListFiles() {
        try {
            const files = await this.executeListFiles();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(files, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            console.error('Failed to list files:', error);
            throw error;
        }
    }
    /**
     * Execute status logic (returns plain data)
     */
    async executeStatus() {
        return await this.vectorStore.getStatus();
    }
    /**
     * status tool handler (for test compatibility)
     */
    async handleStatus() {
        try {
            const status = await this.executeStatus();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(status, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            console.error('Failed to get status:', error);
            throw error;
        }
    }
    /**
     * Execute feedback_pin logic
     */
    executeFeedbackPin(args) {
        const feedbackStore = (0, feedback_js_1.getFeedbackStore)();
        // Create source reference from query (using query text as fingerprint)
        const sourceRef = {
            filePath: '__query__',
            chunkIndex: 0,
            fingerprint: args.sourceQuery,
        };
        // Create target reference
        const targetRef = {
            filePath: args.targetFilePath,
            chunkIndex: args.targetChunkIndex,
            ...(args.targetFingerprint && { fingerprint: args.targetFingerprint }),
        };
        feedbackStore.recordEvent({
            type: 'pin',
            source: sourceRef,
            target: targetRef,
            timestamp: new Date(),
        });
        return {
            success: true,
            message: `Pinned chunk ${args.targetFilePath}:${args.targetChunkIndex} for query "${args.sourceQuery}"`,
        };
    }
    /**
     * Execute feedback_dismiss logic
     */
    executeFeedbackDismiss(args) {
        const feedbackStore = (0, feedback_js_1.getFeedbackStore)();
        // Create source reference from query (using query text as fingerprint)
        const sourceRef = {
            filePath: '__query__',
            chunkIndex: 0,
            fingerprint: args.sourceQuery,
        };
        // Create target reference
        const targetRef = {
            filePath: args.targetFilePath,
            chunkIndex: args.targetChunkIndex,
            ...(args.targetFingerprint && { fingerprint: args.targetFingerprint }),
        };
        feedbackStore.recordEvent({
            type: 'dismiss_inferred',
            source: sourceRef,
            target: targetRef,
            timestamp: new Date(),
        });
        return {
            success: true,
            message: `Dismissed chunk ${args.targetFilePath}:${args.targetChunkIndex} for query "${args.sourceQuery}"`,
        };
    }
    /**
     * Execute feedback_stats logic
     */
    executeFeedbackStats() {
        const feedbackStore = (0, feedback_js_1.getFeedbackStore)();
        return feedbackStore.getStats();
    }
    /**
     * Execute delete_file logic (returns plain data)
     */
    async executeDeleteFile(args) {
        let targetPath;
        let skipValidation = false;
        if (args.source) {
            // Generate raw-data path from source (extension is always .md)
            // Internal path generation is secure, skip baseDir validation
            targetPath = (0, raw_data_utils_js_1.generateRawDataPath)(this.dbPath, args.source, 'markdown');
            skipValidation = true;
        }
        else if (args.filePath) {
            targetPath = args.filePath;
        }
        else {
            throw new Error('Either filePath or source must be provided');
        }
        // Only validate user-provided filePath (not internally generated paths)
        if (!skipValidation) {
            this.parser.validateFilePath(targetPath);
        }
        // Delete chunks from vector database
        await this.vectorStore.deleteChunks(targetPath);
        // Also delete physical raw-data file if applicable
        if ((0, raw_data_utils_js_1.isManagedRawDataPath)(this.dbPath, targetPath)) {
            try {
                await (0, promises_1.unlink)(targetPath);
                console.error(`Deleted raw-data file: ${targetPath}`);
            }
            catch {
                // File may already be deleted, log warning only
                console.warn(`Could not delete raw-data file (may not exist): ${targetPath}`);
            }
        }
        return {
            filePath: targetPath,
            deleted: true,
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * delete_file tool handler (for test compatibility)
     */
    async handleDeleteFile(args) {
        try {
            const result = await this.executeDeleteFile(args);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            const errorMessage = (0, index_js_3.getErrorMessage)(error);
            console.error('Failed to delete file:', errorMessage);
            throw new Error(`Failed to delete file: ${errorMessage}`);
        }
    }
    /**
     * Get all chunks for a document (for Reader feature)
     */
    async handleGetDocumentChunks(filePath) {
        try {
            const chunks = await this.vectorStore.getDocumentChunks(filePath);
            // Enrich with source information for raw-data files
            const enrichedChunks = chunks.map((chunk) => {
                if ((0, raw_data_utils_js_1.isManagedRawDataPath)(this.dbPath, chunk.filePath)) {
                    const source = (0, raw_data_utils_js_1.extractSourceFromPath)(chunk.filePath);
                    if (source) {
                        return { ...chunk, source };
                    }
                }
                return chunk;
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(enrichedChunks, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            const errorMessage = (0, index_js_3.getErrorMessage)(error);
            console.error('Failed to get document chunks:', errorMessage);
            throw new Error(`Failed to get document chunks: ${errorMessage}`);
        }
    }
    /**
     * Find related chunks for a given chunk (for Reader margin suggestions)
     */
    async handleFindRelatedChunks(filePath, chunkIndex, limit, excludeSameDocument) {
        try {
            const relatedChunks = await this.vectorStore.findRelatedChunks(filePath, chunkIndex, limit ?? 5, excludeSameDocument ?? true);
            // Enrich with source information for raw-data files
            const enrichedChunks = relatedChunks.map((chunk) => {
                if ((0, raw_data_utils_js_1.isManagedRawDataPath)(this.dbPath, chunk.filePath)) {
                    const source = (0, raw_data_utils_js_1.extractSourceFromPath)(chunk.filePath);
                    if (source) {
                        return { ...chunk, source };
                    }
                }
                return chunk;
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(enrichedChunks, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            const errorMessage = (0, index_js_3.getErrorMessage)(error);
            console.error('Failed to find related chunks:', errorMessage);
            throw new Error(`Failed to find related chunks: ${errorMessage}`);
        }
    }
    /**
     * Batch find related chunks for multiple source chunks
     */
    async handleBatchFindRelatedChunks(chunks, limit) {
        try {
            const results = {};
            // Process each chunk in parallel
            await Promise.all(chunks.map(async (chunk) => {
                const key = `${chunk.filePath}:${chunk.chunkIndex}`;
                const relatedChunks = await this.vectorStore.findRelatedChunks(chunk.filePath, chunk.chunkIndex, limit ?? 5, true // Always exclude same document for batch
                );
                // Enrich with source information
                results[key] = relatedChunks.map((related) => {
                    if ((0, raw_data_utils_js_1.isManagedRawDataPath)(this.dbPath, related.filePath)) {
                        const source = (0, raw_data_utils_js_1.extractSourceFromPath)(related.filePath);
                        if (source) {
                            return { ...related, source };
                        }
                    }
                    return related;
                });
            }));
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(results, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            const errorMessage = (0, index_js_3.getErrorMessage)(error);
            console.error('Failed to batch find related chunks:', errorMessage);
            throw new Error(`Failed to batch find related chunks: ${errorMessage}`);
        }
    }
    /**
     * Start the server
     */
    async run() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        console.error('RAGServer running on stdio transport');
    }
}
exports.RAGServer = RAGServer;
//# sourceMappingURL=index.js.map