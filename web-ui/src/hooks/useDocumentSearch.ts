import { useCallback, useMemo, useState } from 'react'
import type { DocumentChunk } from '../api/client'
import type { SearchMatch } from '../components/Reader/UnifiedTextRenderer'

// ============================================
// Types
// ============================================

interface SearchIndex {
  chunkIndex: number
  text: string
  lowerText: string // Precomputed for case-insensitive search
}

export interface SearchState {
  query: string
  matches: SearchMatch[]
  currentIndex: number
  caseSensitive: boolean
  isOpen: boolean
}

interface UseDocumentSearchOptions {
  chunks: DocumentChunk[]
  onNavigateToChunk?: (chunkIndex: number) => void
}

interface UseDocumentSearchResult {
  // State
  searchState: SearchState
  isSearchOpen: boolean

  // Actions
  openSearch: () => void
  closeSearch: () => void
  setQuery: (query: string) => void
  toggleCaseSensitive: () => void
  nextMatch: () => void
  previousMatch: () => void
  goToMatch: (index: number) => void
  clearSearch: () => void

  // Helpers
  getMatchesForChunk: (chunkIndex: number) => SearchMatch[]
  currentMatch: SearchMatch | null
  totalMatches: number
}

// ============================================
// Search Logic
// ============================================

/**
 * Build search index from chunks (precompute lowercase text)
 */
function buildSearchIndex(chunks: DocumentChunk[]): SearchIndex[] {
  return chunks.map((chunk) => ({
    chunkIndex: chunk.chunkIndex,
    text: chunk.text,
    lowerText: chunk.text.toLowerCase(),
  }))
}

/**
 * Find all matches for a query across all chunks
 */
function findMatches(index: SearchIndex[], query: string, caseSensitive: boolean): SearchMatch[] {
  if (!query || query.length === 0) return []

  const matches: SearchMatch[] = []
  const searchQuery = caseSensitive ? query : query.toLowerCase()

  for (const entry of index) {
    const textToSearch = caseSensitive ? entry.text : entry.lowerText
    let startPos = 0

    while (startPos < textToSearch.length) {
      const matchIndex = textToSearch.indexOf(searchQuery, startPos)
      if (matchIndex === -1) break

      // Get context (50 chars around match)
      const contextStart = Math.max(0, matchIndex - 25)
      const contextEnd = Math.min(entry.text.length, matchIndex + query.length + 25)
      const context = entry.text.slice(contextStart, contextEnd)

      matches.push({
        chunkIndex: entry.chunkIndex,
        startOffset: matchIndex,
        endOffset: matchIndex + query.length,
        context:
          (contextStart > 0 ? '...' : '') + context + (contextEnd < entry.text.length ? '...' : ''),
      })

      startPos = matchIndex + 1 // Move past this match to find overlapping matches
    }
  }

  return matches
}

// ============================================
// Hook
// ============================================

const INITIAL_STATE: SearchState = {
  query: '',
  matches: [],
  currentIndex: -1,
  caseSensitive: false,
  isOpen: false,
}

export function useDocumentSearch({
  chunks,
  onNavigateToChunk,
}: UseDocumentSearchOptions): UseDocumentSearchResult {
  const [state, setState] = useState<SearchState>(INITIAL_STATE)

  // Build search index from chunks
  const searchIndex = useMemo(() => buildSearchIndex(chunks), [chunks])

  // Open search overlay
  const openSearch = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: true }))
  }, [])

  // Close search overlay
  const closeSearch = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  // Clear search completely
  const clearSearch = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  // Set query and find matches
  const setQuery = useCallback(
    (query: string) => {
      const matches = findMatches(searchIndex, query, state.caseSensitive)
      setState((prev) => ({
        ...prev,
        query,
        matches,
        currentIndex: matches.length > 0 ? 0 : -1,
      }))

      // Navigate to first match
      if (matches.length > 0 && onNavigateToChunk) {
        onNavigateToChunk(matches[0]!.chunkIndex)
      }
    },
    [searchIndex, state.caseSensitive, onNavigateToChunk]
  )

  // Toggle case sensitivity and re-search
  const toggleCaseSensitive = useCallback(() => {
    setState((prev) => {
      const newCaseSensitive = !prev.caseSensitive
      const matches = findMatches(searchIndex, prev.query, newCaseSensitive)
      return {
        ...prev,
        caseSensitive: newCaseSensitive,
        matches,
        currentIndex: matches.length > 0 ? 0 : -1,
      }
    })
  }, [searchIndex])

  // Go to next match
  const nextMatch = useCallback(() => {
    setState((prev) => {
      if (prev.matches.length === 0) return prev

      const newIndex = (prev.currentIndex + 1) % prev.matches.length
      const match = prev.matches[newIndex]

      if (match && onNavigateToChunk) {
        onNavigateToChunk(match.chunkIndex)
      }

      return { ...prev, currentIndex: newIndex }
    })
  }, [onNavigateToChunk])

  // Go to previous match
  const previousMatch = useCallback(() => {
    setState((prev) => {
      if (prev.matches.length === 0) return prev

      const newIndex = prev.currentIndex <= 0 ? prev.matches.length - 1 : prev.currentIndex - 1
      const match = prev.matches[newIndex]

      if (match && onNavigateToChunk) {
        onNavigateToChunk(match.chunkIndex)
      }

      return { ...prev, currentIndex: newIndex }
    })
  }, [onNavigateToChunk])

  // Go to specific match
  const goToMatch = useCallback(
    (index: number) => {
      setState((prev) => {
        if (index < 0 || index >= prev.matches.length) return prev

        const match = prev.matches[index]
        if (match && onNavigateToChunk) {
          onNavigateToChunk(match.chunkIndex)
        }

        return { ...prev, currentIndex: index }
      })
    },
    [onNavigateToChunk]
  )

  // Get matches for a specific chunk
  const getMatchesForChunk = useCallback(
    (chunkIndex: number): SearchMatch[] => {
      return state.matches.filter((m) => m.chunkIndex === chunkIndex)
    },
    [state.matches]
  )

  // Get current match
  const currentMatch = useMemo(() => {
    if (state.currentIndex >= 0 && state.currentIndex < state.matches.length) {
      return state.matches[state.currentIndex] ?? null
    }
    return null
  }, [state.matches, state.currentIndex])

  return {
    searchState: state,
    isSearchOpen: state.isOpen,
    openSearch,
    closeSearch,
    setQuery,
    toggleCaseSensitive,
    nextMatch,
    previousMatch,
    goToMatch,
    clearSearch,
    getMatchesForChunk,
    currentMatch,
    totalMatches: state.matches.length,
  }
}
