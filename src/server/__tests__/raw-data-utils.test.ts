// Tests for raw data utilities

import { mkdir, rm, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  generateRawDataPath,
  saveRawData,
  isRawDataPath,
  isManagedRawDataPath,
  extractSourceFromPath,
} from '../raw-data-utils.js'

const TEST_DIR = './tmp/test-raw-data-utils'
const TEST_DB_PATH = join(TEST_DIR, 'test-db')

describe('Raw Data Utils', () => {
  beforeAll(async () => {
    await mkdir(TEST_DIR, { recursive: true })
  })

  afterAll(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true })
    }
  })

  describe('generateRawDataPath', () => {
    it('should generate path with .md extension', () => {
      const path = generateRawDataPath(TEST_DB_PATH, 'https://example.com', 'text')

      expect(path).toMatch(/\.md$/)
    })

    it('should use normalized source for path generation', () => {
      const path1 = generateRawDataPath(TEST_DB_PATH, 'https://example.com/path', 'text')
      const path2 = generateRawDataPath(TEST_DB_PATH, 'https://example.com/path?query=1', 'text')

      // Both should normalize to same path
      expect(path1).toBe(path2)
    })

    it('should generate unique paths for different sources', () => {
      const path1 = generateRawDataPath(TEST_DB_PATH, 'https://example1.com', 'text')
      const path2 = generateRawDataPath(TEST_DB_PATH, 'https://example2.com', 'text')

      expect(path1).not.toBe(path2)
    })

    it('should reject blocked protocols', () => {
      expect(() => generateRawDataPath(TEST_DB_PATH, 'javascript:alert(1)', 'text')).toThrow(
        'Blocked protocol'
      )
      expect(() => generateRawDataPath(TEST_DB_PATH, 'data:text/html,<script>', 'text')).toThrow(
        'Blocked protocol'
      )
    })
  })

  describe('saveRawData', () => {
    it('should save content to file', async () => {
      const content = 'Test content for saving'
      const source = 'test://save-test-1'

      const savedPath = await saveRawData(TEST_DB_PATH, source, content, 'text')

      expect(existsSync(savedPath)).toBe(true)

      const readContent = await readFile(savedPath, 'utf-8')
      expect(readContent).toBe(content)
    })

    it('should create directory if it does not exist', async () => {
      const newDbPath = join(TEST_DIR, `new-db-${Date.now()}`)
      const content = 'Test content'
      const source = 'test://new-db-test'

      const savedPath = await saveRawData(newDbPath, source, content, 'text')

      expect(existsSync(savedPath)).toBe(true)
    })

    it('should handle unicode content', async () => {
      const content = '日本語テスト内容'
      const source = 'test://unicode-test'

      const savedPath = await saveRawData(TEST_DB_PATH, source, content, 'text')
      const readContent = await readFile(savedPath, 'utf-8')

      expect(readContent).toBe(content)
    })
  })

  describe('isRawDataPath', () => {
    it('should detect raw-data paths (POSIX)', () => {
      expect(isRawDataPath('/path/to/db/raw-data/file.md')).toBe(true)
    })

    it('should detect raw-data paths with native separator', () => {
      // This test uses the native path separator which works on any platform
      const { sep } = require('node:path')
      const testPath = `C:${sep}path${sep}to${sep}db${sep}raw-data${sep}file.md`
      expect(isRawDataPath(testPath)).toBe(true)
    })

    it('should return false for non-raw-data paths', () => {
      expect(isRawDataPath('/path/to/db/other/file.md')).toBe(false)
    })

    it('should return false for paths containing raw-data not as directory', () => {
      // raw-data-backup is different from /raw-data/
      expect(isRawDataPath('/path/to/raw-data-backup/file.md')).toBe(false)
    })
  })

  describe('isManagedRawDataPath', () => {
    it('should return true for path inside current db raw-data directory', () => {
      const dbPath = '/path/to/db'
      const filePath = '/path/to/db/raw-data/file.md'
      expect(isManagedRawDataPath(dbPath, filePath)).toBe(true)
    })

    it('should return false for path containing raw-data outside current db', () => {
      const dbPath = '/path/to/db'
      const filePath = '/other/location/raw-data/file.md'
      expect(isManagedRawDataPath(dbPath, filePath)).toBe(false)
    })

    it('should return false for sibling path with common prefix', () => {
      const dbPath = '/path/to/db'
      const filePath = '/path/to/db2/raw-data/file.md'
      expect(isManagedRawDataPath(dbPath, filePath)).toBe(false)
    })
  })

  describe('extractSourceFromPath', () => {
    it('should extract source from raw-data file path', async () => {
      const source = 'https://example.com/test'
      const savedPath = await saveRawData(TEST_DB_PATH, source, 'content', 'text')

      const extracted = extractSourceFromPath(savedPath)

      expect(extracted).toBe(source)
    })

    it('should return null for non-raw-data paths', () => {
      const result = extractSourceFromPath('/path/to/regular/file.md')
      expect(result).toBeNull()
    })

    it('should return null for paths without extension', () => {
      const result = extractSourceFromPath('/path/to/raw-data/noextension')
      expect(result).toBeNull()
    })

    it('should handle paths with multiple dots', async () => {
      const source = 'https://example.com/file.name.html'
      const savedPath = await saveRawData(TEST_DB_PATH, source, 'content', 'text')

      const extracted = extractSourceFromPath(savedPath)

      expect(extracted).toBe(source)
    })
  })
})
