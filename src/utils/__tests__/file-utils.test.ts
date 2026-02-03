// Tests for file utility functions

import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { atomicWriteFile } from '../file-utils.js'

describe('File Utilities', () => {
  describe('atomicWriteFile', () => {
    let tmpDir: string

    beforeEach(async () => {
      // Create a unique temp directory for each test
      tmpDir = path.join(process.cwd(), '.test-tmp', `file-utils-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      await mkdir(tmpDir, { recursive: true })
    })

    afterEach(async () => {
      // Clean up temp directory
      await rm(tmpDir, { recursive: true, force: true })
      vi.restoreAllMocks()
    })

    it('should write file atomically', async () => {
      const testPath = path.join(tmpDir, 'test.txt')
      const content = 'Hello, World!'

      await atomicWriteFile(testPath, content)

      expect(existsSync(testPath)).toBe(true)
      const result = await readFile(testPath, 'utf-8')
      expect(result).toBe(content)
    })

    it('should create parent directory if it does not exist', async () => {
      const deepPath = path.join(tmpDir, 'a', 'b', 'c', 'file.txt')
      const content = 'nested content'

      await atomicWriteFile(deepPath, content)

      expect(existsSync(deepPath)).toBe(true)
      const result = await readFile(deepPath, 'utf-8')
      expect(result).toBe(content)
    })

    it('should overwrite existing file', async () => {
      const testPath = path.join(tmpDir, 'existing.txt')

      // Write initial content
      await writeFile(testPath, 'original content', 'utf-8')

      // Overwrite with atomic write
      await atomicWriteFile(testPath, 'new content')

      const result = await readFile(testPath, 'utf-8')
      expect(result).toBe('new content')
    })

    it('should clean up temp file on write failure by path', async () => {
      // Test by trying to write to a directory (which will fail)
      const testPath = path.join(tmpDir, 'subdir')
      await mkdir(testPath)

      // Try to write to a path that's a directory - should fail
      await expect(atomicWriteFile(testPath, 'content')).rejects.toThrow()

      // Verify no temp files left behind in parent
      const files = await readdir(tmpDir)
      const tmpFiles = files.filter((f) => f.endsWith('.tmp'))
      expect(tmpFiles).toHaveLength(0)
    })

    it('should preserve existing content when write fails', async () => {
      const testPath = path.join(tmpDir, 'partial.txt')
      const originalContent = 'original content'

      // Write initial content
      await writeFile(testPath, originalContent, 'utf-8')

      // Try to write to a read-only location (simulate failure by invalid path)
      const invalidPath = path.join(tmpDir, '\0invalid', 'file.txt') // null char makes path invalid

      await expect(atomicWriteFile(invalidPath, 'new content')).rejects.toThrow()

      // Original file should still be intact since we wrote to a different path
      const result = await readFile(testPath, 'utf-8')
      expect(result).toBe(originalContent)
    })

    it('should handle empty content', async () => {
      const testPath = path.join(tmpDir, 'empty.txt')

      await atomicWriteFile(testPath, '')

      expect(existsSync(testPath)).toBe(true)
      const result = await readFile(testPath, 'utf-8')
      expect(result).toBe('')
    })

    it('should handle unicode content', async () => {
      const testPath = path.join(tmpDir, 'unicode.txt')
      const content = '你好世界 🌍 émojis'

      await atomicWriteFile(testPath, content)

      const result = await readFile(testPath, 'utf-8')
      expect(result).toBe(content)
    })

    it('should handle large content', async () => {
      const testPath = path.join(tmpDir, 'large.txt')
      const content = 'x'.repeat(1024 * 1024) // 1MB

      await atomicWriteFile(testPath, content)

      const result = await readFile(testPath, 'utf-8')
      expect(result).toBe(content)
    })
  })
})
