import { useCallback, useEffect, useRef } from 'react'

interface UseKeyboardNavOptions {
  totalChunks: number
  activeChunkIndex: number | null
  onNavigateToChunk: (index: number) => void
  onToggleSplit: () => void
  onPinTopSuggestion: () => void
  onOpenSearch: () => void
  onOpenHelp: () => void
  onCloseOverlay: () => void
  isOverlayOpen: boolean
  enabled?: boolean
  // Search navigation (Phase 6)
  isSearchOpen?: boolean
  onNextSearchMatch?: () => void
  onPreviousSearchMatch?: () => void
  // Bookmarks (Phase 7)
  onToggleBookmark?: () => void
  // Tags (Phase 7)
  onOpenTagPicker?: () => void
  // Phase 9: Annotation panel, reading mode, comparison
  onToggleAnnotationPanel?: () => void
  onToggleReadingMode?: () => void
  onOpenComparison?: () => void
  // Phase 10: Graph controls
  onResetGraphLayout?: () => void
  onOpenGraphExport?: () => void
  onTogglePathfinding?: () => void
  onToggleClustering?: () => void
  isGraphOpen?: boolean
  // Phase 11: Cross-document, stats, discovery
  onToggleInferredLinks?: () => void
  onToggleCrossDocPanel?: () => void
  onToggleStatsPanel?: () => void
  onToggleDiscoveryMode?: () => void
  isDiscoveryMode?: boolean
  onDiscoverySelectSuggestion?: (index: number) => void
  onDiscoveryGoBack?: () => void
}

