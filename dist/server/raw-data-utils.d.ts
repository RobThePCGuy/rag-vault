/**
 * Encode string to URL-safe base64 (base64url)
 * - Replaces + with -
 * - Replaces / with _
 * - Removes padding (=)
 *
 * @param str - String to encode
 * @returns URL-safe base64 encoded string
 */
export declare function encodeBase64Url(str: string): string;
/**
 * Decode URL-safe base64 (base64url) to string
 *
 * @param base64url - URL-safe base64 encoded string
 * @returns Decoded string
 */
export declare function decodeBase64Url(base64url: string): string;
/**
 * Validate that a source doesn't use a dangerous protocol
 *
 * @param source - Source identifier to validate
 * @throws Error if the protocol is blocked
 */
export declare function validateSourceProtocol(source: string): void;
/**
 * Normalize source URL by removing query string and fragment
 * Only normalizes HTTP(S) URLs. Other sources (e.g., "clipboard://...") are returned as-is
 *
 * @param source - Source identifier (URL or custom ID)
 * @returns Normalized source
 * @throws Error if the source uses a disallowed protocol
 */
export declare function normalizeSource(source: string): string;
/**
 * Content format type for ingest_data
 */
export type ContentFormat = 'text' | 'html' | 'markdown';
/**
 * Get raw-data directory path
 *
 * @param dbPath - LanceDB database path
 * @returns Raw-data directory path
 */
export declare function getRawDataDir(dbPath: string): string;
/**
 * Generate raw-data file path from source and format
 * Path format: {dbPath}/raw-data/{base64url(normalizedSource)}.{ext}
 *
 * @param dbPath - LanceDB database path
 * @param source - Source identifier (URL or custom ID)
 * @param format - Content format
 * @returns Generated file path
 */
export declare function generateRawDataPath(dbPath: string, source: string, _format: ContentFormat): string;
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
export declare function saveRawData(dbPath: string, source: string, content: string, format: ContentFormat): Promise<string>;
/**
 * Check if file path is in raw-data directory
 *
 * @param filePath - File path to check
 * @returns True if path is in raw-data directory
 */
export declare function isRawDataPath(filePath: string): boolean;
/**
 * Extract original source from raw-data file path
 * Returns null if not a raw-data path
 *
 * @param filePath - Raw-data file path
 * @returns Original source or null
 */
export declare function extractSourceFromPath(filePath: string): string | null;
//# sourceMappingURL=raw-data-utils.d.ts.map