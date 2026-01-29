// Tests for VectorStore path validation

import { describe, expect, it } from 'vitest'
import { isValidFilePath } from '../index.js'

describe('Path Validation Patterns', () => {
  describe('Valid paths', () => {
    it('should accept simple file paths', () => {
      expect(isValidFilePath('/path/to/file.txt')).toBe(true)
    })

    it('should accept paths with spaces', () => {
      expect(isValidFilePath('/path/to/my file.txt')).toBe(true)
    })

    it('should accept Windows-style paths', () => {
      expect(isValidFilePath('C:/Users/test/file.txt')).toBe(true)
    })

    it('should accept paths with hyphens and underscores', () => {
      expect(isValidFilePath('/path/to/my-file_name.txt')).toBe(true)
    })

    it('should accept paths with numbers', () => {
      expect(isValidFilePath('/path/to/file123.txt')).toBe(true)
    })

    it('should accept absolute paths', () => {
      expect(isValidFilePath('/var/data/rag-vault/chunks.lance')).toBe(true)
    })
  })

  describe('Invalid paths - SQL injection attempts', () => {
    it('should reject paths with single quotes', () => {
      expect(isValidFilePath("/path/to/file'; DROP TABLE chunks; --")).toBe(false)
    })

    it('should reject paths with double quotes', () => {
      expect(isValidFilePath('/path/to/file" OR 1=1')).toBe(false)
    })

    it('should reject paths with semicolons', () => {
      expect(isValidFilePath('/path/to/file; DELETE FROM chunks')).toBe(false)
    })

    it('should reject paths with SQL comments', () => {
      expect(isValidFilePath('/path/to/file--comment')).toBe(false)
    })
  })

  describe('Invalid paths - Path traversal attempts', () => {
    it('should reject paths with parent directory traversal', () => {
      expect(isValidFilePath('/path/to/../../../etc/passwd')).toBe(false)
    })

    it('should reject paths with double dots at start', () => {
      expect(isValidFilePath('../etc/passwd')).toBe(false)
    })

    it('should reject paths with double dots in middle', () => {
      expect(isValidFilePath('/path/../to/file.txt')).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('should reject empty string', () => {
      expect(isValidFilePath('')).toBe(false)
    })

    it('should reject null-like values', () => {
      expect(isValidFilePath(null as any)).toBe(false)
      expect(isValidFilePath(undefined as any)).toBe(false)
    })

    it('should reject paths with backticks', () => {
      expect(isValidFilePath('/path/to/`whoami`')).toBe(false)
    })

    it('should reject paths with dollar signs', () => {
      expect(isValidFilePath('/path/to/$HOME/file')).toBe(false)
    })

    it('should reject paths with newlines', () => {
      expect(isValidFilePath('/path/to/file\n/etc/passwd')).toBe(false)
    })
  })
})
