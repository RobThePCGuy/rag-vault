// Tests for VectorStore path validation.
//
// isValidFilePath is a structural guard, not the SQL-injection defense: queries
// escape the path (single-quoted literal with doubled quotes) and BASE_DIR
// containment is enforced upstream by DocumentParser.validateFilePath(). These
// tests pin the structural contract; injection-safety against a real table is
// covered in vectordb.test.ts.

import { describe, expect, it } from 'vitest'
import { isValidFilePath } from '../index.js'

describe('Path Validation Patterns', () => {
  describe('Valid ASCII paths', () => {
    it('should accept simple file paths', () => {
      expect(isValidFilePath('/path/to/file.txt')).toBe(true)
    })

    it('should accept paths with spaces', () => {
      expect(isValidFilePath('/path/to/my file.txt')).toBe(true)
    })

    it('should accept Windows-style paths', () => {
      expect(isValidFilePath('C:/Users/test/file.txt')).toBe(true)
      expect(isValidFilePath('C:\\Users\\test\\file.txt')).toBe(true)
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

  describe('Valid non-ASCII and special-character paths (previously rejected)', () => {
    it('should accept CJK (Japanese/Chinese) file names', () => {
      expect(isValidFilePath('/docs/日本語のファイル.txt')).toBe(true)
      expect(isValidFilePath('/文档/设计说明.md')).toBe(true)
    })

    it('should accept other Unicode including accents and emoji', () => {
      expect(isValidFilePath('/docs/résumé.pdf')).toBe(true)
      expect(isValidFilePath('/docs/notes-📝.txt')).toBe(true)
    })

    it('should accept apostrophes in file names', () => {
      expect(isValidFilePath("/docs/it's a plan.md")).toBe(true)
      expect(isValidFilePath("/docs/O'Brien/report.txt")).toBe(true)
    })

    it('should accept double dashes in file names', () => {
      expect(isValidFilePath('/docs/report--final.pdf')).toBe(true)
      expect(isValidFilePath('/docs/2024--Q1--summary.md')).toBe(true)
    })

    it('should accept dots inside a segment (not a traversal segment)', () => {
      expect(isValidFilePath('/docs/notes..bak')).toBe(true)
      expect(isValidFilePath('/docs/v1.2.3/file.txt')).toBe(true)
    })

    it('should accept characters that are inert once SQL-escaped', () => {
      // These are neutralized by single-quote escaping at the query layer, so
      // there is no reason to reject legitimate files that happen to contain them.
      expect(isValidFilePath('/docs/file" (copy).txt')).toBe(true)
      expect(isValidFilePath('/docs/a;b.txt')).toBe(true)
      expect(isValidFilePath('/docs/report(final).txt')).toBe(true)
    })
  })

  describe('Invalid paths - path traversal segments', () => {
    it('should reject parent-directory traversal', () => {
      expect(isValidFilePath('/path/to/../../../etc/passwd')).toBe(false)
    })

    it('should reject a leading traversal segment', () => {
      expect(isValidFilePath('../etc/passwd')).toBe(false)
    })

    it('should reject a traversal segment in the middle', () => {
      expect(isValidFilePath('/path/../to/file.txt')).toBe(false)
    })

    it('should reject Windows-separator traversal', () => {
      expect(isValidFilePath('C:\\data\\..\\..\\secret.txt')).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('should reject empty string', () => {
      expect(isValidFilePath('')).toBe(false)
    })

    it('should reject null-like values', () => {
      expect(isValidFilePath(null as unknown as string)).toBe(false)
      expect(isValidFilePath(undefined as unknown as string)).toBe(false)
    })

    it('should reject control characters (newline, carriage return, tab)', () => {
      expect(isValidFilePath('/path/to/file\n/etc/passwd')).toBe(false)
      expect(isValidFilePath('/path/to/file\r/etc/passwd')).toBe(false)
      expect(isValidFilePath('/path/to/file\tname.txt')).toBe(false)
    })

    it('should reject NUL bytes', () => {
      expect(isValidFilePath('/path/to/file\u0000.txt')).toBe(false)
    })
  })
})
