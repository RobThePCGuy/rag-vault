import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useRef } from 'react'
import type { DocumentChunk } from '../../api/client'
import type { Highlight, HighlightColor } from '../../contexts/AnnotationsContext'
import { useTextSelection } from '../../hooks/useTextSelection'
import { SelectionPopover, type SelectionAction } from './SelectionPopover'
import { UnifiedTextRenderer, type SearchMatch } from './UnifiedTextRenderer'

interface ChunkBlockProps {
  chunk: DocumentChunk
  isActive: boolean
  onRegister: (index: number, element: HTMLElement | null) => void
  onClick?: () => void
  showChunkNumbers?: boolean
  // Annotation support
  highlights?: Highlight[]
  onCreateHighlight?: (
    range: { startOffset: number; endOffset: number },
    text: string,
    contextBefore: string,
    contextAfter: string,
    color: HighlightColor
  ) => void
  onHighlightClick?: (highlight: Highlight) => void
  // Search support (Phase 6)
  searchMatches?: SearchMatch[]
  currentSearchIndex?: number
  // Bookmark support (Phase 7)
  isBookmarked?: boolean
  // X-Ray Vision: Selection-based discovery
  onSelectionAction?: (
    action: SelectionAction,
    context: {
      text: string
      startOffset: number
      endOffset: number
      contextBefore: string
      contextAfter: string
    }
  ) => void
  isSelectionActionLoading?: boolean
}

/**
 * Individual chunk block with Intersection Observer registration
 * Displays chunk text with proper formatting, active state styling, and highlight support
 * Inherits font settings via CSS variables from ReaderSettingsContext
 */
export function ChunkBlock({
  chunk,
  isActive,
  onRegister,
  onClick,
  showChunkNumbers = true,
  highlights = [],
  onCreateHighlight,
  onHighlightClick,
  searchMatches = [],
  currentSearchIndex = -1,
  isBookmarked = false,
  onSelectionAction,
  isSelectionActionLoading = false,
}: ChunkBlockProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const textContainerRef = useRef<HTMLDivElement>(null)

  // Get the appropriate ref based on whether onClick is provided
  const ref = onClick ? buttonRef : divRef

  // Text selection handling
  const { selection, clearSelection } = useTextSelection({
    containerRef: textContainerRef,
    chunkText: chunk.text,
    enabled: !!onCreateHighlight,
  })

  // Handle color selection from popover
  const handleColorSelect = useCallback(
    (color: HighlightColor) => {
      if (selection && onCreateHighlight) {
        onCreateHighlight(
          { startOffset: selection.startOffset, endOffset: selection.endOffset },
          selection.text,
          selection.contextBefore,
          selection.contextAfter,
          color
        )
        clearSelection()
      }
    },
    [selection, onCreateHighlight, clearSelection]
  )

  // Handle X-Ray Vision selection action
  const handleSelectionAction = useCallback(
    (action: SelectionAction) => {
      if (selection && onSelectionAction) {
        onSelectionAction(action, {
          text: selection.text,
          startOffset: selection.startOffset,
          endOffset: selection.endOffset,
          contextBefore: selection.contextBefore,
          contextAfter: selection.contextAfter,
        })
        // Don't clear selection for actions that show results (keep context visible)
        if (action === 'pin') {
          clearSelection()
        }
      }
    },
    [selection, onSelectionAction, clearSelection]
  )

  // Register element with viewport observer
  useEffect(() => {
    onRegister(chunk.chunkIndex, ref.current)

    return () => {
      onRegister(chunk.chunkIndex, null)
    }
  }, [chunk.chunkIndex, onRegister, ref])

  // The text content with highlights and search matches
  const textContent = (
    <div ref={textContainerRef}>
      {highlights.length > 0 || searchMatches.length > 0 ? (
        <UnifiedTextRenderer
          text={chunk.text}
          highlights={highlights}
          searchMatches={searchMatches}
          currentSearchIndex={currentSearchIndex}
          chunkIndex={chunk.chunkIndex}
          onHighlightClick={onHighlightClick}
        />
      ) : (
        <span className="whitespace-pre-wrap">{chunk.text}</span>
      )}
    </div>
  )

  // If clickable, use a button wrapper; otherwise use a div
  const content = (
    <>
      {/* Chunk index badge - Book style */}
      {showChunkNumbers && (
        <div className="absolute -left-1 top-5 flex items-center gap-1.5">
          <span className="book-chunk-badge">
            §{chunk.chunkIndex}
          </span>
          {isBookmarked && (
            <BookmarkIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
          )}
        </div>
      )}

      {/* Chunk content - Book text styling */}
      <div
        className="pl-8 pr-4 max-w-none book-text"
        style={{
          fontSize: 'var(--reader-font-size, 1.05rem)',
          lineHeight: 'var(--reader-line-height, 1.85)',
          fontFamily: "var(--reader-font-family, 'Georgia', 'Palatino Linotype', serif)",
        }}
      >
        {textContent}
      </div>

      {/* Active indicator - warm amber for book feel */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500/60 dark:bg-amber-600/50" />
      )}

      {/* Selection popover */}
      <AnimatePresence>
        {selection && onCreateHighlight && (
          <SelectionPopover
            rect={selection.rect}
            onSelectColor={handleColorSelect}
            onClose={clearSelection}
            onSelectionAction={onSelectionAction ? handleSelectionAction : undefined}
            isActionLoading={isSelectionActionLoading}
          />
        )}
      </AnimatePresence>
    </>
  )

  const baseClassName = `
    book-page group relative py-6 px-8 mb-4 transition-all duration-200 text-left w-full
    ${isActive ? 'book-chunk-active' : ''}
  `

  if (onClick) {
    return (
      <button
        ref={buttonRef}
        id={`chunk-${chunk.chunkIndex}`}
        type="button"
        className={baseClassName}
        onClick={onClick}
      >
        {content}
      </button>
    )
  }

  return (
    <div ref={divRef} id={`chunk-${chunk.chunkIndex}`} className={baseClassName}>
      {content}
    </div>
  )
}

function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
    </svg>
  )
}
