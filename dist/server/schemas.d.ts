import { z } from 'zod';
/**
 * Content format enum for ingest_data
 */
export declare const ContentFormatSchema: z.ZodEnum<["text", "html", "markdown"]>;
/**
 * query_documents tool input schema
 */
export declare const QueryDocumentsSchema: z.ZodObject<{
    query: z.ZodString;
    limit: z.ZodOptional<z.ZodNumber>;
    explain: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    query: string;
    limit?: number | undefined;
    explain?: boolean | undefined;
}, {
    query: string;
    limit?: number | undefined;
    explain?: boolean | undefined;
}>;
/**
 * Custom metadata schema for ingestion
 * Enforces reasonable limits on key/value sizes to prevent abuse
 */
export declare const CustomMetadataSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
/**
 * ingest_file tool input schema
 */
export declare const IngestFileSchema: z.ZodObject<{
    filePath: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    filePath: string;
    metadata?: Record<string, string> | undefined;
}, {
    filePath: string;
    metadata?: Record<string, string> | undefined;
}>;
/**
 * ingest_data metadata schema
 */
export declare const IngestDataMetadataSchema: z.ZodObject<{
    source: z.ZodString;
    format: z.ZodEnum<["text", "html", "markdown"]>;
    custom: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    source: string;
    format: "text" | "html" | "markdown";
    custom?: Record<string, string> | undefined;
}, {
    source: string;
    format: "text" | "html" | "markdown";
    custom?: Record<string, string> | undefined;
}>;
/**
 * ingest_data tool input schema
 */
export declare const IngestDataSchema: z.ZodObject<{
    content: z.ZodString;
    metadata: z.ZodObject<{
        source: z.ZodString;
        format: z.ZodEnum<["text", "html", "markdown"]>;
        custom: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        source: string;
        format: "text" | "html" | "markdown";
        custom?: Record<string, string> | undefined;
    }, {
        source: string;
        format: "text" | "html" | "markdown";
        custom?: Record<string, string> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    content: string;
    metadata: {
        source: string;
        format: "text" | "html" | "markdown";
        custom?: Record<string, string> | undefined;
    };
}, {
    content: string;
    metadata: {
        source: string;
        format: "text" | "html" | "markdown";
        custom?: Record<string, string> | undefined;
    };
}>;
/**
 * delete_file tool input schema
 */
export declare const DeleteFileSchema: z.ZodEffects<z.ZodObject<{
    filePath: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    source?: string | undefined;
    filePath?: string | undefined;
}, {
    source?: string | undefined;
    filePath?: string | undefined;
}>, {
    source?: string | undefined;
    filePath?: string | undefined;
}, {
    source?: string | undefined;
    filePath?: string | undefined;
}>;
export type QueryDocumentsInput = z.infer<typeof QueryDocumentsSchema>;
export type IngestFileInput = z.infer<typeof IngestFileSchema>;
export type IngestDataInput = z.infer<typeof IngestDataSchema>;
export type DeleteFileInput = z.infer<typeof DeleteFileSchema>;
/**
 * Explanation of why a result matched the query
 */
export interface QueryResultExplanation {
    /** Keywords shared between query and result */
    sharedKeywords: string[];
    /** Phrases (bigrams/trigrams) shared between query and result */
    sharedPhrases: string[];
    /** Relationship category */
    reasonLabel: 'same_doc' | 'very_similar' | 'related_topic' | 'loosely_related';
}
export interface QueryResult {
    filePath: string;
    chunkIndex: number;
    text: string;
    score: number;
    source?: string;
    /** Custom metadata fields if present on the document */
    metadata?: Record<string, string>;
    /** Explanation of why this result matched (only present when explain=true) */
    explanation?: QueryResultExplanation;
}
export interface IngestResult {
    filePath: string;
    chunkCount: number;
    timestamp: string;
}
export interface DeleteResult {
    filePath: string;
    deleted: boolean;
    timestamp: string;
}
export interface FileInfo {
    filePath: string;
    chunkCount: number;
    source?: string;
}
export interface StatusOutput {
    documentCount: number;
    chunkCount: number;
    memoryUsage: number;
    uptime: number;
    ftsIndexEnabled: boolean;
    searchMode: 'hybrid' | 'vector-only';
}
/**
 * Schema for validating status response from RAG server
 */
export declare const StatusResponseSchema: z.ZodObject<{
    documentCount: z.ZodNumber;
    chunkCount: z.ZodNumber;
    memoryUsage: z.ZodNumber;
    uptime: z.ZodNumber;
    ftsIndexEnabled: z.ZodBoolean;
    searchMode: z.ZodEnum<["hybrid", "vector-only"]>;
}, "strip", z.ZodTypeAny, {
    documentCount: number;
    chunkCount: number;
    memoryUsage: number;
    ftsIndexEnabled: boolean;
    searchMode: "hybrid" | "vector-only";
    uptime: number;
}, {
    documentCount: number;
    chunkCount: number;
    memoryUsage: number;
    ftsIndexEnabled: boolean;
    searchMode: "hybrid" | "vector-only";
    uptime: number;
}>;
/**
 * Schema for validating recent databases file structure
 */
export declare const RecentDatabasesFileSchema: z.ZodObject<{
    version: z.ZodNumber;
    databases: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        name: z.ZodString;
        lastAccessed: z.ZodString;
        modelName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        path: string;
        lastAccessed: string;
        modelName?: string | undefined;
    }, {
        name: string;
        path: string;
        lastAccessed: string;
        modelName?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    version: number;
    databases: {
        name: string;
        path: string;
        lastAccessed: string;
        modelName?: string | undefined;
    }[];
}, {
    version: number;
    databases: {
        name: string;
        path: string;
        lastAccessed: string;
        modelName?: string | undefined;
    }[];
}>;
//# sourceMappingURL=schemas.d.ts.map