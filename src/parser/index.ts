// DocumentParser implementation with PDF/DOCX/TXT/MD/JSON/JSONL support

import { realpathSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, isAbsolute, relative, resolve } from 'node:path'

// ============================================
// RAG Content Filtering Constants
// ============================================

/**
 * Minimum character threshold for string inclusion
 * Strings >= 20 chars are always included
 */
const MIN_STRING_LENGTH = 20

/**
 * Maximum JSON content size (10MB) to prevent memory exhaustion
 * during JSON parsing of large files
 */
const MAX_JSON_CONTENT_SIZE = 10 * 1024 * 1024

/**
 * Key allowlist for prose-related fields (case-insensitive partial match)
 * These keys likely contain meaningful text even if short
 */
const PROSE_KEYS = [
  'title',
  'name',
  'heading',
  'caption',
  'summary',
  'scene',
  'chapter',
  'section',
  'speaker',
  'dialogue',
  'line',
  'text',
  'description',
  'content',
  'body',
  'message',
  'note',
  'comment',
  'label',
]

/**
 * Check if string looks like code/ID (should be filtered)
 * Examples: "abc123-def456", "USR_001", "a1b2c3d4e5f6", GUIDs
 */
function looksLikeCode(str: string): boolean {
  // GUID pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return true
  }
  // Mostly digits, underscores, or hex characters (>50% non-letter)
  const nonLetterRatio = (str.match(/[^a-zA-Z\s]/g) || []).length / str.length
  if (nonLetterRatio > 0.5) {
    return true
  }
  // Contains underscore - typical of IDs (e.g., USR_001, ACTIVE_V2, user_id)
  if (str.includes('_')) {
    return true
  }
  // Ends with digit suffix typical of IDs (e.g., V2, rev3)
  if (/[A-Z]\d+$/.test(str) || /^\d+[A-Z]/.test(str)) {
    return true
  }
  return false
}

/**
 * Check if string looks like prose (should be kept)
 * Examples: "Alice", "The Beginning", "Chapter One"
 */
function looksLikeProse(str: string): boolean {
  // Mostly letters and spaces with optional punctuation
  const proseRatio = (str.match(/[a-zA-Z\s]/g) || []).length / str.length
  return proseRatio >= 0.7
}
import mammoth from 'mammoth'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import { ParserFileOperationError, ParserValidationError } from '../errors/index.js'
import { type EmbedderInterface, type PageData, filterPageBoundarySentences } from './pdf-filter.js'

// Re-export error classes for backwards compatibility
export { ParserFileOperationError, ParserValidationError } from '../errors/index.js'

// ============================================
// Type Definitions
// ============================================

/**
 * DocumentParser configuration
 */
export interface ParserConfig {
  /** Security: allowed base directory */
  baseDir: string
  /** Maximum file size (100MB) */
  maxFileSize: number
}

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
export class DocumentParser {
  private readonly config: ParserConfig

  constructor(config: ParserConfig) {
    this.config = config
  }

  /**
   * File path validation (Absolute path requirement + Path traversal prevention)
   *
   * @param filePath - File path to validate (must be absolute)
   * @throws ParserValidationError - When path is not absolute or outside BASE_DIR
   */
  validateFilePath(filePath: string): void {
    // Check if path is absolute
    if (!isAbsolute(filePath)) {
      throw new ParserValidationError(
        `File path must be absolute path (received: ${filePath}). Please provide an absolute path within BASE_DIR.`
      )
    }

    // Resolve symlinks for both base and target to prevent symlink escape attacks.
    // Fall back to resolve() only when path does not exist yet.
    const resolveCanonicalPath = (targetPath: string): string => {
      try {
        return realpathSync(targetPath)
      } catch (error) {
        const nodeError = error as NodeJS.ErrnoException
        if (nodeError.code === 'ENOENT') {
          return resolve(targetPath)
        }
        throw new ParserValidationError(
          `Failed to resolve path for security validation: ${targetPath}`
        )
      }
    }

    // Check if path is within BASE_DIR using relative-path boundary check.
    // This avoids prefix bypasses such as /base matching /base2.
    const baseDir = resolveCanonicalPath(this.config.baseDir)
    const normalizedPath = resolveCanonicalPath(filePath)
    const relativePath = relative(baseDir, normalizedPath)
    const isOutsideBaseDir =
      relativePath.startsWith('..') || relativePath === '..' || isAbsolute(relativePath)

    if (isOutsideBaseDir) {
      throw new ParserValidationError(
        `File path must be within BASE_DIR (${baseDir}). Received path outside BASE_DIR: ${filePath}`
      )
    }
  }

