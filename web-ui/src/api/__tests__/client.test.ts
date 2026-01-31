import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  searchDocuments,
  uploadFile,
  getDocumentChunks,
  listFiles,
  deleteFile,
  getStatus,
  getRelatedChunks,
} from '../client'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('searchDocuments', () => {
    it('should send POST request with query and return results', async () => {
      const mockResults = [{ filePath: '/doc.txt', chunkIndex: 0, text: 'test', score: 0.5 }]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: mockResults }),
      })

      const results = await searchDocuments('test query')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/search',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ query: 'test query', limit: undefined }),
        })
      )
      expect(results).toEqual(mockResults)
    })

    it('should pass limit parameter when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      })

      await searchDocuments('query', 5)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/search',
        expect.objectContaining({
          body: JSON.stringify({ query: 'query', limit: 5 }),
        })
      )
    })

    it('should throw error on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Search failed' }),
      })

      await expect(searchDocuments('query')).rejects.toThrow('Search failed')
    })

    it('should throw timeout error on abort', async () => {
      vi.useFakeTimers()

      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('Aborted')
            error.name = 'AbortError'
            reject(error)
          }, 35000)
        })
      })

      const promise = searchDocuments('query')
      vi.advanceTimersByTime(35000)

      await expect(promise).rejects.toThrow('Request timed out')
      vi.useRealTimers()
    })
  })

  describe('uploadFile', () => {
    it('should send FormData with file', async () => {
      const mockResult = {
        filePath: '/uploads/test.txt',
        chunkCount: 5,
        timestamp: '2024-01-01T00:00:00Z',
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
      })

      const file = new File(['content'], 'test.txt', { type: 'text/plain' })
      const result = await uploadFile(file)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/files/upload',
        expect.objectContaining({
          method: 'POST',
        })
      )

      // Verify FormData was sent
      const callArgs = mockFetch.mock.calls[0]!
      expect(callArgs[1]?.body).toBeInstanceOf(FormData)

      expect(result).toEqual(mockResult)
    })

    it('should throw error on upload failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'File too large' }),
      })

      const file = new File(['content'], 'test.txt')
      await expect(uploadFile(file)).rejects.toThrow('File too large')
    })
  })

  describe('getDocumentChunks', () => {
    it('should encode filePath and return chunks', async () => {
      const mockChunks = [
        { filePath: '/path/to/doc.txt', chunkIndex: 0, text: 'chunk 1', score: 0 },
        { filePath: '/path/to/doc.txt', chunkIndex: 1, text: 'chunk 2', score: 0 },
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ chunks: mockChunks }),
      })

      const result = await getDocumentChunks('/path/to/doc.txt')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/documents/chunks?filePath=%2Fpath%2Fto%2Fdoc.txt',
        expect.any(Object)
      )
      expect(result).toEqual(mockChunks)
    })
  })

  describe('listFiles', () => {
    it('should return file list', async () => {
      const mockFiles = [
        { filePath: '/doc1.txt', chunkCount: 3 },
        { filePath: '/doc2.txt', chunkCount: 5 },
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: mockFiles }),
      })

      const result = await listFiles()

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/files', expect.any(Object))
      expect(result).toEqual(mockFiles)
    })
  })

  describe('deleteFile', () => {
    it('should send DELETE request with filePath', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await deleteFile({ filePath: '/doc.txt' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/files',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ filePath: '/doc.txt' }),
        })
      )
    })

    it('should send DELETE request with source', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await deleteFile({ source: 'web-paste' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/files',
        expect.objectContaining({
          body: JSON.stringify({ source: 'web-paste' }),
        })
      )
    })
  })

  describe('getStatus', () => {
    it('should return system status', async () => {
      const mockStatus = {
        documentCount: 10,
        chunkCount: 50,
        memoryUsage: 128.5,
        uptime: 3600,
        ftsIndexEnabled: true,
        searchMode: 'hybrid' as const,
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      })

      const result = await getStatus()

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/status', expect.any(Object))
      expect(result).toEqual(mockStatus)
    })
  })

  describe('getRelatedChunks', () => {
    it('should request related chunks with correct parameters', async () => {
      const mockRelated = [{ filePath: '/other.txt', chunkIndex: 2, text: 'related', score: 0.3 }]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ related: mockRelated }),
      })

      const result = await getRelatedChunks('/doc.txt', 0, { limit: 5 })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/chunks/related?'),
        expect.any(Object)
      )

      // Verify URL contains expected params
      const url = mockFetch.mock.calls[0]![0] as string
      expect(url).toContain('filePath=%2Fdoc.txt')
      expect(url).toContain('chunkIndex=0')
      expect(url).toContain('limit=5')

      // Result should include connection reason
      expect(result[0]).toHaveProperty('connectionReason')
    })

    it('should pass excludeSameDocument option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ related: [] }),
      })

      await getRelatedChunks('/doc.txt', 0, { excludeSameDocument: true })

      const url = mockFetch.mock.calls[0]![0] as string
      expect(url).toContain('excludeSameDoc=true')
    })
  })

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(searchDocuments('query')).rejects.toThrow('Network error')
    })

    it('should handle JSON parse errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Invalid JSON')),
      })

      await expect(searchDocuments('query')).rejects.toThrow('Invalid JSON')
    })
  })
})
