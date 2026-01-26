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
 * Validation error (equivalent to 400)
 */
export declare class ValidationError extends Error {
    readonly cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
/**
 * File operation error (equivalent to 500)
 */
export declare class FileOperationError extends Error {
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
     * @throws ValidationError - When path is not absolute or outside BASE_DIR
     */
    validateFilePath(filePath: string): void;
    /**
     * File size validation (100MB limit)
     *
     * @param filePath - File path to validate
     * @throws ValidationError - When file size exceeds limit
     * @throws FileOperationError - When file read fails
     */
    validateFileSize(filePath: string): void;
    /**
     * File parsing (auto format detection)
     *
     * @param filePath - File path to parse
     * @returns Parsed text
     * @throws ValidationError - Path traversal, size exceeded, unsupported format
     * @throws FileOperationError - File read failed, parse failed
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
     * @throws FileOperationError - File read failed, parse failed
     */
    parsePdf(filePath: string, embedder: EmbedderInterface): Promise<string>;
    /**
     * DOCX parsing (using mammoth)
     *
     * @param filePath - DOCX file path
     * @returns Parsed text
     * @throws FileOperationError - File read failed, parse failed
     */
    private parseDocx;
    /**
     * TXT parsing (using fs.readFile)
     *
     * @param filePath - TXT file path
     * @returns Parsed text
     * @throws FileOperationError - File read failed
     */
    private parseTxt;
    /**
     * MD parsing (using fs.readFile)
     *
     * @param filePath - MD file path
     * @returns Parsed text
     * @throws FileOperationError - File read failed
     */
    private parseMd;
    /**
     * JSON parsing - converts JSON to searchable text format
     *
     * Converts JSON objects to a key-value text format optimized for semantic search:
     * - Preserves field names for keyword matching
     * - Flattens nested structures with dot notation
     * - Handles arrays by joining values
     *
     * @param filePath - JSON file path
     * @returns Parsed text in "key: value" format
     * @throws FileOperationError - File read failed or invalid JSON
     */
    private parseJson;
    /**
     * Convert JSON value to searchable text format
     *
     * @param value - JSON value (object, array, or primitive)
     * @param prefix - Key prefix for nested objects (dot notation)
     * @returns Text representation
     */
    private jsonToText;
}
//# sourceMappingURL=index.d.ts.map