// Zod schemas for MCP tool validation
// Used by RAGServer with McpServer high-level API
import { z } from 'zod';
/**
 * Content format enum for ingest_data
 */
export const ContentFormatSchema = z.enum(['text', 'html', 'markdown']);
/**
 * query_documents tool input schema
 */
export const QueryDocumentsSchema = z.object({
    query: z
        .string()
        .min(1, 'Query cannot be empty')
        .describe('Search query. Include specific terms and add context if needed.'),
    limit: z
        .number()
        .int()
        .positive()
        .max(20, 'Limit cannot exceed 20')
        .optional()
        .describe('Maximum number of results to return (default: 10, max: 20). Recommended: 5 for precision, 10 for balance, 20 for broad exploration.'),
    explain: z
        .boolean()
        .optional()
        .describe('Include explanation of why each result matched (shared keywords, phrases, match type).'),
});
/**
 * Custom metadata schema for ingestion
 * Enforces reasonable limits on key/value sizes to prevent abuse
 */
export const CustomMetadataSchema = z
    .record(z.string().max(100, 'Metadata key must be at most 100 characters'), z.string().max(1000, 'Metadata value must be at most 1000 characters'))
    .optional()
    .describe('Optional custom metadata fields (e.g., {"author": "John", "domain": "legal", "tags": "contract,review"})');
/**
 * ingest_file tool input schema
 */
export const IngestFileSchema = z.object({
    filePath: z
        .string()
        .min(1, 'File path cannot be empty')
        .describe('Absolute path to the file to ingest. Example: "/Users/user/documents/manual.pdf"'),
    metadata: CustomMetadataSchema,
});
/**
 * ingest_data metadata schema
 */
export const IngestDataMetadataSchema = z.object({
    source: z
        .string()
        .min(1, 'Source cannot be empty')
        .describe('Source identifier. For web pages, use the URL (e.g., "https://example.com/page"). For other content, use URL-scheme format: "{type}://{date}" or "{type}://{date}/{detail}". Examples: "clipboard://2024-12-30", "chat://2024-12-30/project-discussion".'),
    format: ContentFormatSchema.describe('Content format: "text", "html", or "markdown"'),
    custom: CustomMetadataSchema,
});
/**
 * ingest_data tool input schema
 */
export const IngestDataSchema = z.object({
    content: z
        .string()
        .min(1, 'Content cannot be empty')
        .describe('The content to ingest (text, HTML, or Markdown)'),
    metadata: IngestDataMetadataSchema.describe('Content metadata'),
});
/**
 * delete_file tool input schema
 */
export const DeleteFileSchema = z
    .object({
    filePath: z
        .string()
        .optional()
        .describe('Absolute path to the file (for ingest_file). Example: "/Users/user/documents/manual.pdf"'),
    source: z
        .string()
        .optional()
        .describe('Source identifier used in ingest_data. Examples: "https://example.com/page", "clipboard://2024-12-30"'),
})
    .refine((data) => data.filePath !== undefined || data.source !== undefined, {
    message: 'Either filePath or source must be provided',
});
// ============================================
// Internal Response Validation Schemas
// ============================================
/**
 * Schema for validating status response from RAG server
 */
export const StatusResponseSchema = z.object({
    documentCount: z.number(),
    chunkCount: z.number(),
    memoryUsage: z.number(),
    uptime: z.number(),
    ftsIndexEnabled: z.boolean(),
    searchMode: z.enum(['hybrid', 'vector-only']),
});
/**
 * Schema for validating recent databases file structure
 */
export const RecentDatabasesFileSchema = z.object({
    version: z.number(),
    databases: z.array(z.object({
        path: z.string(),
        name: z.string(),
        lastAccessed: z.string(),
        modelName: z.string().optional(),
    })),
});
//# sourceMappingURL=schemas.js.map