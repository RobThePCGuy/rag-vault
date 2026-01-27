// JSON Parser Unit Test

import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DocumentParser, ParserFileOperationError } from '../index'

describe('JSON Parser', () => {
  let parser: DocumentParser
  const testDir = join(process.cwd(), 'tmp', 'test-json-parser')
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

  describe('parseFile with .json extension', () => {
    it('should parse simple flat JSON with RAG filtering', async () => {
      const filePath = join(testDir, 'simple.json')
      // 'name' is an allowlisted key, so short values are kept
      // numbers and booleans are filtered out (metadata noise)
      const content = { name: 'John', age: 30, active: true }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain('name: John')
      // Numbers and booleans are filtered out
      expect(result).not.toContain('age')
      expect(result).not.toContain('active')
    })

    it('should parse nested objects with dot notation', async () => {
      const filePath = join(testDir, 'nested.json')
      const content = {
        user: {
          name: 'Alice',
          address: {
            city: 'Seattle',
          },
        },
      }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      // 'name' is allowlisted, 'city' is prose-like
      expect(result).toContain('user.name: Alice')
      expect(result).toContain('user.address.city: Seattle')
    })

    it('should parse arrays of objects with indices', async () => {
      const filePath = join(testDir, 'array-objects.json')
      const content = {
        characters: [
          { name: 'Alice', role: 'protagonist' },
          { name: 'Bob', role: 'antagonist' },
        ],
      }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain('characters[0].name: Alice')
      expect(result).toContain('characters[0].role: protagonist')
      expect(result).toContain('characters[1].name: Bob')
      expect(result).toContain('characters[1].role: antagonist')
    })

    it('should filter out null values', async () => {
      const filePath = join(testDir, 'null-values.json')
      const content = {
        title: 'Test Title Here And More',
        value: null,
        nested: { inner: null },
      }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain('title: Test Title Here And More')
      // Null values are filtered out
      expect(result).not.toContain('value')
      expect(result).not.toContain('inner')
    })

    it('should filter out empty arrays', async () => {
      const filePath = join(testDir, 'empty-array.json')
      const content = {
        title: 'Test Title Here And More',
        items: [],
      }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain('title: Test Title Here And More')
      // Empty arrays are filtered out
      expect(result).not.toContain('items')
    })

    it('should handle empty objects', async () => {
      const filePath = join(testDir, 'empty-object.json')
      const content = {}
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toBe('')
    })

    it('should handle special characters in long values', async () => {
      const filePath = join(testDir, 'special-chars.json')
      const content = {
        description: 'Line 1\nLine 2 with more text here',
        quote: 'He said "Hello my friend how are you"',
      }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain('description: Line 1\nLine 2 with more text here')
      expect(result).toContain('quote: He said "Hello my friend how are you"')
    })

    it('should handle deeply nested structures', async () => {
      const filePath = join(testDir, 'deep-nested.json')
      const content = {
        level1: {
          level2: {
            level3: {
              level4: {
                description: 'A deeply nested description value',
              },
            },
          },
        },
      }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain(
        'level1.level2.level3.level4.description: A deeply nested description value'
      )
    })

    it('should handle mixed content (objects and arrays) with filtering', async () => {
      const filePath = join(testDir, 'mixed.json')
      const content = {
        title: 'Book Title Goes Here',
        chapters: [
          {
            name: 'Chapter One',
            scenes: ['opening scene description', 'conflict scene description'],
          },
          {
            name: 'Chapter Two',
            scenes: ['resolution scene description'],
          },
        ],
      }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain('title: Book Title Goes Here')
      expect(result).toContain('chapters[0].name: Chapter One')
      expect(result).toContain(
        'chapters[0].scenes: opening scene description, conflict scene description'
      )
      expect(result).toContain('chapters[1].name: Chapter Two')
      expect(result).toContain('chapters[1].scenes: resolution scene description')
    })

    it('should filter out boolean values (metadata noise)', async () => {
      const filePath = join(testDir, 'booleans.json')
      const content = {
        title: 'A meaningful title here',
        active: true,
        deleted: false,
      }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain('title: A meaningful title here')
      expect(result).not.toContain('active')
      expect(result).not.toContain('deleted')
    })

    it('should filter out numeric values (metadata noise)', async () => {
      const filePath = join(testDir, 'numbers.json')
      const content = {
        title: 'A meaningful title here',
        count: 0,
        price: 19.99,
        negative: -5,
      }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain('title: A meaningful title here')
      expect(result).not.toContain('count')
      expect(result).not.toContain('price')
      expect(result).not.toContain('negative')
    })
  })

  describe('RAG content filtering', () => {
    it('should keep strings >= 20 characters regardless of key', async () => {
      const filePath = join(testDir, 'long-strings.json')
      const content = {
        arbitrary_key: 'This is a long string with more than twenty characters',
        id: 'Short but kept for its length if over twenty chars',
      }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain(
        'arbitrary_key: This is a long string with more than twenty characters'
      )
      expect(result).toContain('id: Short but kept for its length if over twenty chars')
    })

    it('should keep short prose-like strings with allowlisted keys', async () => {
      const filePath = join(testDir, 'allowlisted-keys.json')
      const content = {
        title: 'The Beginning',
        name: 'Alice',
        speaker: 'Bob',
        heading: 'Chapter One',
        caption: 'A photo',
        scene: 'Opening',
        chapter: 'One',
        dialogue: 'Hello',
        description: 'Dark',
        content: 'Text',
        body: 'Main',
        message: 'Hi',
        note: 'Note',
        comment: 'Yes',
        label: 'Tag',
      }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      // All allowlisted keys with prose-like values should be kept
      expect(result).toContain('title: The Beginning')
      expect(result).toContain('name: Alice')
      expect(result).toContain('speaker: Bob')
      expect(result).toContain('heading: Chapter One')
    })

    it('should filter out code-like strings even with allowlisted keys', async () => {
      const filePath = join(testDir, 'code-in-allowlist.json')
      const content = {
        name: 'usr_12345',
        title: '550e8400-e29b-41d4-a716-446655440000',
        label: 'ABC_123',
      }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      // Code-like values should be filtered even with allowlisted keys
      expect(result).not.toContain('usr_12345')
      expect(result).not.toContain('550e8400')
      expect(result).not.toContain('ABC_123')
    })

    it('should filter out GUID strings', async () => {
      const filePath = join(testDir, 'guids.json')
      const content = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        reference: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE',
      }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toBe('')
    })

    it('should filter out ID-like strings with underscore patterns', async () => {
      const filePath = join(testDir, 'ids.json')
      const content = {
        user_id: 'USR_001',
        order: '123_order',
        status: 'ACTIVE_V2',
      }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toBe('')
    })

    it('should filter out hex-like strings', async () => {
      const filePath = join(testDir, 'hex.json')
      const content = {
        hash: 'a1b2c3d4e5f6',
        token: 'abc123def456',
      }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toBe('')
    })

    it('should keep prose-like short strings without allowlisted keys', async () => {
      const filePath = join(testDir, 'prose-no-allowlist.json')
      const content = {
        author: 'Alice',
        setting: 'London',
        mood: 'Dark',
      }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      // Prose-like strings should be kept
      expect(result).toContain('author: Alice')
      expect(result).toContain('setting: London')
      expect(result).toContain('mood: Dark')
    })

    it('should filter arrays of primitives by same rules', async () => {
      const filePath = join(testDir, 'arrays-filtering.json')
      const content = {
        names: ['Alice', 'Bob', 'Charlie'],
        ids: ['usr_001', 'usr_002'],
        numbers: [1, 2, 3],
      }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      // Prose-like array values kept
      expect(result).toContain('names: Alice, Bob, Charlie')
      // Code-like array values and numbers filtered
      expect(result).not.toContain('ids')
      expect(result).not.toContain('numbers')
    })
  })

  describe('error handling', () => {
    it('should fallback to JSONL parsing on JSON syntax error', async () => {
      const filePath = join(testDir, 'jsonl-in-json.json')
      // JSONL content in a .json file
      const content = `{"title": "First Entry Title Here"}
{"title": "Second Entry Title Here"}`
      await writeFile(filePath, content, 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain('[0].title: First Entry Title Here')
      expect(result).toContain('[1].title: Second Entry Title Here')
    })

    it('should throw FileOperationError for completely invalid content', async () => {
      const filePath = join(testDir, 'invalid.json')
      await writeFile(filePath, 'not json at all { broken', 'utf-8')

      // With JSONL fallback, this should return empty (no valid lines)
      const result = await parser.parseFile(filePath)
      expect(result).toBe('')
    })

    it('should throw FileOperationError for non-existent JSON file', async () => {
      const filePath = join(testDir, 'nonexistent.json')

      await expect(parser.parseFile(filePath)).rejects.toThrow(ParserFileOperationError)
    })

    it('should handle JSON with only a primitive string at root', async () => {
      const filePath = join(testDir, 'primitive-root.json')
      await writeFile(filePath, '"This is a long string at root level"', 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toBe('This is a long string at root level')
    })

    it('should handle JSON array of objects at root level', async () => {
      const filePath = join(testDir, 'array-objects-root.json')
      const content = [{ name: 'First Character Name' }, { name: 'Second Character Name' }]
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain('[0].name: First Character Name')
      expect(result).toContain('[1].name: Second Character Name')
    })
  })

  describe('large JSON handling', () => {
    it('should handle JSON with many string keys', async () => {
      const filePath = join(testDir, 'many-keys.json')
      const content: Record<string, string> = {}
      for (let i = 0; i < 100; i++) {
        content[`description${i}`] = `This is description number ${i} with enough text`
      }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain('description0: This is description number 0 with enough text')
      expect(result).toContain('description50: This is description number 50 with enough text')
      expect(result).toContain('description99: This is description number 99 with enough text')
    })

    it('should handle JSON with long string values', async () => {
      const filePath = join(testDir, 'long-string.json')
      const longValue = 'x'.repeat(10000)
      const content = { description: longValue }
      await writeFile(filePath, JSON.stringify(content), 'utf-8')

      const result = await parser.parseFile(filePath)

      expect(result).toContain(`description: ${longValue}`)
      expect(result.length).toBeGreaterThan(10000)
    })
  })
})
