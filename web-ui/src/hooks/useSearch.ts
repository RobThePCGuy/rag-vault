import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { type SearchResult, searchDocuments } from '../api/client'

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const mutation = useMutation({
    mutationFn: ({ query, limit }: { query: string; limit?: number }) =>
      searchDocuments(query, limit),
    onSuccess: (data) => {
      setResults(data)
      setHasSearched(true)
    },
  })

  const search = (query: string, limit?: number) => {
    mutation.mutate({ query, limit })
  }

  const clear = () => {
    setResults([])
    setHasSearched(false)
  }

  return {
    results,
    search,
    clear,
    isLoading: mutation.isPending,
    error: mutation.error,
    hasSearched,
  }
}
