// Shared file utility functions

import { existsSync } from 'node:fs'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

/**
 * Atomically write a file using temp file + rename pattern.
 * This prevents read-modify-write race conditions.
 *
 * @param filePath - Destination file path
 * @param content - Content to write
 */
export async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }

  // Write to temp file with unique name, then rename atomically
  const tempPath = `${filePath}.${randomUUID()}.tmp`
  try {
    await writeFile(tempPath, content, 'utf-8')
    // Retry rename on Windows EPERM (file handle contention)
    const maxRetries = process.platform === 'win32' ? 3 : 0
    for (let attempt = 0; ; attempt++) {
      try {
        await rename(tempPath, filePath)
        break
      } catch (err) {
        const isRetryable =
          attempt < maxRetries &&
          err instanceof Error &&
          'code' in err &&
          (err as NodeJS.ErrnoException).code === 'EPERM'
        if (!isRetryable) throw err
        await new Promise((r) => setTimeout(r, 50 * (attempt + 1)))
      }
    }
  } catch (error) {
    // Clean up temp file on failure
    try {
      await rm(tempPath, { force: true })
    } catch {
      // Ignore cleanup errors
    }
    throw error
  }
}
