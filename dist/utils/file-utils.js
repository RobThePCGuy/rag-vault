// Shared file utility functions
import { existsSync } from 'node:fs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
/**
 * Atomically write a file using temp file + rename pattern.
 * This prevents read-modify-write race conditions.
 *
 * @param filePath - Destination file path
 * @param content - Content to write
 */
export async function atomicWriteFile(filePath, content) {
    const dir = path.dirname(filePath);
    if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
    }
    // Write to temp file with unique name, then rename atomically
    const tempPath = `${filePath}.${randomUUID()}.tmp`;
    try {
        await writeFile(tempPath, content, 'utf-8');
        await rename(tempPath, filePath);
    }
    catch (error) {
        // Clean up temp file on failure
        try {
            await rm(tempPath, { force: true });
        }
        catch {
            // Ignore cleanup errors
        }
        throw error;
    }
}
//# sourceMappingURL=file-utils.js.map