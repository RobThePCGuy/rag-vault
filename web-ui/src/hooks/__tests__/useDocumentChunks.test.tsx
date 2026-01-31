import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useDocumentChunks } from '../useDocumentChunks'
import * as client from '../../api/client'

// Mock the API client
vi.mock('../../api/client', () => ({
  getDocumentChunks: vi.fn(),
}))

const mockGetDocumentChunks = vi.mocked(client.getDocumentChunks)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useDocumentChunks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty chunks when filePath is null', () => {
    const { result } = renderHook(() => useDocumentChunks(null), {
      wrapper: createWrapper(),
    })

    expect(result.current.chunks).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(mockGetDocumentChunks).not.toHaveBeenCalled()
  })

  it('should fetch chunks when filePath is provided', async () => {
    const mockChunks = [
      {
        filePath: '/doc.txt',
        chunkIndex: 0,
        text: 'First chunk',
        score: 0,
        metadata: { fileName: 'doc.txt', fileSize: 100, fileType: 'txt' },
      },
      {
        filePath: '/doc.txt',
        chunkIndex: 1,
        text: 'Second chunk',
        score: 0,
        metadata: { fileName: 'doc.txt', fileSize: 100, fileType: 'txt' },
      },
    ]
    mockGetDocumentChunks.mockResolvedValueOnce(mockChunks)

    const { result } = renderHook(() => useDocumentChunks('/doc.txt'), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.chunks).toEqual(mockChunks)
    expect(result.current.error).toBeNull()
    expect(mockGetDocumentChunks).toHaveBeenCalledWith('/doc.txt')
  })

  it('should handle fetch errors', async () => {
    mockGetDocumentChunks.mockRejectedValueOnce(new Error('Failed to fetch'))

    const { result } = renderHook(() => useDocumentChunks('/doc.txt'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.chunks).toEqual([])
  })

  it('should refetch when filePath changes', async () => {
    const chunks1 = [
      {
        filePath: '/doc1.txt',
        chunkIndex: 0,
        text: 'Doc 1',
        score: 0,
        metadata: { fileName: 'doc1.txt', fileSize: 50, fileType: 'txt' },
      },
    ]
    const chunks2 = [
      {
        filePath: '/doc2.txt',
        chunkIndex: 0,
        text: 'Doc 2',
        score: 0,
        metadata: { fileName: 'doc2.txt', fileSize: 60, fileType: 'txt' },
      },
    ]

    mockGetDocumentChunks.mockResolvedValueOnce(chunks1).mockResolvedValueOnce(chunks2)

    const { result, rerender } = renderHook(({ path }) => useDocumentChunks(path), {
      wrapper: createWrapper(),
      initialProps: { path: '/doc1.txt' as string | null },
    })

    await waitFor(() => {
      expect(result.current.chunks).toEqual(chunks1)
    })

    // Change filePath
    rerender({ path: '/doc2.txt' })

    await waitFor(() => {
      expect(result.current.chunks).toEqual(chunks2)
    })

    expect(mockGetDocumentChunks).toHaveBeenCalledTimes(2)
  })

  it('should stop fetching when filePath becomes null', async () => {
    const mockChunks = [
      {
        filePath: '/doc.txt',
        chunkIndex: 0,
        text: 'Content',
        score: 0,
        metadata: { fileName: 'doc.txt', fileSize: 100, fileType: 'txt' },
      },
    ]
    mockGetDocumentChunks.mockResolvedValueOnce(mockChunks)

    const { result, rerender } = renderHook(({ path }) => useDocumentChunks(path), {
      wrapper: createWrapper(),
      initialProps: { path: '/doc.txt' as string | null },
    })

    await waitFor(() => {
      expect(result.current.chunks).toEqual(mockChunks)
    })

    // Set filePath to null
    rerender({ path: null })

    // Chunks should be empty when disabled
    expect(result.current.chunks).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('should expose refetch function', async () => {
    const chunks1 = [
      {
        filePath: '/doc.txt',
        chunkIndex: 0,
        text: 'Original',
        score: 0,
        metadata: { fileName: 'doc.txt', fileSize: 100, fileType: 'txt' },
      },
    ]
    const chunks2 = [
      {
        filePath: '/doc.txt',
        chunkIndex: 0,
        text: 'Updated',
        score: 0,
        metadata: { fileName: 'doc.txt', fileSize: 100, fileType: 'txt' },
      },
    ]

    mockGetDocumentChunks.mockResolvedValueOnce(chunks1).mockResolvedValueOnce(chunks2)

    const { result } = renderHook(() => useDocumentChunks('/doc.txt'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.chunks).toEqual(chunks1)
    })

    // Trigger refetch
    result.current.refetch()

    await waitFor(() => {
      expect(result.current.chunks).toEqual(chunks2)
    })
  })
})
