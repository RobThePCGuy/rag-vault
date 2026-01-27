"use strict";
// Zod schemas for MCP tool validation
// Used by RAGServer with McpServer high-level API
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteFileSchema = exports.IngestDataSchema = exports.IngestDataMetadataSchema = exports.IngestFileSchema = exports.QueryDocumentsSchema = exports.ContentFormatSchema = void 0;
const zod_1 = require("zod");
/**
 * Content format enum for ingest_data
 */
exports.ContentFormatSchema = zod_1.z.enum(['text', 'html', 'markdown']);
/**
 * query_documents tool input schema
 */
exports.QueryDocumentsSchema = zod_1.z.object({
    query: zod_1.z
        .string()
        .min(1, 'Query cannot be empty')
        .describe('Search query. Include specific terms and add context if needed.'),
    limit: zod_1.z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum number of results to return (default: 10). Recommended: 5 for precision, 10 for balance, 20 for broad exploration.'),
});
/**
 * ingest_file tool input schema
 */
exports.IngestFileSchema = zod_1.z.object({
    filePath: zod_1.z
        .string()
        .min(1, 'File path cannot be empty')
        .describe('Absolute path to the file to ingest. Example: "/Users/user/documents/manual.pdf"'),
});
/**
 * ingest_data metadata schema
 */
exports.IngestDataMetadataSchema = zod_1.z.object({
    source: zod_1.z
        .string()
        .min(1, 'Source cannot be empty')
        .describe('Source identifier. For web pages, use the URL (e.g., "https://example.com/page"). For other content, use URL-scheme format: "{type}://{date}" or "{type}://{date}/{detail}". Examples: "clipboard://2024-12-30", "chat://2024-12-30/project-discussion".'),
    format: exports.ContentFormatSchema.describe('Content format: "text", "html", or "markdown"'),
});
/**
 * ingest_data tool input schema
 */
exports.IngestDataSchema = zod_1.z.object({
    content: zod_1.z
        .string()
        .min(1, 'Content cannot be empty')
        .describe('The content to ingest (text, HTML, or Markdown)'),
    metadata: exports.IngestDataMetadataSchema.describe('Content metadata'),
});
/**
 * delete_file tool input schema
 */
exports.DeleteFileSchema = zod_1.z
    .object({
    filePath: zod_1.z
        .string()
        .optional()
        .describe('Absolute path to the file (for ingest_file). Example: "/Users/user/documents/manual.pdf"'),
    source: zod_1.z
        .string()
        .optional()
        .describe('Source identifier used in ingest_data. Examples: "https://example.com/page", "clipboard://2024-12-30"'),
})
    .refine((data) => data.filePath !== undefined || data.source !== undefined, {
    message: 'Either filePath or source must be provided',
});
//# sourceMappingURL=schemas.js.map