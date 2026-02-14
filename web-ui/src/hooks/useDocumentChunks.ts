import { useQuery } from '@tanstack/react-query'
import { getDocumentChunks, type DocumentChunk } from '../api/client'

interface UseDocumentChunksResult {
  chunks: DocumentChunk[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook for fetching all chunks of a document
 * Uses TanStack Query for caching and automatic refetch
 */
export function useDocumentChunks(filePath: string | null): UseDocumentChunksResult {
  const {
    data: chunks = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['documentChunks', filePath],
    queryFn: () => (filePath ? getDocumentChunks(filePath) : Promise.resolve([])),
    enabled: !!filePath,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    chunks,
    isLoading,
    error: error as Error | null,
    refetch,
  }
}
