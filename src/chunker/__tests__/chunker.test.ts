// DocumentChunker Unit Test - Test error propagation for Fail-fast principle
// Created: 2025-10-31
// Purpose: Verify proper error handling in chunking process

import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  // Error Case: RecursiveCharacterTextSplitter failure
  // RED PHASE: This test should FAIL with current implementation
  // Current behavior: chunkText() catches error and returns []
  // Expected behavior: chunkText() should propagate error
  // --------------------------------------------
  describe('Error propagation (Fail-fast principle)', () => {
    it('should propagate error when RecursiveCharacterTextSplitter.splitText() fails', async () => {
      // Mock the splitter to throw an error
      const mockError = new Error('RecursiveCharacterTextSplitter failure')
      const mockSplitter = {
        splitText: vi.fn().mockRejectedValue(mockError),
      }

      // Replace the internal splitter with our mock
      // @ts-expect-error - accessing private property for testing
      chunker['splitter'] = mockSplitter

      // Act & Assert: Verify error is propagated (not caught and converted to [])
      await expect(chunker.chunkText('test input')).rejects.toThrow(
        'RecursiveCharacterTextSplitter failure'
      )

      // Verify splitText was called
      expect(mockSplitter.splitText).toHaveBeenCalledWith('test input')
    })

    it('should not initialize without calling initialize()', async () => {
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
