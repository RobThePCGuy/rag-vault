import { type GroupingMode } from '../vectordb/index.js';
import { type DeleteFileInput, type IngestDataInput, type IngestFileInput, type QueryDocumentsInput } from './schemas.js';
/**
 * RAGServer configuration
 */
export interface RAGServerConfig {
    /** LanceDB database path */
    dbPath: string;
    /** Transformers.js model path */
    modelName: string;
    /** Model cache directory */
    cacheDir: string;
    /** Document base directory */
    baseDir: string;
    /** Maximum file size (100MB) */
    maxFileSize: number;
    /** Maximum distance threshold for quality filtering (optional) */
    maxDistance?: number;
    /** Grouping mode for quality filtering (optional) */
    grouping?: GroupingMode;
    /** Hybrid search weight for BM25 (0.0 = vector only, 1.0 = BM25 only, default 0.6) */
    hybridWeight?: number;
}
/**
 * RAG server compliant with MCP Protocol
 *
 * Responsibilities:
 * - MCP tool integration (6 tools)
 * - Tool handler implementation with Zod validation
 * - Error handling
 * - Initialization (LanceDB, Transformers.js)
 */
export declare class RAGServer {
    private readonly server;
    private readonly vectorStore;
    private readonly embedder;
    private readonly chunker;
    private readonly parser;
    private readonly dbPath;
    constructor(config: RAGServerConfig);
    /**
     * Set up MCP handlers using tool() API
     * Note: Type casts are used to work around Zod version compatibility between project and SDK
     */
    private setupHandlers;
    /**
     * Initialization
     */
    initialize(): Promise<void>;
    /**
     * Close the server and release resources
     */
    close(): Promise<void>;
    /**
     * Get the current database configuration
     */
    getConfig(): {
        dbPath: string;
        modelName: string;
    };
    /**
     * Execute query_documents logic (returns plain data)
     */
    private executeQueryDocuments;
    /**
     * query_documents tool handler (for test compatibility)
     */
    handleQueryDocuments(args: QueryDocumentsInput): Promise<{
        content: [{
            type: 'text';
            text: string;
        }];
    }>;
    /**
     * Execute ingest_file logic (returns plain data)
     */
    private executeIngestFile;
    /**
     * ingest_file tool handler (for test compatibility)
     */
    handleIngestFile(args: IngestFileInput): Promise<{
        content: [{
            type: 'text';
            text: string;
        }];
    }>;
    /**
     * Execute ingest_data logic (returns plain data)
     */
    private executeIngestData;
    /**
     * ingest_data tool handler (for test compatibility)
     */
    handleIngestData(args: IngestDataInput): Promise<{
        content: [{
            type: 'text';
            text: string;
        }];
    }>;
    /**
     * Execute list_files logic (returns plain data)
     */
    private executeListFiles;
    /**
     * list_files tool handler (for test compatibility)
     */
    handleListFiles(): Promise<{
        content: [{
            type: 'text';
            text: string;
        }];
    }>;
    /**
     * Execute status logic (returns plain data)
     */
    private executeStatus;
    /**
     * status tool handler (for test compatibility)
     */
    handleStatus(): Promise<{
        content: [{
            type: 'text';
            text: string;
        }];
    }>;
    /**
     * Execute delete_file logic (returns plain data)
     */
    private executeDeleteFile;
    /**
     * delete_file tool handler (for test compatibility)
     */
    handleDeleteFile(args: DeleteFileInput): Promise<{
        content: [{
            type: 'text';
            text: string;
        }];
    }>;
    /**
     * Get all chunks for a document (for Reader feature)
     */
    handleGetDocumentChunks(filePath: string): Promise<{
        content: [{
            type: 'text';
            text: string;
        }];
    }>;
    /**
     * Find related chunks for a given chunk (for Reader margin suggestions)
     */
    handleFindRelatedChunks(filePath: string, chunkIndex: number, limit?: number, excludeSameDocument?: boolean): Promise<{
        content: [{
            type: 'text';
            text: string;
        }];
    }>;
    /**
     * Batch find related chunks for multiple source chunks
     */
    handleBatchFindRelatedChunks(chunks: Array<{
        filePath: string;
        chunkIndex: number;
    }>, limit?: number): Promise<{
        content: [{
            type: 'text';
            text: string;
        }];
    }>;
    /**
     * Start the server
     */
    run(): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map