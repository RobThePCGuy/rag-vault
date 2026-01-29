import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RelatedChunk } from '../../api/client'
import type { Highlight, HighlightColor } from '../../contexts/AnnotationsContext'
import { useLinks } from '../../contexts/LinksContext'
import { useReaderSettings } from '../../contexts/ReaderSettingsContext'
import {
  useDocumentChunks,
  useDebouncedRelated,
  useViewportChunks,
  useTableOfContents,
  useReadingProgress,
  useKeyboardNav,
} from '../../hooks'
import { useAnnotationsForChunk } from '../../hooks/useAnnotations'
import { useAutoSelectionSearch } from '../../hooks/useAutoSelectionSearch'
import { useDocumentSearch } from '../../hooks/useDocumentSearch'
import { Spinner } from '../ui'
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs'
import { DocumentRenderer } from './DocumentRenderer'
import { DynamicMargin } from './DynamicMargin'
import { GraphPanel } from './GraphPanel'
import { KeyboardHelp } from './KeyboardHelp'
import { ReaderControls, ReaderControlsButton } from './ReaderControls'
import { SearchOverlay } from './SearchOverlay'
import { SplitPortal } from './SplitPortal'
import { TableOfContents } from './TableOfContents'

interface ReaderLayoutProps {
  filePath: string
  initialChunkIndex?: number
  onNavigate: (filePath: string, chunkIndex?: number) => void
  onGoHome: () => void
  pinnedChunkKeys?: Set<string>
  onTogglePin?: (filePath: string, chunkIndex: number) => void
  onSaveTrail?: () => void
}

/**
 * Main layout for the Reader feature
 * 60% center (document) + 40% margin (suggestions)
 * Handles split view, breadcrumbs, viewport tracking, ToC, keyboard nav, reading progress, and annotations
 */
