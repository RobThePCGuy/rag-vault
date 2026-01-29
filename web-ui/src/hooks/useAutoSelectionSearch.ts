import { useCallback, useEffect, useRef, useState } from 'react'
import { searchDocuments, type SearchResult } from '../api/client'

/**
 * Minimum characters required to trigger auto-search
 */
const MIN_SELECTION_LENGTH = 10

/**
 * Debounce delay after selection stabilizes
 */
const DEBOUNCE_MS = 400

/**
 * Maximum results to return
 */
const MAX_RESULTS = 5

/**
 * Cache TTL in milliseconds
 */
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface AutoSelectionSearchOptions {
  /** Currently selected text (null if no selection) */
  selectionText: string | null
  /** Current file path */
  filePath: string
  /** Current chunk index */
  chunkIndex: number
  /** Whether auto-search is enabled */
  enabled?: boolean
}

interface AutoSelectionSearchResult {
  /** Search results matching the selection */
  results: SearchResult[]
  /** Whether a search is in progress */
  isSearching: boolean
  /** The text that was searched (for display) */
  searchedText: string | null
  /** Clear the current results */
  clearResults: () => void
}

/**
 * Simple in-memory cache for selection searches
 */
const selectionCache = new Map<string, { results: SearchResult[]; timestamp: number }>()

function getCacheKey(text: string): string {
  // Normalize whitespace and use first 100 chars
  return text.trim().toLowerCase().slice(0, 100)
}

function getFromCache(text: string): SearchResult[] | null {
  const key = getCacheKey(text)
  const cached = selectionCache.get(key)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.results
  }

  // Clean expired entry
  if (cached) {
    selectionCache.delete(key)
  }

  return null
}

function addToCache(text: string, results: SearchResult[]) {
  const key = getCacheKey(text)

  // Limit cache size
  if (selectionCache.size >= 50) {
    // Remove oldest entry
    const firstKey = selectionCache.keys().next().value
    if (firstKey) selectionCache.delete(firstKey)
  }

  selectionCache.set(key, { results, timestamp: Date.now() })
}

/**
 * Hook that automatically triggers semantic search when text is selected.
 *
 * Behavior:
 * - Watches selection text
 * - Debounces 400ms after selection stabilizes
 * - Requires minimum 10 characters to trigger
 * - Caches results for same selection text
 * - Clears when selection is cleared
 */
export function useAutoSelectionSearch({
  selectionText,
  filePath,
  chunkIndex,
  enabled = true,
}: AutoSelectionSearchOptions): AutoSelectionSearchResult {
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchedText, setSearchedText] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSearchTextRef = useRef<string | null>(null)

  const clearResults = useCallback(() => {
    setResults([])
    setSearchedText(null)
    setIsSearching(false)
    lastSearchTextRef.current = null

    // Cancel any pending operations
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      clearResults()
      return
    }

    // Selection cleared - clear results
    if (!selectionText) {
      clearResults()
      return
    }

    // Selection too short
    if (selectionText.length < MIN_SELECTION_LENGTH) {
      clearResults()
      return
    }

    // Same selection as last search - skip
    if (selectionText === lastSearchTextRef.current) {
      return
    }

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Check cache first
    const cached = getFromCache(selectionText)
    if (cached) {
      // Filter out current chunk from cached results
      const filtered = cached.filter(
        (r) => !(r.filePath === filePath && r.chunkIndex === chunkIndex)
      )
      setResults(filtered)
      setSearchedText(selectionText)
      lastSearchTextRef.current = selectionText
      return
    }

    // Debounce the search
    debounceTimerRef.current = setTimeout(async () => {
      setIsSearching(true)

      abortControllerRef.current = new AbortController()

      try {
        const searchResults = await searchDocuments(selectionText, MAX_RESULTS)

        // Filter out the current chunk
        const filtered = searchResults.filter(
          (r) => !(r.filePath === filePath && r.chunkIndex === chunkIndex)
        )

        // Cache the full results (before filtering)
        addToCache(selectionText, searchResults)

        setResults(filtered)
        setSearchedText(selectionText)
        lastSearchTextRef.current = selectionText
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Auto-selection search failed:', err)
        }
      } finally {
        setIsSearching(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [selectionText, filePath, chunkIndex, enabled, clearResults])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    results,
    isSearching,
    searchedText,
    clearResults,
  }
}
