import { useCallback, useRef, useState } from 'react'
import { searchDocuments, type SearchResult } from '../api/client'
import type { SelectionAction } from '../components/Reader/SelectionPopover'

/**
 * Selection context for X-Ray Vision
 */
export interface SelectionContext {
  text: string
  filePath: string
  chunkIndex: number
  startOffset: number
  endOffset: number
  contextBefore: string
  contextAfter: string
}

/**
 * Selection search result with context
 */
export interface SelectionSearchResult {
  action: SelectionAction
  query: string
  results: SearchResult[]
  timestamp: number
  selectionContext: SelectionContext
}

interface UseSelectionSearchOptions {
  /** Maximum results to return (default: 5) */
  limit?: number
  /** Debounce delay in ms (default: 200) */
  debounceMs?: number
}

interface UseSelectionSearchResult {
  /** Current search results */
  searchResults: SelectionSearchResult | null
  /** Whether a search is in progress */
  isLoading: boolean
  /** Error message if search failed */
  error: string | null
  /** Perform a selection-based search */
  performSearch: (action: SelectionAction, context: SelectionContext) => Promise<void>
  /** Clear current results */
  clearResults: () => void
  /** Cache for deduplication */
  getCachedResult: (action: SelectionAction, context: SelectionContext) => SelectionSearchResult | null
}

// Simple cache for selection searches
// Key: sha256(filePath:chunkIndex:action:text)
const searchCache = new Map<string, SelectionSearchResult>()
const CACHE_MAX_SIZE = 50
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function getCacheKey(action: SelectionAction, context: SelectionContext): string {
  return `${context.filePath}:${context.chunkIndex}:${action}:${context.text.slice(0, 100)}`
}

function cleanExpiredCache() {
  const now = Date.now()
  for (const [key, value] of searchCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      searchCache.delete(key)
    }
  }
}

function addToCache(key: string, result: SelectionSearchResult) {
  // Clean expired entries first
  cleanExpiredCache()

  // Evict oldest if at capacity
  if (searchCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = searchCache.keys().next().value
    if (oldestKey) searchCache.delete(oldestKey)
  }

  searchCache.set(key, result)
}

/**
 * Hook for X-Ray Vision selection-based search
 * Queries the vault for content related to selected text
 */
export function useSelectionSearch(options: UseSelectionSearchOptions = {}): UseSelectionSearchResult {
  const { limit = 5, debounceMs = 200 } = options

  const [searchResults, setSearchResults] = useState<SelectionSearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const getCachedResult = useCallback(
    (action: SelectionAction, context: SelectionContext): SelectionSearchResult | null => {
      const key = getCacheKey(action, context)
      const cached = searchCache.get(key)

      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached
      }

      return null
    },
    []
  )

  const performSearch = useCallback(
    async (action: SelectionAction, context: SelectionContext) => {
      // Clear any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Check cache first
      const cached = getCachedResult(action, context)
      if (cached) {
        setSearchResults(cached)
        setError(null)
        return
      }

      // Debounce the search
      return new Promise<void>((resolve) => {
        debounceTimerRef.current = setTimeout(async () => {
          setIsLoading(true)
          setError(null)

          abortControllerRef.current = new AbortController()

          try {
            // Build query based on action
            let query = context.text

            switch (action) {
              case 'related':
                // Direct semantic search
                break
              case 'support':
                // Same as related for now (heuristic)
                break
              case 'contradict':
                // Prefix with "contradicts:" heuristic
                query = `contradicts: ${context.text}`
                break
              case 'compare':
                // Direct semantic search
                break
              case 'pin':
                // Pin action doesn't need search
                resolve()
                return
            }

            const results = await searchDocuments(query, limit)

            // Filter out results from the same chunk
            const filteredResults = results.filter(
              (r) => !(r.filePath === context.filePath && r.chunkIndex === context.chunkIndex)
            )

            const searchResult: SelectionSearchResult = {
              action,
              query,
              results: filteredResults,
              timestamp: Date.now(),
              selectionContext: context,
            }

            // Cache the result
            const cacheKey = getCacheKey(action, context)
            addToCache(cacheKey, searchResult)

            setSearchResults(searchResult)
            setError(null)
          } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
              setError(err.message)
            }
          } finally {
            setIsLoading(false)
            resolve()
          }
        }, debounceMs)
      })
    },
    [limit, debounceMs, getCachedResult]
  )

  const clearResults = useCallback(() => {
    setSearchResults(null)
    setError(null)

    // Cancel any pending operations
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  return {
    searchResults,
    isLoading,
    error,
    performSearch,
    clearResults,
    getCachedResult,
  }
}
