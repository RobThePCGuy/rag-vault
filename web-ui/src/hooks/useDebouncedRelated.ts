import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { getBatchRelatedChunks, type ChunkKey, type RelatedChunk } from '../api/client'

export interface UseDebouncedRelatedResult {
  relatedChunks: Record<string, RelatedChunk[]>
  isLoading: boolean
  error: Error | null
}

/**
 * Hook for fetching related chunks with debouncing
 * Waits for scroll to settle before making API calls
 * Uses batch API for efficiency when multiple chunks are visible
 */
export function useDebouncedRelated(
  filePath: string | null,
  visibleChunkIndices: Set<number>,
  debounceMs = 300,
  limit = 5
): UseDebouncedRelatedResult {
  const [debouncedChunks, setDebouncedChunks] = useState<ChunkKey[]>([])

  // Debounce the visible chunk indices
  useEffect(() => {
    if (!filePath || visibleChunkIndices.size === 0) {
      setDebouncedChunks([])
      return
    }

    const chunks: ChunkKey[] = Array.from(visibleChunkIndices).map((chunkIndex) => ({
      filePath,
      chunkIndex,
    }))

    const timeoutId = setTimeout(() => {
      setDebouncedChunks(chunks)
    }, debounceMs)

    return () => clearTimeout(timeoutId)
  }, [filePath, visibleChunkIndices, debounceMs])

  // Query for related chunks
  const {
    data: relatedChunks = {},
    isLoading,
    error,
  } = useQuery({
    queryKey: ['batchRelatedChunks', debouncedChunks, limit],
    queryFn: () => (debouncedChunks.length > 0 ? getBatchRelatedChunks(debouncedChunks, limit) : {}),
    enabled: debouncedChunks.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    relatedChunks,
    isLoading,
    error: error as Error | null,
  }
}
