"use strict";
// Raw Data Utilities for ingest_data tool
// Handles: base64url encoding, source normalization, file saving, source extraction
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeBase64Url = encodeBase64Url;
exports.decodeBase64Url = decodeBase64Url;
exports.validateSourceProtocol = validateSourceProtocol;
exports.normalizeSource = normalizeSource;
exports.getRawDataDir = getRawDataDir;
exports.generateRawDataPath = generateRawDataPath;
exports.saveRawData = saveRawData;
exports.isRawDataPath = isRawDataPath;
exports.extractSourceFromPath = extractSourceFromPath;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
// ============================================
// Base64URL Encoding/Decoding
// ============================================
/**
 * Encode string to URL-safe base64 (base64url)
 * - Replaces + with -
 * - Replaces / with _
 * - Removes padding (=)
 *
 * @param str - String to encode
 * @returns URL-safe base64 encoded string
 */
function encodeBase64Url(str) {
    return Buffer.from(str, 'utf-8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
/**
 * Decode URL-safe base64 (base64url) to string
 *
 * @param base64url - URL-safe base64 encoded string
 * @returns Decoded string
 */
function decodeBase64Url(base64url) {
    // Convert base64url to standard base64
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4 !== 0) {
        base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf-8');
}
// ============================================
// Source Normalization
// ============================================
/**
 * Blocked protocols that could be dangerous or lead to security issues.
 * - javascript: XSS attacks
 * - vbscript: VBScript execution
 * - data: Can embed malicious content
 */
const BLOCKED_PROTOCOLS = ['javascript:', 'vbscript:', 'data:'];
/**
 * Validate that a source doesn't use a dangerous protocol
 *
 * @param source - Source identifier to validate
 * @throws Error if the protocol is blocked
 */
function validateSourceProtocol(source) {
    try {
        const parsed = new URL(source);
        if (BLOCKED_PROTOCOLS.includes(parsed.protocol)) {
            throw new Error(`Blocked protocol: ${parsed.protocol}. These protocols are not allowed for security reasons.`);
        }
    }
    catch (error) {
        // If it's our validation error, rethrow it
        if (error instanceof Error && error.message.startsWith('Blocked protocol')) {
            throw error;
        }
        // Not a valid URL format - this is OK, could be a simple identifier
    }
}
/**
 * Normalize source URL by removing query string and fragment
 * Only normalizes HTTP(S) URLs. Other sources (e.g., "clipboard://...") are returned as-is
 *
 * @param source - Source identifier (URL or custom ID)
 * @returns Normalized source
 * @throws Error if the source uses a disallowed protocol
 */
function normalizeSource(source) {
    // Validate protocol before processing
    validateSourceProtocol(source);
    try {
        const parsed = new URL(source);
        // Only normalize HTTP(S) URLs
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return `${parsed.origin}${parsed.pathname}`;
        }
        // Non-HTTP URLs (clipboard://, etc.) are returned as-is
        return source;
    }
    catch {
        // Not a valid URL, return as-is
        return source;
    }
}
// ============================================
// Path Generation
// ============================================
/**
 * Get raw-data directory path
 *
 * @param dbPath - LanceDB database path
 * @returns Raw-data directory path
 */
function getRawDataDir(dbPath) {
    return (0, node_path_1.join)(dbPath, 'raw-data');
}
/**
 * Generate raw-data file path from source and format
 * Path format: {dbPath}/raw-data/{base64url(normalizedSource)}.{ext}
 *
 * @param dbPath - LanceDB database path
 * @param source - Source identifier (URL or custom ID)
 * @param format - Content format
 * @returns Generated file path
 */
function generateRawDataPath(dbPath, source, _format) {
    const normalizedSource = normalizeSource(source);
    const encoded = encodeBase64Url(normalizedSource);
    // All formats use .md extension for consistency
    // This allows generating unique path from source without knowing original format
    return (0, node_path_1.resolve)(getRawDataDir(dbPath), `${encoded}.md`);
}
// ============================================
// File Operations
// ============================================
/**
 * Save content to raw-data directory
 * Creates directory if it doesn't exist
 *
 * @param dbPath - LanceDB database path
 * @param source - Source identifier (URL or custom ID)
 * @param content - Content to save
 * @param format - Content format
 * @returns Saved file path
 */
async function saveRawData(dbPath, source, content, format) {
    const filePath = generateRawDataPath(dbPath, source, format);
    // Ensure directory exists
    await (0, promises_1.mkdir)((0, node_path_1.dirname)(filePath), { recursive: true });
    // Write content to file
    await (0, promises_1.writeFile)(filePath, content, 'utf-8');
    return filePath;
}
// ============================================
// Path Detection and Source Extraction
// ============================================
// Path patterns for raw-data directory detection (cross-platform)
const RAW_DATA_POSIX = '/raw-data/';
const RAW_DATA_NATIVE = `${node_path_1.sep}raw-data${node_path_1.sep}`;
/**
 * Check if file path is in raw-data directory
 *
 * @param filePath - File path to check
 * @returns True if path is in raw-data directory
 */
function isRawDataPath(filePath) {
    return filePath.includes(RAW_DATA_NATIVE) || filePath.includes(RAW_DATA_POSIX);
}
/**
 * Extract original source from raw-data file path
 * Returns null if not a raw-data path
 *
 * @param filePath - Raw-data file path
 * @returns Original source or null
 */
function extractSourceFromPath(filePath) {
    // Try native path separator first, then POSIX
    let rawDataIndex = filePath.indexOf(RAW_DATA_NATIVE);
    let markerLength = RAW_DATA_NATIVE.length;
    if (rawDataIndex === -1) {
        rawDataIndex = filePath.indexOf(RAW_DATA_POSIX);
        markerLength = RAW_DATA_POSIX.length;
    }
    if (rawDataIndex === -1) {
        return null;
    }
    const fileName = filePath.slice(rawDataIndex + markerLength);
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex === -1) {
        return null;
    }
    const encoded = fileName.slice(0, dotIndex);
    return decodeBase64Url(encoded);
}
//# sourceMappingURL=raw-data-utils.js.map