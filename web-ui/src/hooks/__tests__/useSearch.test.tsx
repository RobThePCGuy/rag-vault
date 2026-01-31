import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useSearch } from '../useSearch'
import * as client from '../../api/client'

// Mock the API client
vi.mock('../../api/client', () => ({
  searchDocuments: vi.fn(),
}))

const mockSearchDocuments = vi.mocked(client.searchDocuments)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should start with empty results and hasSearched false', () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() })

    expect(result.current.results).toEqual([])
    expect(result.current.hasSearched).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should perform search and update results', async () => {
    const mockResults = [{ filePath: '/doc.txt', chunkIndex: 0, text: 'found text', score: 0.1 }]
    mockSearchDocuments.mockResolvedValueOnce(mockResults)

    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() })

    act(() => {
      result.current.search('test query')
    })

    await waitFor(() => {
      expect(result.current.results).toEqual(mockResults)
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.hasSearched).toBe(true)
    expect(mockSearchDocuments).toHaveBeenCalledWith('test query', undefined)
  })

  it('should pass limit parameter to search', async () => {
    mockSearchDocuments.mockResolvedValueOnce([])

    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() })

    act(() => {
      result.current.search('query', 5)
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockSearchDocuments).toHaveBeenCalledWith('query', 5)
  })

  it('should handle search errors', async () => {
    const error = new Error('Search failed')
    mockSearchDocuments.mockRejectedValueOnce(error)

    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() })

    act(() => {
      result.current.search('query')
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.results).toEqual([])
  })

  it('should clear results when clear() is called', async () => {
    const mockResults = [{ filePath: '/doc.txt', chunkIndex: 0, text: 'found', score: 0.1 }]
    mockSearchDocuments.mockResolvedValueOnce(mockResults)

    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() })

    // First perform a search
    act(() => {
      result.current.search('query')
    })

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1)
    })

    expect(result.current.hasSearched).toBe(true)

    // Then clear
    act(() => {
      result.current.clear()
    })

    expect(result.current.results).toEqual([])
    expect(result.current.hasSearched).toBe(false)
  })

  it('should handle multiple sequential searches', async () => {
    const results1 = [{ filePath: '/a.txt', chunkIndex: 0, text: 'a', score: 0.1 }]
    const results2 = [{ filePath: '/b.txt', chunkIndex: 0, text: 'b', score: 0.2 }]

    mockSearchDocuments.mockResolvedValueOnce(results1).mockResolvedValueOnce(results2)

    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() })

    // First search
    act(() => {
      result.current.search('query1')
    })

    await waitFor(() => {
      expect(result.current.results).toEqual(results1)
    })

    // Second search
    act(() => {
      result.current.search('query2')
    })

    await waitFor(() => {
      expect(result.current.results).toEqual(results2)
    })

    expect(mockSearchDocuments).toHaveBeenCalledTimes(2)
  })
})
