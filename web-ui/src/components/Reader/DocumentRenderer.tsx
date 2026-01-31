import { useEffect } from 'react'
import type { DocumentChunk } from '../../api/client'
import type { Highlight, HighlightColor } from '../../contexts/AnnotationsContext'
import { ChunkBlock } from './ChunkBlock'
import type { SearchMatch } from './UnifiedTextRenderer'

interface DocumentRendererProps {
  chunks: DocumentChunk[]
  activeChunkIndex: number | null
  onRegisterChunk: (index: number, element: HTMLElement | null) => void
  onChunkClick?: (chunk: DocumentChunk) => void
  scrollToChunk?: number | null
  showChunkNumbers?: boolean
  // Annotation support
  getHighlightsForChunk?: (chunkIndex: number) => Highlight[]
  onCreateHighlight?: (
    chunkIndex: number,
    range: { startOffset: number; endOffset: number },
    text: string,
    contextBefore: string,
    contextAfter: string,
    color: HighlightColor
  ) => void
  onHighlightClick?: (highlight: Highlight) => void
  // Search support (Phase 6)
  getSearchMatchesForChunk?: (chunkIndex: number) => SearchMatch[]
  currentSearchIndex?: number
  // Bookmark support (Phase 7)
  isChunkBookmarked?: (chunkIndex: number) => boolean
}

/**
 * Renders all chunks of a document in order
 * Handles scroll-to-chunk functionality, chunk registration, and highlight rendering
 */
export function DocumentRenderer({
  chunks,
  activeChunkIndex,
  onRegisterChunk,
  onChunkClick,
  scrollToChunk,
  showChunkNumbers = true,
  getHighlightsForChunk,
  onCreateHighlight,
  onHighlightClick,
  getSearchMatchesForChunk,
  currentSearchIndex = -1,
  isChunkBookmarked,
}: DocumentRendererProps) {
  // Scroll to specific chunk when requested
  useEffect(() => {
    if (scrollToChunk !== null && scrollToChunk !== undefined) {
      const element = document.getElementById(`chunk-${scrollToChunk}`)
      if (element) {
        // Small delay to ensure layout is complete
        requestAnimationFrame(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
      }
    }
  }, [scrollToChunk])

  if (chunks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <p>No content to display</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-2">
      {chunks.map((chunk) => {
        const highlights = getHighlightsForChunk?.(chunk.chunkIndex) ?? []
        const searchMatches = getSearchMatchesForChunk?.(chunk.chunkIndex) ?? []
        const isBookmarked = isChunkBookmarked?.(chunk.chunkIndex) ?? false

        return (
          <ChunkBlock
            key={`${chunk.filePath}-${chunk.chunkIndex}`}
            chunk={chunk}
            isActive={activeChunkIndex === chunk.chunkIndex}
            onRegister={onRegisterChunk}
            onClick={onChunkClick ? () => onChunkClick(chunk) : undefined}
            showChunkNumbers={showChunkNumbers}
            highlights={highlights}
            onCreateHighlight={
              onCreateHighlight
                ? (range, text, contextBefore, contextAfter, color) =>
                    onCreateHighlight(
                      chunk.chunkIndex,
                      range,
                      text,
                      contextBefore,
                      contextAfter,
                      color
                    )
                : undefined
            }
            onHighlightClick={onHighlightClick}
            searchMatches={searchMatches}
            currentSearchIndex={currentSearchIndex}
            isBookmarked={isBookmarked}
          />
        )
      })}
    </div>
  )
}
