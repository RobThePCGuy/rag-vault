import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useRelatedChunks } from '../useRelatedChunks'
import * as client from '../../api/client'

// Mock the API client
vi.mock('../../api/client', () => ({
  getRelatedChunks: vi.fn(),
}))

const mockGetRelatedChunks = vi.mocked(client.getRelatedChunks)

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

describe('useRelatedChunks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty array when filePath is null', () => {
    const { result } = renderHook(() => useRelatedChunks(null, 0), {
      wrapper: createWrapper(),
    })

    expect(result.current.related).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(mockGetRelatedChunks).not.toHaveBeenCalled()
  })

  it('should return empty array when chunkIndex is null', () => {
    const { result } = renderHook(() => useRelatedChunks('/doc.txt', null), {
      wrapper: createWrapper(),
    })

    expect(result.current.related).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(mockGetRelatedChunks).not.toHaveBeenCalled()
  })

  it('should fetch related chunks when both params are valid', async () => {
    const mockRelated = [
      {
        filePath: '/other.txt',
        chunkIndex: 2,
        text: 'Related content',
        score: 0.3,
        metadata: { fileName: 'other.txt', fileSize: 100, fileType: 'txt' },
        connectionReason: 'Very similar',
      },
    ]
    mockGetRelatedChunks.mockResolvedValueOnce(mockRelated)

    const { result } = renderHook(() => useRelatedChunks('/doc.txt', 0), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.related).toEqual(mockRelated)
    expect(result.current.error).toBeNull()
    expect(mockGetRelatedChunks).toHaveBeenCalledWith('/doc.txt', 0, undefined)
  })

  it('should pass options to API call', async () => {
    mockGetRelatedChunks.mockResolvedValueOnce([])

    const options = { limit: 10, excludeSameDocument: true }
    const { result } = renderHook(() => useRelatedChunks('/doc.txt', 0, options), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockGetRelatedChunks).toHaveBeenCalledWith('/doc.txt', 0, options)
  })

  it('should handle errors', async () => {
    mockGetRelatedChunks.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useRelatedChunks('/doc.txt', 0), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.related).toEqual([])
  })

  it('should refetch when filePath changes', async () => {
    const related1 = [
      {
        filePath: '/a.txt',
        chunkIndex: 1,
        text: 'A related',
        score: 0.2,
        metadata: { fileName: 'a.txt', fileSize: 50, fileType: 'txt' },
        connectionReason: 'Related topic',
      },
    ]
    const related2 = [
      {
        filePath: '/b.txt',
        chunkIndex: 3,
        text: 'B related',
        score: 0.4,
        metadata: { fileName: 'b.txt', fileSize: 60, fileType: 'txt' },
        connectionReason: 'Loosely related',
      },
    ]

    mockGetRelatedChunks.mockResolvedValueOnce(related1).mockResolvedValueOnce(related2)

    const { result, rerender } = renderHook(({ path, index }) => useRelatedChunks(path, index), {
      wrapper: createWrapper(),
      initialProps: { path: '/doc1.txt' as string | null, index: 0 as number | null },
    })

    await waitFor(() => {
      expect(result.current.related).toEqual(related1)
    })

    rerender({ path: '/doc2.txt', index: 1 })

    await waitFor(() => {
      expect(result.current.related).toEqual(related2)
    })

    expect(mockGetRelatedChunks).toHaveBeenCalledTimes(2)
  })

  it('should refetch when chunkIndex changes', async () => {
    const related1 = [
      {
        filePath: '/other.txt',
        chunkIndex: 0,
        text: 'Related to chunk 0',
        score: 0.1,
        metadata: { fileName: 'other.txt', fileSize: 100, fileType: 'txt' },
        connectionReason: 'Very similar',
      },
    ]
    const related2 = [
      {
        filePath: '/other.txt',
        chunkIndex: 5,
        text: 'Related to chunk 5',
        score: 0.5,
        metadata: { fileName: 'other.txt', fileSize: 100, fileType: 'txt' },
        connectionReason: 'Related topic',
      },
    ]

    mockGetRelatedChunks.mockResolvedValueOnce(related1).mockResolvedValueOnce(related2)

    const { result, rerender } = renderHook(({ path, index }) => useRelatedChunks(path, index), {
      wrapper: createWrapper(),
      initialProps: { path: '/doc.txt' as string | null, index: 0 as number | null },
    })

    await waitFor(() => {
      expect(result.current.related).toEqual(related1)
    })

    rerender({ path: '/doc.txt', index: 5 })

    await waitFor(() => {
      expect(result.current.related).toEqual(related2)
    })
  })

  it('should expose refetch function', async () => {
    const related1 = [
      {
        filePath: '/r1.txt',
        chunkIndex: 0,
        text: 'First',
        score: 0.1,
        metadata: { fileName: 'r1.txt', fileSize: 50, fileType: 'txt' },
        connectionReason: 'Very similar',
      },
    ]
    const related2 = [
      {
        filePath: '/r2.txt',
        chunkIndex: 0,
        text: 'Second',
        score: 0.2,
        metadata: { fileName: 'r2.txt', fileSize: 60, fileType: 'txt' },
        connectionReason: 'Related topic',
      },
    ]

    mockGetRelatedChunks.mockResolvedValueOnce(related1).mockResolvedValueOnce(related2)

    const { result } = renderHook(() => useRelatedChunks('/doc.txt', 0), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.related).toEqual(related1)
    })

    result.current.refetch()

    await waitFor(() => {
      expect(result.current.related).toEqual(related2)
    })
  })
})
