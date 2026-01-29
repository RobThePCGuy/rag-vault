import { AnimatePresence } from 'framer-motion'
import type { RelatedChunk, SearchResult } from '../../api/client'
import type { Annotation, Highlight, HighlightColor } from '../../contexts/AnnotationsContext'
import type { PinnedLink } from '../../contexts/LinksContext'
import { Spinner } from '../ui'
import { AnnotationNote } from './AnnotationNote'
import type { SelectionAction } from './SelectionPopover'
import {
  ZettelSlip,
  ZettelEmptyState,
  ZettelSectionHeader,
  ZettelLoadingSlip,
} from './ZettelSlip'

/**
 * X-Ray Vision: Selection search result with context
 */
export interface SelectionSearchResultDisplay {
  action: SelectionAction
  query: string
  results: SearchResult[]
  selectionContext: {
    text: string
    filePath: string
    chunkIndex: number
  }
}

interface DynamicMarginProps {
  relatedChunks: RelatedChunk[]
  isLoading: boolean
  activeChunkIndex: number | null
  currentFilePath?: string
  onNavigateToChunk: (filePath: string, chunkIndex: number) => void
  onOpenSplit?: (filePath: string, chunkIndex: number) => void
  pinnedChunkKeys?: Set<string>
  onTogglePin?: (filePath: string, chunkIndex: number) => void
  // Annotations props (optional - for Phase 5)
  highlights?: Highlight[]
  annotations?: Map<string, Annotation>
  onUpdateNote?: (highlightId: string, note: string) => void
  onDeleteNote?: (annotationId: string) => void
  onDeleteHighlight?: (highlightId: string) => void
  onChangeHighlightColor?: (highlightId: string, color: HighlightColor) => void
  // Links props (Phase 6)
  backlinks?: PinnedLink[]
  outgoingLinks?: PinnedLink[]
  // X-Ray Vision: Selection search results (legacy)
  selectionSearchResults?: SelectionSearchResultDisplay | null
  isSelectionSearchLoading?: boolean
  onClearSelectionSearch?: () => void
  // Auto-selection search (new Zettelkasten style)
  autoSelectionResults?: SearchResult[]
  isAutoSearching?: boolean
  selectionText?: string | null
}

/**
 * Zettelkasten-style margin for showing connections
 * Paper slips with warm colors, subtle shadows, and bidirectional breadcrumbs
 */