export function ReaderLayout({
  filePath,
  initialChunkIndex,
  onNavigate,
  onGoHome,
  pinnedChunkKeys,
  onTogglePin,
  onSaveTrail,
}: ReaderLayoutProps) {
  // State
  const [splitView, setSplitView] = useState<{ filePath: string; chunkIndex: number } | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(() => {
    const fileName = formatPath(filePath)
    return [
      {
        filePath,
        chunkIndex: initialChunkIndex,
        label: fileName,
      },
    ]
  })
  const [tocOpen, setTocOpen] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [graphOpen, setGraphOpen] = useState(false)
  const [currentSelectionText, setCurrentSelectionText] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Reader settings context
  const { settings, cssVariables } = useReaderSettings()

  // Links context for graph and links panel
  const { pins, getBacklinks, getPinsFromChunk } = useLinks()

  // Fetch document chunks
  const { chunks, isLoading: isLoadingDoc, error: docError } = useDocumentChunks(filePath)

  // Track visible chunks
  const { visibleChunkIndices, registerChunk, activeChunkIndex } = useViewportChunks('100px')

  // Fetch related chunks with debouncing
  const { relatedChunks, isLoading: isLoadingRelated } = useDebouncedRelated(
    filePath,
    visibleChunkIndices,
    300,
    5
  )

  // Auto-selection search for Zettelkasten margin
  const {
    results: autoSelectionResults,
    isSearching: isAutoSearching,
    searchedText: autoSearchedText,
  } = useAutoSelectionSearch({
    selectionText: currentSelectionText,
    filePath,
    chunkIndex: activeChunkIndex ?? 0,
    enabled: !splitView, // Disable when split view is open
  })

  // Track text selection globally
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || !selection.rangeCount) {
        setCurrentSelectionText(null)
        return
      }

      const text = selection.toString().trim()
      if (text.length >= 10) {
        setCurrentSelectionText(text)
      } else {
        setCurrentSelectionText(null)
      }
    }

    // Debounce the selection change handler
    let timeoutId: ReturnType<typeof setTimeout>
    const debouncedHandler = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(handleSelectionChange, 150)
    }

    document.addEventListener('selectionchange', debouncedHandler)
    return () => {
      document.removeEventListener('selectionchange', debouncedHandler)
      clearTimeout(timeoutId)
    }
  }, [])

  // Table of Contents
  const { entries: tocEntries, isFallback: tocIsFallback } = useTableOfContents({ chunks })

  // Navigate to specific chunk (for keyboard nav, ToC, and search)
  const scrollToChunk = useCallback((index: number) => {
    const element = document.getElementById(`chunk-${index}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  // Document search (Phase 6)
  const {
    searchState,
    isSearchOpen,
    openSearch,
    closeSearch,
    setQuery,
    toggleCaseSensitive,
    nextMatch,
    previousMatch,
    goToMatch,
    getMatchesForChunk,
  } = useDocumentSearch({
    chunks,
    onNavigateToChunk: scrollToChunk,
  })

  // Reading progress
  const { restorePosition, hasSavedPosition } = useReadingProgress({
    filePath,
    chunks,
    activeChunkIndex,
  })

  // Annotations for active chunk
  const activeChunkKey = useMemo(
    () => (activeChunkIndex !== null ? { filePath, chunkIndex: activeChunkIndex } : null),
    [filePath, activeChunkIndex]
  )

  const {
    highlights: activeHighlights,
    annotations: activeAnnotations,
    createHighlight,
    deleteHighlight,
    updateHighlightColor,
    addNote,
    updateNote,
    deleteNote,
  } = useAnnotationsForChunk(activeChunkKey)

  // Get highlights for any chunk (for rendering)
  const getHighlightsForChunk = useCallback(
    (chunkIndex: number) => {
      // We only manage the active chunk's annotations in detail
      // For other chunks, we need to query the context directly
      if (chunkIndex === activeChunkIndex) {
        return activeHighlights
      }
      return [] // For now, only show highlights on active chunk
    },
    [activeChunkIndex, activeHighlights]
  )

  // Handle creating a highlight
  const handleCreateHighlight = useCallback(
    (
      chunkIndex: number,
      range: { startOffset: number; endOffset: number },
      text: string,
      contextBefore: string,
      contextAfter: string,
      color: HighlightColor
    ) => {
      if (chunkIndex !== activeChunkIndex) return
      createHighlight(range, text, contextBefore, contextAfter, color)
    },
    [activeChunkIndex, createHighlight]
  )

  // Handle highlight click - could be used for future functionality
  const handleHighlightClick = useCallback((_highlight: Highlight) => {
    // Could scroll to margin or highlight the annotation
  }, [])

  // Handle updating a note
  const handleUpdateNote = useCallback(
    (highlightId: string, note: string) => {
      const annotation = activeAnnotations.get(highlightId)
      if (annotation) {
        updateNote(annotation.id, note)
      } else {
        addNote(highlightId, note)
      }
    },
    [activeAnnotations, updateNote, addNote]
  )

  // Restore reading position when chunks load
  const hasRestoredPosition = useRef(false)
  useEffect(() => {
    if (chunks.length > 0 && !hasRestoredPosition.current && !initialChunkIndex) {
      hasRestoredPosition.current = true
      const savedPos = restorePosition()
      if (savedPos) {
        // Wait for DOM to render, then scroll
        requestAnimationFrame(() => {
          const element = document.getElementById(`chunk-${savedPos.chunkIndex}`)
          if (element) {
            element.scrollIntoView({ behavior: 'auto', block: 'start' })
          }
        })
      }
    }
  }, [chunks, restorePosition, initialChunkIndex])

  // Get related chunks for active chunk
  const activeRelated: RelatedChunk[] = useMemo(() => {
    if (activeChunkIndex === null) return []
    const key = `${filePath}:${activeChunkIndex}`
    return relatedChunks[key] || []
  }, [filePath, activeChunkIndex, relatedChunks])

  // Handle navigation to a related chunk
  const handleNavigateToChunk = useCallback(
    (targetFilePath: string, targetChunkIndex: number) => {
      // Find connection reason from related chunks
      const related = activeRelated.find(
        (r) => r.filePath === targetFilePath && r.chunkIndex === targetChunkIndex
      )

      // Add to breadcrumbs
      setBreadcrumbs((prev) => [
        ...prev,
        {
          filePath: targetFilePath,
          chunkIndex: targetChunkIndex,
          label: formatPath(targetFilePath),
          connectionReason: related?.connectionReason,
        },
      ])

      // Navigate
      onNavigate(targetFilePath, targetChunkIndex)
    },
    [activeRelated, onNavigate]
  )

  // Handle opening split view
  const handleOpenSplit = useCallback((targetFilePath: string, targetChunkIndex: number) => {
    setSplitView({ filePath: targetFilePath, chunkIndex: targetChunkIndex })
  }, [])

  // Handle breadcrumb navigation
  const handleBreadcrumbNavigate = useCallback(
    (item: BreadcrumbItem) => {
      if (!item.filePath) {
        // Go home
        onGoHome()
        return
      }

      // Find index in breadcrumbs and truncate
      const index = breadcrumbs.findIndex(
        (b) => b.filePath === item.filePath && b.chunkIndex === item.chunkIndex
      )

      if (index !== -1) {
        setBreadcrumbs((prev) => prev.slice(0, index + 1))
      }

      onNavigate(item.filePath, item.chunkIndex)
    },
    [breadcrumbs, onNavigate, onGoHome]
  )

  // Keyboard navigation
  const isAnyOverlayOpen = helpOpen || isSearchOpen || controlsOpen

  // Get backlinks and outgoing pins for current chunk (Phase 6)
  const activeBacklinks = useMemo(() => {
    if (activeChunkIndex === null) return []
    return getBacklinks({ filePath, chunkIndex: activeChunkIndex })
  }, [filePath, activeChunkIndex, getBacklinks])

  const activeOutgoingLinks = useMemo(() => {
    if (activeChunkIndex === null) return []
    return getPinsFromChunk({ filePath, chunkIndex: activeChunkIndex })
  }, [filePath, activeChunkIndex, getPinsFromChunk])

  const handlePinTopSuggestion = useCallback(() => {
    if (activeRelated.length > 0 && onTogglePin) {
      const topSuggestion = activeRelated[0]
      if (topSuggestion) {
        onTogglePin(topSuggestion.filePath, topSuggestion.chunkIndex)
      }
    }
  }, [activeRelated, onTogglePin])

  const handleToggleSplit = useCallback(() => {
    if (splitView) {
      setSplitView(null)
    } else if (activeRelated.length > 0) {
      const top = activeRelated[0]
      if (top) {
        handleOpenSplit(top.filePath, top.chunkIndex)
      }
    }
  }, [splitView, activeRelated, handleOpenSplit])

  const handleCloseOverlay = useCallback(() => {
    setHelpOpen(false)
    closeSearch()
    setControlsOpen(false)
  }, [closeSearch])

  useKeyboardNav({
    totalChunks: chunks.length,
    activeChunkIndex,
    onNavigateToChunk: scrollToChunk,
    onToggleSplit: handleToggleSplit,
    onPinTopSuggestion: handlePinTopSuggestion,
    onOpenSearch: openSearch,
    onOpenHelp: () => setHelpOpen(true),
    onCloseOverlay: handleCloseOverlay,
    isOverlayOpen: isAnyOverlayOpen,
    enabled: true,
    // Phase 6 - search navigation
    isSearchOpen,
    onNextSearchMatch: nextMatch,
    onPreviousSearchMatch: previousMatch,
  })

  // Determine display name
  const displayName = formatPath(filePath)

  return (
    <div className="h-full flex flex-col" style={cssVariables as React.CSSProperties}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={breadcrumbs}
        onNavigate={handleBreadcrumbNavigate}
        onSaveTrail={onSaveTrail}
        canSaveTrail={breadcrumbs.length > 1}
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* ToC Sidebar spacer when open */}
        {tocOpen && <div className="w-60 flex-shrink-0" />}

        {/* Document panel */}
        <div
          className={`
          flex flex-col overflow-hidden transition-all duration-300
          ${splitView ? 'w-[40%]' : 'w-[60%]'}
        `}
        >
          {/* Document header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-3">
              {/* ToC toggle */}
              <TableOfContents
                entries={tocEntries}
                activeChunkIndex={activeChunkIndex}
                onNavigateToChunk={scrollToChunk}
                isOpen={tocOpen}
                onToggle={() => setTocOpen(!tocOpen)}
                isFallback={tocIsFallback}
              />

              {/* Document title */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate" title={filePath}>
                  {displayName}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {chunks.length} chunks
                  {activeChunkIndex !== null && ` • Reading #${activeChunkIndex}`}
                  {hasSavedPosition && !initialChunkIndex && (
                    <span className="ml-2 text-blue-500">• Restored</span>
                  )}
                </p>
              </div>
            </div>

            {/* Reader controls */}
            <div className="flex items-center gap-2 relative">
              {/* Graph toggle */}
              <GraphPanel
                isOpen={graphOpen}
                onToggle={() => setGraphOpen(!graphOpen)}
                filePath={filePath}
                activeChunkIndex={activeChunkIndex}
                relatedChunks={activeRelated}
                pins={pins}
                onNavigateToChunk={handleNavigateToChunk}
              />
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Keyboard shortcuts (?)"
              >
                <KeyboardIcon className="w-4 h-4" />
              </button>
              <ReaderControlsButton onClick={() => setControlsOpen(!controlsOpen)} />
              <ReaderControls isOpen={controlsOpen} onClose={() => setControlsOpen(false)} />
            </div>
          </div>

          {/* Document content */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900"
          >
            {isLoadingDoc ? (
              <div className="flex items-center justify-center h-32">
                <Spinner className="w-6 h-6 text-gray-400" />
                <span className="ml-2 text-gray-500 dark:text-gray-400">Loading document...</span>
              </div>
            ) : docError ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
                <p className="font-medium">Error loading document</p>
                <p className="text-sm mt-1">{docError.message}</p>
              </div>
            ) : (
              <DocumentRenderer
                chunks={chunks}
                activeChunkIndex={activeChunkIndex}
                onRegisterChunk={registerChunk}
                scrollToChunk={initialChunkIndex}
                showChunkNumbers={settings.showChunkNumbers}
                getHighlightsForChunk={getHighlightsForChunk}
                onCreateHighlight={handleCreateHighlight}
                onHighlightClick={handleHighlightClick}
                getSearchMatchesForChunk={getMatchesForChunk}
                currentSearchIndex={searchState.currentIndex}
              />
            )}
          </div>
        </div>

        {/* Split view or margin (40%) */}
        <AnimatePresence mode="wait">
          {splitView ? (
            <div key="split" className="w-[60%] border-l border-gray-200 dark:border-gray-700">
              <SplitPortal
                filePath={splitView.filePath}
                chunkIndex={splitView.chunkIndex}
                onClose={() => setSplitView(null)}
                onNavigate={(fp, ci) => {
                  setSplitView(null)
                  handleNavigateToChunk(fp, ci)
                }}
              />
            </div>
          ) : (
            <div
              key="margin"
              className="w-[40%] border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-850"
            >
              <DynamicMargin
                relatedChunks={activeRelated}
                isLoading={isLoadingRelated}
                activeChunkIndex={activeChunkIndex}
                currentFilePath={filePath}
                onNavigateToChunk={handleNavigateToChunk}
                onOpenSplit={handleOpenSplit}
                pinnedChunkKeys={pinnedChunkKeys}
                onTogglePin={onTogglePin}
                // Annotations
                highlights={activeHighlights}
                annotations={activeAnnotations}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={deleteNote}
                onDeleteHighlight={deleteHighlight}
                onChangeHighlightColor={updateHighlightColor}
                // Links (Phase 6)
                backlinks={activeBacklinks}
                outgoingLinks={activeOutgoingLinks}
                // Auto-selection search (Zettelkasten)
                autoSelectionResults={autoSelectionResults}
                isAutoSearching={isAutoSearching}
                selectionText={autoSearchedText}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Keyboard shortcuts help overlay */}
      <KeyboardHelp isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Search overlay (Phase 6) */}
      <SearchOverlay
        isOpen={isSearchOpen}
        query={searchState.query}
        matches={searchState.matches}
        currentIndex={searchState.currentIndex}
        caseSensitive={searchState.caseSensitive}
        onQueryChange={setQuery}
        onToggleCaseSensitive={toggleCaseSensitive}
        onNextMatch={nextMatch}
        onPreviousMatch={previousMatch}
        onGoToMatch={goToMatch}
        onClose={closeSearch}
      />
    </div>
  )
}

function formatPath(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

function KeyboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6m-6 4h6"
      />
    </svg>
  )
}
