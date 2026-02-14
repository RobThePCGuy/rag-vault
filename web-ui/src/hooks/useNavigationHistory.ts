import { useCallback, useMemo, useState } from 'react'

const MAX_HISTORY = 100

export interface NavigationEntry {
  docId: string
  chunkIndex?: number | null
  timestamp: number
}

export interface UseNavigationHistoryReturn {
  /** Push a new entry onto the history stack */
  push: (docId: string, chunkIndex?: number | null) => void
  /** Go back one step */
  goBack: () => NavigationEntry | null
  /** Go forward one step */
  goForward: () => NavigationEntry | null
  /** Whether back navigation is available */
  canGoBack: boolean
  /** Whether forward navigation is available */
  canGoForward: boolean
  /** Current entry */
  current: NavigationEntry | null
  /** Full history for debugging/display */
  history: NavigationEntry[]
  /** Current position in history */
  currentIndex: number
}

/**
 * Hook that maintains a back/forward navigation stack for document selections.
 *
 * Behaves like a browser history: pushing a new entry after going back discards
 * forward history. Duplicate consecutive entries (same docId + chunkIndex) are
 * ignored. The stack is capped at MAX_HISTORY entries, dropping the oldest when
 * the limit is exceeded.
 */
export function useNavigationHistory(): UseNavigationHistoryReturn {
  const [history, setHistory] = useState<NavigationEntry[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)

  const current = useMemo<NavigationEntry | null>(() => {
    if (currentIndex >= 0 && currentIndex < history.length) {
      return history[currentIndex] ?? null
    }
    return null
  }, [history, currentIndex])

  const canGoBack = currentIndex > 0
  const canGoForward = currentIndex < history.length - 1

  const push = useCallback(
    (docId: string, chunkIndex?: number | null) => {
      setHistory((prev) => {
        const prevIndex = currentIndex
        const currentEntry = prevIndex >= 0 && prevIndex < prev.length ? prev[prevIndex] : null

        // Don't push duplicate consecutive entries
        if (
          currentEntry &&
          currentEntry.docId === docId &&
          currentEntry.chunkIndex === chunkIndex
        ) {
          return prev
        }

        const newEntry: NavigationEntry = {
          docId,
          chunkIndex: chunkIndex ?? null,
          timestamp: Date.now(),
        }

        // Discard any forward history after the current position
        const base = prev.slice(0, prevIndex + 1)
        const updated = [...base, newEntry]

        // Cap at MAX_HISTORY, dropping oldest entries
        if (updated.length > MAX_HISTORY) {
          const trimmed = updated.slice(updated.length - MAX_HISTORY)
          setCurrentIndex(trimmed.length - 1)
          return trimmed
        }

        setCurrentIndex(updated.length - 1)
        return updated
      })
    },
    [currentIndex]
  )

  const goBack = useCallback((): NavigationEntry | null => {
    if (currentIndex <= 0) return null

    const newIndex = currentIndex - 1
    setCurrentIndex(newIndex)

    // We need to read from the current history state synchronously.
    // The history array doesn't change during goBack, so this is safe.
    return history[newIndex] ?? null
  }, [currentIndex, history])

  const goForward = useCallback((): NavigationEntry | null => {
    if (currentIndex >= history.length - 1) return null

    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)

    return history[newIndex] ?? null
  }, [currentIndex, history])

  return {
    push,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
    current,
    history,
    currentIndex,
  }
}
