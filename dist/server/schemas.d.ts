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
}, "strip", z.ZodTypeAny, {
    query: string;
    limit?: number | undefined;
}, {
    query: string;
    limit?: number | undefined;
}>;
/**
 * ingest_file tool input schema
 */
export declare const IngestFileSchema: z.ZodObject<{
    filePath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    filePath: string;
}, {
    filePath: string;
}>;
/**
 * ingest_data metadata schema
 */
export declare const IngestDataMetadataSchema: z.ZodObject<{
    source: z.ZodString;
    format: z.ZodEnum<["text", "html", "markdown"]>;
}, "strip", z.ZodTypeAny, {
    source: string;
    format: "text" | "html" | "markdown";
}, {
    source: string;
    format: "text" | "html" | "markdown";
}>;
/**
 * ingest_data tool input schema
 */
export declare const IngestDataSchema: z.ZodObject<{
    content: z.ZodString;
    metadata: z.ZodObject<{
        source: z.ZodString;
        format: z.ZodEnum<["text", "html", "markdown"]>;
    }, "strip", z.ZodTypeAny, {
        source: string;
        format: "text" | "html" | "markdown";
    }, {
        source: string;
        format: "text" | "html" | "markdown";
    }>;
}, "strip", z.ZodTypeAny, {
    content: string;
    metadata: {
        source: string;
        format: "text" | "html" | "markdown";
    };
}, {
    content: string;
    metadata: {
        source: string;
        format: "text" | "html" | "markdown";
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
export interface QueryResult {
    filePath: string;
    chunkIndex: number;
    text: string;
    score: number;
    source?: string;
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
//# sourceMappingURL=schemas.d.ts.map