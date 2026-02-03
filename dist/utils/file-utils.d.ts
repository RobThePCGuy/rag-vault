/**
 * Atomically write a file using temp file + rename pattern.
 * This prevents read-modify-write race conditions.
 *
 * @param filePath - Destination file path
 * @param content - Content to write
 */
export declare function atomicWriteFile(filePath: string, content: string): Promise<void>;
//# sourceMappingURL=file-utils.d.ts.map