export function DynamicMargin({
  relatedChunks,
  isLoading,
  activeChunkIndex,
  currentFilePath,
  onNavigateToChunk,
  pinnedChunkKeys,
  onTogglePin,
  highlights = [],
  annotations = new Map(),
  onUpdateNote,
  onDeleteNote,
  onDeleteHighlight,
  onChangeHighlightColor,
  backlinks = [],
  outgoingLinks = [],
  selectionSearchResults,
  isSelectionSearchLoading = false,
  onClearSelectionSearch,
  autoSelectionResults = [],
  isAutoSearching = false,
  selectionText = null,
}: DynamicMarginProps) {
  // Filter out low-relevance suggestions (score >= 0.7)
  const visibleChunks = relatedChunks.filter((chunk) => chunk.score < 0.7)

  const hasNotes = highlights.length > 0
  const hasBacklinks = backlinks.length > 0
  const hasForwardLinks = outgoingLinks.length > 0
  const hasAutoResults = autoSelectionResults.length > 0 || isAutoSearching
  const hasLegacyResults = selectionSearchResults || isSelectionSearchLoading

  // Sort links: same document first, labeled before unlabeled, most recent as tie-breaker
  const sortedBacklinks = [...backlinks].sort((a, b) => {
    const aIsSameDoc = a.sourceKey.filePath === currentFilePath
    const bIsSameDoc = b.sourceKey.filePath === currentFilePath
    if (aIsSameDoc !== bIsSameDoc) return aIsSameDoc ? -1 : 1
    const aHasLabel = !!a.label
    const bHasLabel = !!b.label
    if (aHasLabel !== bHasLabel) return aHasLabel ? -1 : 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const sortedOutgoing = [...outgoingLinks].sort((a, b) => {
    const aIsSameDoc = a.targetKey.filePath === currentFilePath
    const bIsSameDoc = b.targetKey.filePath === currentFilePath
    if (aIsSameDoc !== bIsSameDoc) return aIsSameDoc ? -1 : 1
    const aHasLabel = !!a.label
    const bHasLabel = !!b.label
    if (aHasLabel !== bHasLabel) return aHasLabel ? -1 : 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="h-full flex flex-col zettel-margin">
      {/* Header */}
      <div className="zettel-header flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 font-serif">
          Connections
          {activeChunkIndex !== null && (
            <span className="ml-2 text-stone-400 dark:text-stone-500 font-mono text-xs">
              #{activeChunkIndex}
            </span>
          )}
        </h3>
        {isLoading && <Spinner className="w-4 h-4 text-stone-400" />}
      </div>

      {/* Content - Zettelkasten card stacks */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Notes Section - Keep existing style for now */}
        {hasNotes && (
          <div className="border-b border-stone-200/50 dark:border-stone-700/50 pb-4">
            <ZettelSectionHeader
              title="Notes"
              count={highlights.length}
              icon={<NoteIcon className="w-3.5 h-3.5" />}
            />
            <div className="space-y-3 mt-2">
              <AnimatePresence mode="popLayout">
                {highlights.map((highlight) => (
                  <AnnotationNote
                    key={highlight.id}
                    highlight={highlight}
                    annotation={annotations.get(highlight.id)}
                    onUpdateNote={(note) => onUpdateNote?.(highlight.id, note)}
                    onDeleteNote={() => {
                      const annotation = annotations.get(highlight.id)
                      if (annotation) {
                        onDeleteNote?.(annotation.id)
                      }
                    }}
                    onDeleteHighlight={() => onDeleteHighlight?.(highlight.id)}
                    onChangeColor={(color) => onChangeHighlightColor?.(highlight.id, color)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Auto-Selection Results - Zettelkasten style */}
        {hasAutoResults && (
          <div className="border-b border-stone-200/50 dark:border-stone-700/50 pb-4">
            <div className="flex items-center justify-between mb-2">
              <ZettelSectionHeader
                title="From Selection"
                count={autoSelectionResults.length}
                icon={<SelectionIcon className="w-3.5 h-3.5" />}
              />
              {selectionText && (
                <span className="zettel-selection-pill truncate max-w-[150px]" title={selectionText}>
                  "{selectionText.slice(0, 30)}{selectionText.length > 30 ? '...' : ''}"
                </span>
              )}
            </div>

            <div className="space-y-2 mt-2">
              {isAutoSearching ? (
                <div className="zettel-searching">
                  <Spinner className="w-4 h-4 text-violet-500" />
                  <span className="text-xs text-violet-600 dark:text-violet-400 font-serif italic">
                    Finding connections...
                  </span>
                </div>
              ) : autoSelectionResults.length === 0 ? (
                <p className="text-xs text-stone-500 dark:text-stone-400 italic font-serif py-2">
                  No related content found
                </p>
              ) : (
                <AnimatePresence mode="popLayout">
                  {autoSelectionResults.map((result, idx) => (
                    <ZettelSlip
                      key={`${result.filePath}:${result.chunkIndex}`}
                      filePath={result.filePath}
                      chunkIndex={result.chunkIndex}
                      previewText={result.text}
                      type="semantic"
                      score={result.score}
                      onNavigate={() => onNavigateToChunk(result.filePath, result.chunkIndex)}
                      onPin={onTogglePin ? () => onTogglePin(result.filePath, result.chunkIndex) : undefined}
                      isPinned={pinnedChunkKeys?.has(`${result.filePath}:${result.chunkIndex}`) ?? false}
                      animationIndex={idx}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        )}

        {/* Legacy X-Ray Vision Results (keep for backwards compatibility) */}
        {hasLegacyResults && !hasAutoResults && (
          <div className="border-b border-stone-200/50 dark:border-stone-700/50 pb-4">
            <div className="flex items-center justify-between mb-2">
              <ZettelSectionHeader
                title={selectionSearchResults ? getActionLabel(selectionSearchResults.action) : 'Searching...'}
                count={selectionSearchResults?.results.length}
                icon={<SearchIcon className="w-3.5 h-3.5" />}
              />
              {onClearSelectionSearch && (
                <button
                  type="button"
                  onClick={onClearSelectionSearch}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
                  title="Close"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-2 mt-2">
              {isSelectionSearchLoading ? (
                <ZettelLoadingSlip />
              ) : selectionSearchResults?.results.length === 0 ? (
                <ZettelEmptyState message="No results found" />
              ) : (
                <AnimatePresence mode="popLayout">
                  {selectionSearchResults?.results.map((result, idx) => (
                    <ZettelSlip
                      key={`${result.filePath}:${result.chunkIndex}`}
                      filePath={result.filePath}
                      chunkIndex={result.chunkIndex}
                      previewText={result.text}
                      type="semantic"
                      score={result.score}
                      onNavigate={() => onNavigateToChunk(result.filePath, result.chunkIndex)}
                      onPin={onTogglePin ? () => onTogglePin(result.filePath, result.chunkIndex) : undefined}
                      isPinned={pinnedChunkKeys?.has(`${result.filePath}:${result.chunkIndex}`) ?? false}
                      animationIndex={idx}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        )}

        {/* Backlinks Section - "Links Here" */}
        {hasBacklinks && (
          <div className="border-b border-stone-200/50 dark:border-stone-700/50 pb-4">
            <ZettelSectionHeader
              title="Links Here"
              count={sortedBacklinks.length}
              icon={<IncomingIcon className="w-3.5 h-3.5" />}
            />
            <div className="space-y-2 mt-2">
              <AnimatePresence mode="popLayout">
                {sortedBacklinks.map((link, idx) => (
                  <ZettelSlip
                    key={link.id}
                    filePath={link.sourceKey.filePath}
                    chunkIndex={link.sourceKey.chunkIndex}
                    previewText={link.sourceText || 'No preview available'}
                    type="backlink"
                    sharedKeywords={link.label ? [link.label] : undefined}
                    onNavigate={() =>
                      onNavigateToChunk(link.sourceKey.filePath, link.sourceKey.chunkIndex)
                    }
                    animationIndex={idx}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Forward Links Section - "Links From" */}
        {hasForwardLinks && (
          <div className="border-b border-stone-200/50 dark:border-stone-700/50 pb-4">
            <ZettelSectionHeader
              title="Links From"
              count={sortedOutgoing.length}
              icon={<OutgoingIcon className="w-3.5 h-3.5" />}
            />
            <div className="space-y-2 mt-2">
              <AnimatePresence mode="popLayout">
                {sortedOutgoing.map((link, idx) => (
                  <ZettelSlip
                    key={link.id}
                    filePath={link.targetKey.filePath}
                    chunkIndex={link.targetKey.chunkIndex}
                    previewText={link.targetText || 'No preview available'}
                    type="forward"
                    sharedKeywords={link.label ? [link.label] : undefined}
                    onNavigate={() =>
                      onNavigateToChunk(link.targetKey.filePath, link.targetKey.chunkIndex)
                    }
                    animationIndex={idx}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Suggested Connections Section */}
        <div>
          <ZettelSectionHeader
            title="Suggested"
            count={visibleChunks.length}
            icon={<ConnectionIcon className="w-3.5 h-3.5" />}
          />
          <div className="space-y-2 mt-2">
            <AnimatePresence mode="popLayout">
              {visibleChunks.length === 0 && !isLoading ? (
                <ZettelEmptyState
                  message={
                    activeChunkIndex !== null
                      ? 'No related content found'
                      : 'Scroll to see related content'
                  }
                />
              ) : isLoading && visibleChunks.length === 0 ? (
                <>
                  <ZettelLoadingSlip />
                  <ZettelLoadingSlip />
                </>
              ) : (
                visibleChunks.map((chunk, idx) => {
                  const chunkKey = `${chunk.filePath}:${chunk.chunkIndex}`
                  const isPinned = pinnedChunkKeys?.has(chunkKey) ?? false

                  return (
                    <ZettelSlip
                      key={chunkKey}
                      filePath={chunk.filePath}
                      chunkIndex={chunk.chunkIndex}
                      previewText={chunk.text}
                      type="semantic"
                      score={chunk.score}
                      sharedKeywords={chunk.explanation?.sharedKeywords}
                      onNavigate={() => onNavigateToChunk(chunk.filePath, chunk.chunkIndex)}
                      onPin={onTogglePin ? () => onTogglePin(chunk.filePath, chunk.chunkIndex) : undefined}
                      isPinned={isPinned}
                      animationIndex={idx}
                    />
                  )
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Icons
// ============================================

function NoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
      />
    </svg>
  )
}

function ConnectionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  )
}

function IncomingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
      />
    </svg>
  )
}

function OutgoingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 5l7 7-7 7M5 5l7 7-7 7"
      />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  )
}

function SelectionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 9l4-4 4 4m0 6l-4 4-4-4"
      />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function getActionLabel(action: SelectionAction): string {
  switch (action) {
    case 'related':
      return 'Related'
    case 'support':
      return 'Supporting'
    case 'contradict':
      return 'Contradicting'
    case 'compare':
      return 'Compare'
    case 'pin':
      return 'Pinned'
    default:
      return 'Results'
  }
}
