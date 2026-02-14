import { useQuery } from '@tanstack/react-query'
import { getRelatedChunks, type RelatedChunk, type RelatedChunksOptions } from '../api/client'

interface UseRelatedChunksResult {
  related: RelatedChunk[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook for fetching related chunks for a single chunk
 * Useful when you need related suggestions for a specific chunk
 */
export function useRelatedChunks(
  filePath: string | null,
  chunkIndex: number | null,
  options?: RelatedChunksOptions
): UseRelatedChunksResult {
  const {
    data: related = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['relatedChunks', filePath, chunkIndex, options],
    queryFn: () =>
      filePath && chunkIndex !== null
        ? getRelatedChunks(filePath, chunkIndex, options)
        : Promise.resolve([]),
    enabled: !!filePath && chunkIndex !== null,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    related,
    isLoading,
    error: error as Error | null,
    refetch,
  }
}
