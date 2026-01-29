import { AnimatePresence, motion } from 'framer-motion'
import type { RelatedChunk } from '../../api/client'
import type { Annotation, Highlight, HighlightColor } from '../../contexts/AnnotationsContext'
import type { PinnedLink } from '../../contexts/LinksContext'
import { Spinner } from '../ui'
import { AnnotationNote } from './AnnotationNote'
import { MarginNote } from './MarginNote'

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
}

/**
 * Container for margin notes showing related chunk suggestions and annotation notes
 * Updates dynamically based on active/visible chunks
 */
export function DynamicMargin({
  relatedChunks,
  isLoading,
  activeChunkIndex,
  currentFilePath,
  onNavigateToChunk,
  onOpenSplit,
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
}: DynamicMarginProps) {
  // Filter out low-relevance suggestions (score >= 0.7)
  const visibleChunks = relatedChunks.filter((chunk) => chunk.score < 0.7)

  const hasNotes = highlights.length > 0
  const hasLinks = backlinks.length > 0 || outgoingLinks.length > 0

  // Sort links: same document first, labeled before unlabeled, most recent as tie-breaker
  const sortedBacklinks = [...backlinks].sort((a, b) => {
    // Same document first
    const aIsSameDoc = a.sourceKey.filePath === currentFilePath
    const bIsSameDoc = b.sourceKey.filePath === currentFilePath
    if (aIsSameDoc !== bIsSameDoc) return aIsSameDoc ? -1 : 1
    // Labeled before unlabeled
    const aHasLabel = !!a.label
    const bHasLabel = !!b.label
    if (aHasLabel !== bHasLabel) return aHasLabel ? -1 : 1
    // Most recent first
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const sortedOutgoing = [...outgoingLinks].sort((a, b) => {
    // Same document first
    const aIsSameDoc = a.targetKey.filePath === currentFilePath
    const bIsSameDoc = b.targetKey.filePath === currentFilePath
    if (aIsSameDoc !== bIsSameDoc) return aIsSameDoc ? -1 : 1
    // Labeled before unlabeled
    const aHasLabel = !!a.label
    const bHasLabel = !!b.label
    if (aHasLabel !== bHasLabel) return aHasLabel ? -1 : 1
    // Most recent first
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Margin
          {activeChunkIndex !== null && (
            <span className="ml-2 text-gray-500 dark:text-gray-400">
              (#{activeChunkIndex})
            </span>
          )}
        </h3>
        {isLoading && <Spinner className="w-4 h-4 text-gray-400" />}
      </div>

      {/* Content - two sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Notes Section */}
        {hasNotes && (
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800/50">
              <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                <NoteIcon className="w-3.5 h-3.5" />
                Notes
                <span className="text-gray-400 dark:text-gray-500">({highlights.length})</span>
              </h4>
            </div>
            <div className="p-3 space-y-3">
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

        {/* Links Section (Phase 6) */}
        {hasLinks && (
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800/50">
              <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                <LinkIcon className="w-3.5 h-3.5" />
                Links
                <span className="text-gray-400 dark:text-gray-500">
                  ({backlinks.length + outgoingLinks.length})
                </span>
              </h4>
            </div>
            <div className="p-3 space-y-3">
              {/* Backlinks - Links to here */}
              {sortedBacklinks.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                    <IncomingIcon className="w-3 h-3" />
                    To here ({sortedBacklinks.length})
                  </h5>
                  <div className="space-y-2">
                    {sortedBacklinks.map((link) => (
                      <LinkItem
                        key={link.id}
                        link={link}
                        direction="incoming"
                        onNavigate={() =>
                          onNavigateToChunk(link.sourceKey.filePath, link.sourceKey.chunkIndex)
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Outgoing links - Links from here */}
              {sortedOutgoing.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                    <OutgoingIcon className="w-3 h-3" />
                    From here ({sortedOutgoing.length})
                  </h5>
                  <div className="space-y-2">
                    {sortedOutgoing.map((link) => (
                      <LinkItem
                        key={link.id}
                        link={link}
                        direction="outgoing"
                        onNavigate={() =>
                          onNavigateToChunk(link.targetKey.filePath, link.targetKey.chunkIndex)
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Connections Section */}
        <div>
          <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800/50">
            <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <ConnectionIcon className="w-3.5 h-3.5" />
              Related Content
              {visibleChunks.length > 0 && (
                <span className="text-gray-400 dark:text-gray-500">({visibleChunks.length})</span>
              )}
            </h4>
          </div>
          <div className="p-3 space-y-3">
            <AnimatePresence mode="popLayout">
              {visibleChunks.length === 0 && !isLoading ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-6 text-gray-500 dark:text-gray-400"
                >
                  <EmptyMarginIcon />
                  <p className="mt-2 text-sm">
                    {activeChunkIndex !== null
                      ? 'No related content found'
                      : 'Scroll to see related content'}
                  </p>
                </motion.div>
              ) : (
                visibleChunks.map((chunk) => {
                  const chunkKey = `${chunk.filePath}:${chunk.chunkIndex}`
                  const isPinned = pinnedChunkKeys?.has(chunkKey) ?? false

                  return (
                    <MarginNote
                      key={chunkKey}
                      chunk={chunk}
                      isPinned={isPinned}
                      onNavigate={() => onNavigateToChunk(chunk.filePath, chunk.chunkIndex)}
                      onOpenSplit={
                        onOpenSplit
                          ? () => onOpenSplit(chunk.filePath, chunk.chunkIndex)
                          : undefined
                      }
                      onTogglePin={
                        onTogglePin
                          ? () => onTogglePin(chunk.filePath, chunk.chunkIndex)
                          : undefined
                      }
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

function EmptyMarginIcon() {
  return (
    <svg
      className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  )
}

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

function LinkIcon({ className }: { className?: string }) {
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

interface LinkItemProps {
  link: PinnedLink
  direction: 'incoming' | 'outgoing'
  onNavigate: () => void
}

function LinkItem({ link, direction, onNavigate }: LinkItemProps) {
  const displayFilePath = direction === 'incoming'
    ? formatPath(link.sourceKey.filePath)
    : formatPath(link.targetKey.filePath)
  const chunkIndex = direction === 'incoming'
    ? link.sourceKey.chunkIndex
    : link.targetKey.chunkIndex
  const preview = direction === 'incoming'
    ? link.sourceText
    : link.targetText

  return (
    <motion.button
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      type="button"
      onClick={onNavigate}
      className="w-full text-left p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
          {displayFilePath}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          #{chunkIndex}
        </span>
        {link.label && (
          <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded">
            {link.label}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
        {preview.slice(0, 100) || 'No preview available'}
      </p>
    </motion.button>
  )
}

function formatPath(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}
