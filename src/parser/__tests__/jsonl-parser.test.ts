// JSONL Parser Unit Test

import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DocumentParser, ParserFileOperationError, ParserValidationError } from '../index.js'

describe('JSONL Parser', () => {
  let parser: DocumentParser
  const testDir = join(process.cwd(), 'tmp', 'test-jsonl-parser')
  const maxFileSize = 100 * 1024 * 1024 // 100MB

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true })
    parser = new DocumentParser({
      baseDir: testDir,
      maxFileSize,
    })
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  describe('.jsonl extension support', () => {
    it('should parse .jsonl files', async () => {
      const filePath = join(testDir, 'data.jsonl')
      const content = `{"title": "First Title Entry Here"}
{"title": "Second Title Entry Here"}
{"title": "Third Title Entry Here"}`
      await writeFile(filePath, content, 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain('[0].title: First Title Entry Here')
      expect(result).toContain('[1].title: Second Title Entry Here')
      expect(result).toContain('[2].title: Third Title Entry Here')
    })

    it('should parse objects with multiple fields', async () => {
      const filePath = join(testDir, 'multi-field.jsonl')
      const content = `{"name": "Alice", "description": "The main protagonist of the story"}
{"name": "Bob", "description": "A supporting character in the narrative"}`
      await writeFile(filePath, content, 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain('[0].name: Alice')
      expect(result).toContain('[0].description: The main protagonist of the story')
      expect(result).toContain('[1].name: Bob')
      expect(result).toContain('[1].description: A supporting character in the narrative')
    })

    it('should apply RAG filtering to JSONL content', async () => {
      const filePath = join(testDir, 'filtered.jsonl')
      const content = `{"title": "Chapter One", "id": "ch_001", "duration_ms": 12345}
{"title": "Chapter Two", "id": "ch_002", "active": true}`
      await writeFile(filePath, content, 'utf-8')

      const result = await parser.parseFile(filePath)

      // Titles kept (allowlisted key)
      expect(result).toContain('[0].title: Chapter One')
      expect(result).toContain('[1].title: Chapter Two')
      // IDs, numbers, booleans filtered
      expect(result).not.toContain('ch_001')
      expect(result).not.toContain('ch_002')
      expect(result).not.toContain('12345')
      expect(result).not.toContain('active')
    })
  })

  describe('.ndjson extension support', () => {
    it('should parse .ndjson files', async () => {
      const filePath = join(testDir, 'data.ndjson')
      const content = `{"name": "Character One"}
{"name": "Character Two"}`
      await writeFile(filePath, content, 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain('[0].name: Character One')
      expect(result).toContain('[1].name: Character Two')
    })
  })

  describe('JSONL fallback in .json files', () => {
    it('should auto-detect JSONL content in .json files', async () => {
      const filePath = join(testDir, 'actually-jsonl.json')
      const content = `{"title": "Line One Title Here"}
{"title": "Line Two Title Here"}`
      await writeFile(filePath, content, 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain('[0].title: Line One Title Here')
      expect(result).toContain('[1].title: Line Two Title Here')
    })

    it('should prefer standard JSON parsing when valid', async () => {
      const filePath = join(testDir, 'standard.json')
      const content = { title: 'Single Object Title Here' }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      // Standard JSON should not have index prefix
      expect(result).toBe('title: Single Object Title Here')
    })
  })

  describe('malformed line handling', () => {
    it('should skip malformed lines and continue processing', async () => {
      const filePath = join(testDir, 'partial-valid.jsonl')
      const content = `{"title": "Valid Line One Title"}
{invalid json here
{"title": "Valid Line Three Title"}`
      await writeFile(filePath, content, 'utf-8')

      const result = await parser.parseFile(filePath)

      // Valid lines should be parsed (indices adjusted for valid lines only)
      expect(result).toContain('Valid Line One Title')
      expect(result).toContain('Valid Line Three Title')
    })

    it('should handle all malformed lines gracefully', async () => {
      const filePath = join(testDir, 'all-invalid.jsonl')
      const content = `{not valid json
also not valid
{"incomplete": true`
      await writeFile(filePath, content, 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toBe('')
    })
  })

  describe('empty file handling', () => {
    it('should handle empty .jsonl file', async () => {
      const filePath = join(testDir, 'empty.jsonl')
      await writeFile(filePath, '', 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toBe('')
    })

    it('should handle .jsonl file with only whitespace lines', async () => {
      const filePath = join(testDir, 'whitespace.jsonl')
      const content = `


`
      await writeFile(filePath, content, 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toBe('')
    })
  })

  describe('error handling', () => {
    it('should throw FileOperationError for non-existent .jsonl file', async () => {
      const filePath = join(testDir, 'nonexistent.jsonl')

      await expect(parser.parseFile(filePath)).rejects.toThrow(ParserFileOperationError)
    })

    it('should throw ValidationError for path traversal in .jsonl', async () => {
      await expect(parser.parseFile('../outside.jsonl')).rejects.toThrow(ParserValidationError)
    })
  })

  describe('nested structures in JSONL', () => {
    it('should handle nested objects within JSONL lines', async () => {
      const filePath = join(testDir, 'nested.jsonl')
      const content = `{"character": {"name": "Alice", "dialogue": "Hello there friend"}}
{"character": {"name": "Bob", "dialogue": "Nice to meet you too"}}`
      await writeFile(filePath, content, 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain('[0].character.name: Alice')
      expect(result).toContain('[0].character.dialogue: Hello there friend')
      expect(result).toContain('[1].character.name: Bob')
      expect(result).toContain('[1].character.dialogue: Nice to meet you too')
    })

    it('should handle arrays within JSONL lines', async () => {
      const filePath = join(testDir, 'arrays.jsonl')
      const content = `{"scene": "Opening", "characters": ["Alice", "Bob", "Charlie"]}
{"scene": "Ending", "characters": ["Alice", "David"]}`
      await writeFile(filePath, content, 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain('[0].scene: Opening')
      expect(result).toContain('[0].characters: Alice, Bob, Charlie')
      expect(result).toContain('[1].scene: Ending')
      expect(result).toContain('[1].characters: Alice, David')
    })
  })

  describe('large JSONL handling', () => {
    it('should handle JSONL with many lines', async () => {
      const filePath = join(testDir, 'many-lines.jsonl')
      const lines: string[] = []
      for (let i = 0; i < 100; i++) {
        lines.push(JSON.stringify({ title: `Title for entry number ${i}` }))
      }
      await writeFile(filePath, lines.join('\n'), 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain('[0].title: Title for entry number 0')
      expect(result).toContain('[50].title: Title for entry number 50')
      expect(result).toContain('[99].title: Title for entry number 99')
    })

    it('should handle JSONL lines with long values', async () => {
      const filePath = join(testDir, 'long-values.jsonl')
      const longText = 'A'.repeat(5000)
      const content = `{"content": "${longText}"}`
      await writeFile(filePath, content, 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain(longText)
    })
  })
})
