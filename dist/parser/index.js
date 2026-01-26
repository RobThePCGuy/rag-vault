"use strict";
// DocumentParser implementation with PDF/DOCX/TXT/MD/JSON/JSONL support
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentParser = exports.FileOperationError = exports.ValidationError = void 0;
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const mammoth_1 = __importDefault(require("mammoth"));
const pdf_mjs_1 = require("pdfjs-dist/legacy/build/pdf.mjs");
const pdf_filter_js_1 = require("./pdf-filter.js");
/**
 * Validation error (equivalent to 400)
 */
class ValidationError extends Error {
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
/**
 * File operation error (equivalent to 500)
 */
class FileOperationError extends Error {
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'FileOperationError';
    }
}
exports.FileOperationError = FileOperationError;
// ============================================
// DocumentParser Class
// ============================================
/**
 * Document parser class (PDF/DOCX/TXT/MD/JSON support)
 *
 * Responsibilities:
 * - File path validation (path traversal prevention)
 * - File size validation (100MB limit)
 * - Parse 5 formats (PDF/DOCX/TXT/MD/JSON)
 */
class DocumentParser {
    constructor(config) {
        this.config = config;
    }
    /**
     * File path validation (Absolute path requirement + Path traversal prevention)
     *
     * @param filePath - File path to validate (must be absolute)
     * @throws ValidationError - When path is not absolute or outside BASE_DIR
     */
    validateFilePath(filePath) {
        // Check if path is absolute
        if (!(0, node_path_1.isAbsolute)(filePath)) {
            throw new ValidationError(`File path must be absolute path (received: ${filePath}). Please provide an absolute path within BASE_DIR.`);
        }
        // Check if path is within BASE_DIR
        const baseDir = (0, node_path_1.resolve)(this.config.baseDir);
        const normalizedPath = (0, node_path_1.resolve)(filePath);
        if (!normalizedPath.startsWith(baseDir)) {
            throw new ValidationError(`File path must be within BASE_DIR (${baseDir}). Received path outside BASE_DIR: ${filePath}`);
        }
    }
    /**
     * File size validation (100MB limit)
     *
     * @param filePath - File path to validate
     * @throws ValidationError - When file size exceeds limit
     * @throws FileOperationError - When file read fails
     */
    validateFileSize(filePath) {
        try {
            const stats = (0, node_fs_1.statSync)(filePath);
            if (stats.size > this.config.maxFileSize) {
                throw new ValidationError(`File size exceeds limit: ${stats.size} > ${this.config.maxFileSize}`);
            }
        }
        catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new FileOperationError(`Failed to check file size: ${filePath}`, error);
        }
    }
    /**
     * File parsing (auto format detection)
     *
     * @param filePath - File path to parse
     * @returns Parsed text
     * @throws ValidationError - Path traversal, size exceeded, unsupported format
     * @throws FileOperationError - File read failed, parse failed
     */
    async parseFile(filePath) {
        // Validation
        this.validateFilePath(filePath);
        this.validateFileSize(filePath);
        // Format detection (PDF uses parsePdf directly)
        const ext = (0, node_path_1.extname)(filePath).toLowerCase();
        switch (ext) {
            case '.docx':
                return await this.parseDocx(filePath);
            case '.txt':
                return await this.parseTxt(filePath);
            case '.md':
                return await this.parseMd(filePath);
            case '.json':
                return await this.parseJson(filePath);
            default:
                throw new ValidationError(`Unsupported file format: ${ext}`);
        }
    }
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
    async parsePdf(filePath, embedder) {
        // Validation
        this.validateFilePath(filePath);
        this.validateFileSize(filePath);
        try {
            const buffer = await (0, promises_1.readFile)(filePath);
            const pdf = await (0, pdf_mjs_1.getDocument)({
                data: new Uint8Array(buffer),
                useSystemFonts: true,
                isEvalSupported: false,
            }).promise;
            // Extract text with position information from each page
            const pages = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const items = textContent.items
                    .filter((item) => 'str' in item)
                    .map((item) => ({
                    text: item.str,
                    x: item.transform[4],
                    y: item.transform[5],
                    fontSize: Math.abs(item.transform[0]),
                    hasEOL: item.hasEOL ?? false,
                }));
                pages.push({ pageNum: i, items });
            }
            // Apply sentence-level header/footer filtering
            // This handles variable content like page numbers ("7 of 75") using semantic similarity
            const text = await (0, pdf_filter_js_1.filterPageBoundarySentences)(pages, embedder);
            console.error(`Parsed PDF: ${filePath} (${text.length} characters, ${pdf.numPages} pages)`);
            return text;
        }
        catch (error) {
            throw new FileOperationError(`Failed to parse PDF: ${filePath}`, error);
        }
    }
    /**
     * DOCX parsing (using mammoth)
     *
     * @param filePath - DOCX file path
     * @returns Parsed text
     * @throws FileOperationError - File read failed, parse failed
     */
    async parseDocx(filePath) {
        try {
            const result = await mammoth_1.default.extractRawText({ path: filePath });
            console.error(`Parsed DOCX: ${filePath} (${result.value.length} characters)`);
            return result.value;
        }
        catch (error) {
            throw new FileOperationError(`Failed to parse DOCX: ${filePath}`, error);
        }
    }
    /**
     * TXT parsing (using fs.readFile)
     *
     * @param filePath - TXT file path
     * @returns Parsed text
     * @throws FileOperationError - File read failed
     */
    async parseTxt(filePath) {
        try {
            const text = await (0, promises_1.readFile)(filePath, 'utf-8');
            console.error(`Parsed TXT: ${filePath} (${text.length} characters)`);
            return text;
        }
        catch (error) {
            throw new FileOperationError(`Failed to parse TXT: ${filePath}`, error);
        }
    }
    /**
     * MD parsing (using fs.readFile)
     *
     * @param filePath - MD file path
     * @returns Parsed text
     * @throws FileOperationError - File read failed
     */
    async parseMd(filePath) {
        try {
            const text = await (0, promises_1.readFile)(filePath, 'utf-8');
            console.error(`Parsed MD: ${filePath} (${text.length} characters)`);
            return text;
        }
        catch (error) {
            throw new FileOperationError(`Failed to parse MD: ${filePath}`, error);
        }
    }
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
    async parseJson(filePath) {
        try {
            const content = await (0, promises_1.readFile)(filePath, 'utf-8');
            const data = JSON.parse(content);
            const text = this.jsonToText(data);
            console.error(`Parsed JSON: ${filePath} (${text.length} characters)`);
            return text;
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                throw new FileOperationError(`Failed to parse JSON (invalid syntax): ${filePath}`, error);
            }
            throw new FileOperationError(`Failed to parse JSON: ${filePath}`, error);
        }
    }
    /**
     * Convert JSON value to searchable text format
     *
     * @param value - JSON value (object, array, or primitive)
     * @param prefix - Key prefix for nested objects (dot notation)
     * @returns Text representation
     */
    jsonToText(value, prefix = '') {
        if (value === null || value === undefined) {
            return prefix ? `${prefix}: null` : '';
        }
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return prefix ? `${prefix}: []` : '';
            }
            // Check if array contains objects
            if (typeof value[0] === 'object' && value[0] !== null) {
                // Array of objects: process each with index
                return value
                    .map((item, index) => this.jsonToText(item, prefix ? `${prefix}[${index}]` : `[${index}]`))
                    .filter((text) => text.length > 0)
                    .join('\n');
            }
            // Array of primitives: join values
            const joined = value.map((v) => String(v)).join(', ');
            return prefix ? `${prefix}: ${joined}` : joined;
        }
        if (typeof value === 'object') {
            const lines = [];
            for (const [key, val] of Object.entries(value)) {
                const newPrefix = prefix ? `${prefix}.${key}` : key;
                const text = this.jsonToText(val, newPrefix);
                if (text.length > 0) {
                    lines.push(text);
                }
            }
            return lines.join('\n');
        }
        // Primitive value
        const strValue = String(value);
        return prefix ? `${prefix}: ${strValue}` : strValue;
    }
}
exports.DocumentParser = DocumentParser;
//# sourceMappingURL=index.js.map