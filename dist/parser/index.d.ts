import { type EmbedderInterface } from './pdf-filter.js';
/**
 * DocumentParser configuration
 */
export interface ParserConfig {
    /** Security: allowed base directory */
    baseDir: string;
    /** Maximum file size (100MB) */
    maxFileSize: number;
}
/**
 * Parser validation error (equivalent to 400)
 * Named to avoid collision with centralized ValidationError in src/errors/index.ts
 */
export declare class ParserValidationError extends Error {
    readonly cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
/**
 * Parser file operation error (equivalent to 500)
 * Named to avoid collision with centralized FileOperationError in src/errors/index.ts
 */
export declare class ParserFileOperationError extends Error {
    readonly cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
/**
 * Document parser class (PDF/DOCX/TXT/MD/JSON support)
 *
 * Responsibilities:
 * - File path validation (path traversal prevention)
 * - File size validation (100MB limit)
 * - Parse 5 formats (PDF/DOCX/TXT/MD/JSON)
 */
export declare class DocumentParser {
    private readonly config;
    constructor(config: ParserConfig);
    /**
     * File path validation (Absolute path requirement + Path traversal prevention)
     *
     * @param filePath - File path to validate (must be absolute)
     * @throws ParserValidationError - When path is not absolute or outside BASE_DIR
     */
    validateFilePath(filePath: string): void;
    /**
     * File size validation (100MB limit)
     *
     * @param filePath - File path to validate
     * @throws ParserValidationError - When file size exceeds limit
     * @throws ParserFileOperationError - When file read fails
     */
    validateFileSize(filePath: string): void;
    /**
     * File parsing (auto format detection)
     *
     * @param filePath - File path to parse
     * @returns Parsed text
     * @throws ParserValidationError - Path traversal, size exceeded, unsupported format
     * @throws ParserFileOperationError - File read failed, parse failed
     */
    parseFile(filePath: string): Promise<string>;
    /**
     * PDF parsing with header/footer filtering
     *
     * Features:
     * - Extracts text with position information (x, y, fontSize)
     * - Semantic header/footer detection using embedding similarity
     * - Uses hasEOL for proper line break handling
     *
     * @param filePath - PDF file path
     * @param embedder - Embedder for semantic header/footer detection
     * @returns Parsed text with header/footer removed
     * @throws ParserFileOperationError - File read failed, parse failed
     */
    parsePdf(filePath: string, embedder: EmbedderInterface): Promise<string>;
    /**
     * DOCX parsing (using mammoth)
     *
     * @param filePath - DOCX file path
     * @returns Parsed text
     * @throws ParserFileOperationError - File read failed, parse failed
     */
    private parseDocx;
    /**
     * TXT parsing (using fs.readFile)
     *
     * @param filePath - TXT file path
     * @returns Parsed text
     * @throws ParserFileOperationError - File read failed
     */
    private parseTxt;
    /**
     * MD parsing (using fs.readFile)
     *
     * @param filePath - MD file path
     * @returns Parsed text
     * @throws ParserFileOperationError - File read failed
     */
    private parseMd;
    /**
     * JSON parsing - converts JSON to searchable text format
     *
     * Converts JSON objects to a key-value text format optimized for semantic search:
     * - Preserves field names for keyword matching
     * - Flattens nested structures with dot notation
     * - Handles arrays by joining values
     * - Falls back to JSONL parsing if JSON syntax fails
     *
     * @param filePath - JSON file path
     * @returns Parsed text in "key: value" format
     * @throws ParserFileOperationError - File read failed or invalid JSON/JSONL
     */
    private parseJson;
    /**
     * JSONL parsing - parses line-delimited JSON files
     *
     * @param filePath - JSONL file path
     * @returns Parsed text from all valid JSON objects
     * @throws ParserFileOperationError - File read failed
     */
    private parseJsonl;
    /**
     * Parse JSONL content (shared logic for parseJsonl and JSON fallback)
     *
     * @param content - Raw file content
     * @param filePath - File path (for logging)
     * @returns Parsed text from all valid JSON objects
     */
    private parseJsonlContent;
    /**
     * Determine if a string value should be included based on RAG filtering rules
     *
     * Rules:
     * 1. Exclude code-like strings (GUIDs, hex, underscore patterns) regardless of length
     * 2. Keep strings >= 20 chars if they pass code check
     * 3. Keep short strings with allowlisted keys if prose-like
     * 4. Keep other short strings only if prose-like
     *
     * @param value - String value to check
     * @param key - Field key name
     * @returns true if the string should be included
     */
    private shouldIncludeString;
    /**
     * Convert JSON value to searchable text format with RAG-appropriate filtering
     *
     * Filtering rules:
     * - Numbers and booleans are excluded (metadata noise)
     * - Null/undefined values are excluded
     * - Empty arrays/objects are excluded
     * - Strings are filtered by shouldIncludeString rules
     *
     * @param value - JSON value (object, array, or primitive)
     * @param prefix - Key prefix for nested objects (dot notation)
     * @returns Text representation
     */
    private jsonToText;
}
//# sourceMappingURL=index.d.ts.map