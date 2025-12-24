// DocumentChunker Unit Test - Test error propagation for Fail-fast principle
// Created: 2025-10-31
// Purpose: Verify proper error handling in chunking process

import { beforeEach, describe, expect, it } from 'vitest'
import { DocumentChunker } from '../index.js'

describe('DocumentChunker', () => {
  let chunker: DocumentChunker

  beforeEach(async () => {
    chunker = new DocumentChunker({
      chunkSize: 512,
      chunkOverlap: 100,
    })
    await chunker.initialize()
  })

  // --------------------------------------------
  // Normal Case: Successful chunking
  // --------------------------------------------
  describe('Normal chunking behavior', () => {
    it('should split text into chunks successfully', async () => {
      const text = 'This is a test. '.repeat(50) // ~800 characters
      const chunks = await chunker.chunkText(text)

      expect(chunks).toBeDefined()
      expect(Array.isArray(chunks)).toBe(true)
      expect(chunks.length).toBeGreaterThan(0)

      // Verify chunk structure
      for (const chunk of chunks) {
        expect(chunk).toHaveProperty('text')
        expect(chunk).toHaveProperty('index')
        expect(typeof chunk.text).toBe('string')
        expect(typeof chunk.index).toBe('number')
      }
    })

    it('should return empty array for empty string (valid empty input)', async () => {
      const chunks = await chunker.chunkText('')

      expect(chunks).toBeDefined()
      expect(Array.isArray(chunks)).toBe(true)
      expect(chunks.length).toBe(0)
    })
  })

  // --------------------------------------------
  // Short chunk filtering behavior
  // --------------------------------------------
  describe('Short chunk filtering', () => {
    it('should not include chunks shorter than 50 characters', async () => {
      // Arrange: Text that would create short chunks due to paragraph breaks
      // Simulates PDF page markers like "-- 5 of 121 --" surrounded by \n\n
      const textWithShortChunks = `${'A'.repeat(200)}\n\n-- 5 of 121 --\n\n${'B'.repeat(200)}`

      // Act
      const result = await chunker.chunkText(textWithShortChunks)

      // Assert: No chunk should be shorter than 50 characters
      const shortChunks = result.filter((chunk) => chunk.text.length < 50)
      expect(shortChunks).toHaveLength(0)
    })

    it('should include chunk with exactly 50 characters', async () => {
      // Arrange: Text that creates a chunk with exactly 50 characters
      const exactText = 'A'.repeat(50)

      // Act
      const result = await chunker.chunkText(exactText)

      // Assert: Should have at least one chunk
      expect(result.length).toBeGreaterThan(0)
    })

    it('should return empty array when all potential chunks are shorter than 50 characters', async () => {
      // Arrange: Very short text that would create only short chunks
      const shortText = 'Short.'

      // Act
      const result = await chunker.chunkText(shortText)

      // Assert: Should return empty array
      expect(result).toEqual([])
    })

    it('should maintain correct chunk indices after filtering', async () => {
      // Arrange: Text that creates mixed-length chunks
      const text = `${'A'.repeat(100)}\n\nShort\n\n${'B'.repeat(100)}\n\nX\n\n${'C'.repeat(100)}`

      // Act
      const result = await chunker.chunkText(text)

      // Assert: Indices should be sequential starting from 0
      result.forEach((chunk, i) => {
        expect(chunk.index).toBe(i)
      })
    })
  })

  // --------------------------------------------
  // Error Case: Uninitialized chunker
  // --------------------------------------------
  describe('Error handling', () => {
    it('should throw error when chunkText called without initialization', async () => {
      const uninitializedChunker = new DocumentChunker({
        chunkSize: 512,
        chunkOverlap: 100,
      })

      // Should throw error when trying to chunk without initialization
      await expect(uninitializedChunker.chunkText('test')).rejects.toThrow(
        'DocumentChunker not initialized'
      )
    })
  })
})
