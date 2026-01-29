// Tests for raw data utilities

import { mkdir, rm, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  encodeBase64Url,
  decodeBase64Url,
  normalizeSource,
  validateSourceProtocol,
  generateRawDataPath,
  saveRawData,
  isRawDataPath,
  extractSourceFromPath,
  getRawDataDir,
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

  describe('encodeBase64Url', () => {
    it('should encode string to URL-safe base64', () => {
      const input = 'https://example.com/path'
      const encoded = encodeBase64Url(input)

      // Should not contain +, /, or =
      expect(encoded).not.toMatch(/[+/=]/)
    })

    it('should handle special characters', () => {
      const input = 'https://example.com/path?query=value&foo=bar'
      const encoded = encodeBase64Url(input)

      expect(encoded).not.toMatch(/[+/=]/)
    })

    it('should handle unicode characters', () => {
      const input = 'https://example.com/日本語'
      const encoded = encodeBase64Url(input)

      expect(encoded).not.toMatch(/[+/=]/)
    })

    it('should handle empty string', () => {
      const encoded = encodeBase64Url('')
      expect(encoded).toBe('')
    })
  })

  describe('decodeBase64Url', () => {
    it('should decode URL-safe base64 back to original', () => {
      const original = 'https://example.com/path'
      const encoded = encodeBase64Url(original)
      const decoded = decodeBase64Url(encoded)

      expect(decoded).toBe(original)
    })

    it('should handle special characters roundtrip', () => {
      const original = 'https://example.com/path?query=value&foo=bar'
      const encoded = encodeBase64Url(original)
      const decoded = decodeBase64Url(encoded)

      expect(decoded).toBe(original)
    })

    it('should handle unicode roundtrip', () => {
      const original = 'https://example.com/日本語'
      const encoded = encodeBase64Url(original)
      const decoded = decodeBase64Url(encoded)

      expect(decoded).toBe(original)
    })
  })

  describe('validateSourceProtocol', () => {
    it('should allow http protocol', () => {
      expect(() => validateSourceProtocol('http://example.com')).not.toThrow()
    })

    it('should allow https protocol', () => {
      expect(() => validateSourceProtocol('https://example.com')).not.toThrow()
    })

    it('should allow clipboard protocol', () => {
      expect(() => validateSourceProtocol('clipboard://12345')).not.toThrow()
    })

    it('should allow chat protocol', () => {
      expect(() => validateSourceProtocol('chat://session-123')).not.toThrow()
    })

    it('should allow file protocol', () => {
      expect(() => validateSourceProtocol('file:///path/to/file')).not.toThrow()
    })

    it('should block javascript protocol', () => {
      expect(() => validateSourceProtocol('javascript:alert(1)')).toThrow(
        'Blocked protocol: javascript:'
      )
    })

    it('should block vbscript protocol', () => {
      expect(() => validateSourceProtocol('vbscript:msgbox(1)')).toThrow(
        'Blocked protocol: vbscript:'
      )
    })

    it('should block data protocol', () => {
      expect(() => validateSourceProtocol('data:text/html,<script>alert(1)</script>')).toThrow(
        'Blocked protocol: data:'
      )
    })

    it('should allow non-URL identifiers', () => {
      expect(() => validateSourceProtocol('simple-identifier')).not.toThrow()
    })

    it('should allow custom protocols not in blocked list', () => {
      expect(() => validateSourceProtocol('custom://something')).not.toThrow()
    })
  })

  describe('normalizeSource', () => {
    it('should normalize HTTP URLs by removing query and fragment', () => {
      const source = 'https://example.com/path?query=value#section'
      const normalized = normalizeSource(source)

      expect(normalized).toBe('https://example.com/path')
    })

    it('should preserve origin and pathname for HTTP URLs', () => {
      const source = 'https://api.example.com:8080/v1/resource'
      const normalized = normalizeSource(source)

      expect(normalized).toBe('https://api.example.com:8080/v1/resource')
    })

    it('should return non-HTTP URLs as-is', () => {
      const source = 'clipboard://abc123'
      const normalized = normalizeSource(source)

      expect(normalized).toBe(source)
    })

    it('should return non-URL identifiers as-is', () => {
      const source = 'simple-identifier'
      const normalized = normalizeSource(source)

      expect(normalized).toBe(source)
    })

    it('should throw for blocked protocols', () => {
      expect(() => normalizeSource('javascript:alert(1)')).toThrow()
    })
  })

  describe('getRawDataDir', () => {
    it('should return raw-data subdirectory of dbPath', () => {
      const result = getRawDataDir('/path/to/db')
      expect(result).toBe('/path/to/db/raw-data')
    })
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