interface UseKeyboardNavResult {
  /** Ref to attach to the reader container for focus management */
  containerRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Keyboard navigation hook for the reader
 * Handles j/k navigation, Space for split toggle, p for pin, / for search, ? for help
 */
export function useKeyboardNav({
  totalChunks,
  activeChunkIndex,
  onNavigateToChunk,
  onToggleSplit,
  onPinTopSuggestion,
  onOpenSearch,
  onOpenHelp,
  onCloseOverlay,
  isOverlayOpen,
  enabled = true,
  isSearchOpen = false,
  onNextSearchMatch,
  onPreviousSearchMatch,
  onToggleBookmark,
  onOpenTagPicker,
  // Phase 9
  onToggleAnnotationPanel,
  onToggleReadingMode,
  onOpenComparison,
  // Phase 10
  onResetGraphLayout,
  onOpenGraphExport,
  onTogglePathfinding,
  onToggleClustering,
  isGraphOpen = false,
  // Phase 11
  onToggleInferredLinks,
  onToggleCrossDocPanel,
  onToggleStatsPanel,
  onToggleDiscoveryMode,
  isDiscoveryMode = false,
  onDiscoverySelectSuggestion,
  onDiscoveryGoBack,
}: UseKeyboardNavOptions): UseKeyboardNavResult {
  const containerRef = useRef<HTMLDivElement>(null)

  const shouldIgnoreKeyboard = useCallback((): boolean => {
    // Check if focus is inside input, textarea, or contenteditable
    const activeElement = document.activeElement
    if (activeElement) {
      const tagName = activeElement.tagName.toLowerCase()
      if (tagName === 'input' || tagName === 'textarea') {
        return true
      }
      if (activeElement.getAttribute('contenteditable') === 'true') {
        return true
      }
    }

    // Check if user is actively selecting text
    const selection = window.getSelection()
    if (selection && selection.toString().length > 0) {
      return true
    }

    return false
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return
      if (shouldIgnoreKeyboard()) return

      // Handle Escape first - always close overlays
      if (event.key === 'Escape') {
        if (isOverlayOpen) {
          event.preventDefault()
          onCloseOverlay()
        }
        return
      }

      // If search is open, handle n/N for search navigation
      if (isSearchOpen) {
        switch (event.key) {
          case 'n':
            event.preventDefault()
            onNextSearchMatch?.()
            return
          case 'N':
            event.preventDefault()
            onPreviousSearchMatch?.()
            return
        }
        // Don't process other shortcuts when search is open
        return
      }

      // If an overlay is open, don't process other shortcuts
      if (isOverlayOpen) return

      switch (event.key) {
        case 'j': {
          // Navigate to next chunk
          event.preventDefault()
          const nextIndex = activeChunkIndex === null ? 0 : Math.min(activeChunkIndex + 1, totalChunks - 1)
          onNavigateToChunk(nextIndex)
          break
        }

        case 'k': {
          // Navigate to previous chunk
          event.preventDefault()
          const prevIndex = activeChunkIndex === null ? 0 : Math.max(activeChunkIndex - 1, 0)
          onNavigateToChunk(prevIndex)
          break
        }

        case ' ': {
          // Toggle split view (Space)
          event.preventDefault()
          onToggleSplit()
          break
        }

        case 'p': {
          // Pin top margin suggestion
          event.preventDefault()
          onPinTopSuggestion()
          break
        }

        case '/': {
          // Open search overlay
          event.preventDefault()
          onOpenSearch()
          break
        }

        case '?': {
          // Open keyboard shortcuts help
          event.preventDefault()
          onOpenHelp()
          break
        }

        case 'b': {
          // Toggle bookmark on active chunk
          event.preventDefault()
          onToggleBookmark?.()
          break
        }

        case 't': {
          // Open tag picker for active chunk
          event.preventDefault()
          onOpenTagPicker?.()
          break
        }

        // Phase 9: Reader UI Enhancements
        case 'a': {
          // Toggle annotation summary panel
          event.preventDefault()
          onToggleAnnotationPanel?.()
          break
        }

        case 'm': {
          // Toggle reading mode (skim/full)
          event.preventDefault()
          onToggleReadingMode?.()
          break
        }

        case 'c': {
          // Open chunk comparison view
          event.preventDefault()
          onOpenComparison?.()
          break
        }

        // Phase 10: Graph controls (only when graph is open)
        case 'r': {
          if (isGraphOpen) {
            event.preventDefault()
            onResetGraphLayout?.()
          }
          break
        }

        case 'e': {
          if (isGraphOpen) {
            event.preventDefault()
            onOpenGraphExport?.()
          }
          break
        }

        case 'f': {
          if (isGraphOpen) {
            event.preventDefault()
            onTogglePathfinding?.()
          }
          break
        }

        case 'g': {
          if (isGraphOpen) {
            event.preventDefault()
            onToggleClustering?.()
          }
          break
        }

        // Phase 11: Cross-document intelligence
        case 'i': {
          // Toggle inferred backlinks visibility
          event.preventDefault()
          onToggleInferredLinks?.()
          break
        }

        case 'x': {
          // Toggle cross-document panel
          event.preventDefault()
          onToggleCrossDocPanel?.()
          break
        }

        case 's': {
          // Toggle reading statistics panel
          event.preventDefault()
          onToggleStatsPanel?.()
          break
        }

        case 'd': {
          // Toggle discovery mode
          event.preventDefault()
          onToggleDiscoveryMode?.()
          break
        }

        // Discovery mode number selection (1-9)
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9': {
          if (isDiscoveryMode) {
            event.preventDefault()
            const index = parseInt(event.key) - 1
            onDiscoverySelectSuggestion?.(index)
          }
          break
        }

        case 'Backspace': {
          if (isDiscoveryMode) {
            event.preventDefault()
            onDiscoveryGoBack?.()
          }
          break
        }
      }
    },
    [
      enabled,
      shouldIgnoreKeyboard,
      isOverlayOpen,
      isSearchOpen,
      isGraphOpen,
      isDiscoveryMode,
      activeChunkIndex,
      totalChunks,
      onNavigateToChunk,
      onToggleSplit,
      onPinTopSuggestion,
      onOpenSearch,
      onOpenHelp,
      onCloseOverlay,
      onNextSearchMatch,
      onPreviousSearchMatch,
      onToggleBookmark,
      onOpenTagPicker,
      onToggleAnnotationPanel,
      onToggleReadingMode,
      onOpenComparison,
      onResetGraphLayout,
      onOpenGraphExport,
      onTogglePathfinding,
      onToggleClustering,
      onToggleInferredLinks,
      onToggleCrossDocPanel,
      onToggleStatsPanel,
      onToggleDiscoveryMode,
      onDiscoverySelectSuggestion,
      onDiscoveryGoBack,
    ]
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])

  return { containerRef }
}