  /**
   * File size validation (100MB limit)
   *
   * @param filePath - File path to validate
   * @throws ParserValidationError - When file size exceeds limit
   * @throws ParserFileOperationError - When file read fails
   */
  validateFileSize(filePath: string): void {
    try {
      const stats = statSync(filePath)
      if (stats.size > this.config.maxFileSize) {
        throw new ParserValidationError(
          `File size exceeds limit: ${stats.size} > ${this.config.maxFileSize}`
        )
      }
    } catch (error) {
      if (error instanceof ParserValidationError) {
        throw error
      }
      throw new ParserFileOperationError(`Failed to check file size: ${filePath}`, error as Error)
    }
  }

  /**
   * File parsing (auto format detection)
   *
   * @param filePath - File path to parse
   * @returns Parsed text
   * @throws ParserValidationError - Path traversal, size exceeded, unsupported format
   * @throws ParserFileOperationError - File read failed, parse failed
   */
  async parseFile(filePath: string): Promise<string> {
    // Validation
    this.validateFilePath(filePath)
    this.validateFileSize(filePath)

    // Format detection (PDF uses parsePdf directly)
    const ext = extname(filePath).toLowerCase()
    switch (ext) {
      case '.docx':
        return await this.parseDocx(filePath)
      case '.txt':
        return await this.parseTxt(filePath)
      case '.md':
        return await this.parseMd(filePath)
      case '.json':
        return await this.parseJson(filePath)
      case '.jsonl':
      case '.ndjson':
        return await this.parseJsonl(filePath)
      default:
        throw new ParserValidationError(`Unsupported file format: ${ext}`)
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
   * @throws ParserFileOperationError - File read failed, parse failed
   */
  async parsePdf(filePath: string, embedder: EmbedderInterface): Promise<string> {
    // Validation
    this.validateFilePath(filePath)
    this.validateFileSize(filePath)

    try {
      const buffer = await readFile(filePath)
      const pdf = await getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        isEvalSupported: false,
      }).promise

      // Extract text with position information from each page
      const pages: PageData[] = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()

        const items = textContent.items
          .filter((item): item is TextItem => 'str' in item)
          .map((item) => ({
            text: item.str,
            x: item.transform[4],
            y: item.transform[5],
            fontSize: Math.abs(item.transform[0]),
            hasEOL: item.hasEOL ?? false,
          }))

        pages.push({ pageNum: i, items })
      }

      // Apply sentence-level header/footer filtering
      // This handles variable content like page numbers ("7 of 75") using semantic similarity
      const text = await filterPageBoundarySentences(pages, embedder)

      console.error(`Parsed PDF: ${filePath} (${text.length} characters, ${pdf.numPages} pages)`)

      return text
    } catch (error) {
      throw new ParserFileOperationError(`Failed to parse PDF: ${filePath}`, error as Error)
    }
  }

  /**
   * DOCX parsing (using mammoth)
   *
   * @param filePath - DOCX file path
   * @returns Parsed text
   * @throws ParserFileOperationError - File read failed, parse failed
   */
  private async parseDocx(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath })
      console.error(`Parsed DOCX: ${filePath} (${result.value.length} characters)`)
      return result.value
    } catch (error) {
      throw new ParserFileOperationError(`Failed to parse DOCX: ${filePath}`, error as Error)
    }
  }

  /**
   * TXT parsing (using fs.readFile)
   *
   * @param filePath - TXT file path
   * @returns Parsed text
   * @throws ParserFileOperationError - File read failed
   */
  private async parseTxt(filePath: string): Promise<string> {
    try {
      const text = await readFile(filePath, 'utf-8')
      console.error(`Parsed TXT: ${filePath} (${text.length} characters)`)
      return text
    } catch (error) {
      throw new ParserFileOperationError(`Failed to parse TXT: ${filePath}`, error as Error)
    }
  }

  /**
   * MD parsing (using fs.readFile)
   *
   * @param filePath - MD file path
   * @returns Parsed text
   * @throws ParserFileOperationError - File read failed
   */
  private async parseMd(filePath: string): Promise<string> {
    try {
      const text = await readFile(filePath, 'utf-8')
      console.error(`Parsed MD: ${filePath} (${text.length} characters)`)
      return text
    } catch (error) {
      throw new ParserFileOperationError(`Failed to parse MD: ${filePath}`, error as Error)
    }
  }

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
  private async parseJson(filePath: string): Promise<string> {
    try {
      const content = await readFile(filePath, 'utf-8')

      // Check size limit before parsing to prevent memory exhaustion
      if (content.length > MAX_JSON_CONTENT_SIZE) {
        throw new ParserValidationError(
          `JSON content size (${content.length} bytes) exceeds limit (${MAX_JSON_CONTENT_SIZE} bytes)`
        )
      }

      try {
        const data = JSON.parse(content)
        const text = this.jsonToText(data)
        console.error(`Parsed JSON: ${filePath} (${text.length} characters)`)
        return text
      } catch (e) {
        if (e instanceof SyntaxError) {
          // Fallback: try parsing as JSONL
          console.error(`JSON parse failed, attempting JSONL fallback: ${filePath}`)
          return this.parseJsonlContent(content, filePath)
        }
        throw e
      }
    } catch (error) {
      if (error instanceof ParserFileOperationError) throw error
      throw new ParserFileOperationError(`Failed to parse JSON: ${filePath}`, error as Error)
    }
  }

  /**
   * JSONL parsing - parses line-delimited JSON files
   *
   * @param filePath - JSONL file path
   * @returns Parsed text from all valid JSON objects
   * @throws ParserFileOperationError - File read failed
   */
  private async parseJsonl(filePath: string): Promise<string> {
    try {
      const content = await readFile(filePath, 'utf-8')
      return this.parseJsonlContent(content, filePath)
    } catch (error) {
      if (error instanceof ParserFileOperationError) throw error
      throw new ParserFileOperationError(`Failed to parse JSONL: ${filePath}`, error as Error)
    }
  }

  /**
   * Parse JSONL content (shared logic for parseJsonl and JSON fallback)
   *
   * @param content - Raw file content
   * @param filePath - File path (for logging)
   * @returns Parsed text from all valid JSON objects
   */
  private parseJsonlContent(content: string, filePath: string): string {
    const lines = content.split('\n').filter((line) => line.trim())
    const results: string[] = []

    for (const [i, line] of lines.entries()) {
      try {
        const data = JSON.parse(line)
        const text = this.jsonToText(data, `[${i}]`)
        if (text.length > 0) results.push(text)
      } catch {
        // Skip malformed lines, continue processing
        console.error(`JSONL line ${i + 1} skipped (invalid JSON)`)
      }
    }

    console.error(`Parsed JSONL: ${filePath} (${results.length} objects)`)
    return results.join('\n')
  }

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
  private shouldIncludeString(value: string, key: string): boolean {
    // Always exclude code-like strings, regardless of length
    if (looksLikeCode(value)) return false

    // Include strings >= 20 chars (already passed code check)
    if (value.length >= MIN_STRING_LENGTH) return true

    // Check key allowlist (case-insensitive partial match)
    const keyLower = key.toLowerCase()
    if (PROSE_KEYS.some((pk) => keyLower.includes(pk))) {
      return true // Keep if allowlisted key (already passed code check)
    }

    // For other keys, only keep if it looks like prose
    return looksLikeProse(value)
  }

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
  private jsonToText(value: unknown, prefix = ''): string {
    if (value === null || value === undefined) return ''

    if (Array.isArray(value)) {
      if (value.length === 0) return ''
      // Check if array contains objects
      if (typeof value[0] === 'object' && value[0] !== null) {
        // Array of objects: process each with index
        return value
          .map((item, index) =>
            this.jsonToText(item, prefix ? `${prefix}[${index}]` : `[${index}]`)
          )
          .filter((text) => text.length > 0)
          .join('\n')
      }
      // Array of primitives: filter by same rules
      const key = prefix.split('.').pop() || ''
      const validStrings = value
        .filter((v) => typeof v === 'string' && this.shouldIncludeString(v, key))
        .map((v) => String(v))
      if (validStrings.length === 0) return ''
      return prefix ? `${prefix}: ${validStrings.join(', ')}` : validStrings.join(', ')
    }

    if (typeof value === 'object') {
      const lines: string[] = []
      for (const [key, val] of Object.entries(value)) {
        const newPrefix = prefix ? `${prefix}.${key}` : key
        const text = this.jsonToText(val, newPrefix)
        if (text.length > 0) {
          lines.push(text)
        }
      }
      return lines.join('\n')
    }

    // String filtering with smart rules
    if (typeof value === 'string') {
      const key = prefix.split('.').pop() || ''
      if (this.shouldIncludeString(value, key)) {
        return prefix ? `${prefix}: ${value}` : value
      }
    }

    // Skip numbers and booleans (metadata noise)
    return ''
  }
}
