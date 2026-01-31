import { AnimatePresence, motion } from 'framer-motion'
import { useCallback } from 'react'
import type { TocEntry } from '../../hooks/useTableOfContents'

interface TableOfContentsProps {
  entries: TocEntry[]
  activeChunkIndex: number | null
  onNavigateToChunk: (chunkIndex: number) => void
  isOpen: boolean
  onToggle: () => void
  isFallback?: boolean
}

/**
 * Collapsible Table of Contents sidebar
 * Shows detected headings or fallback section markers
 */
export function TableOfContents({
  entries,
  activeChunkIndex,
  onNavigateToChunk,
  isOpen,
  onToggle,
  isFallback = false,
}: TableOfContentsProps) {
  // Find the current entry based on active chunk
  const currentEntryIndex = entries.findIndex((entry, i) => {
    const nextEntry = entries[i + 1]
    if (!nextEntry) {
      return entry.chunkIndex <= (activeChunkIndex ?? 0)
    }
    return (
      entry.chunkIndex <= (activeChunkIndex ?? 0) && nextEntry.chunkIndex > (activeChunkIndex ?? 0)
    )
  })

  const handleEntryClick = useCallback(
    (entry: TocEntry) => {
      onNavigateToChunk(entry.chunkIndex)
    },
    [onNavigateToChunk]
  )

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title={isOpen ? 'Hide table of contents' : 'Show table of contents'}
      >
        <TocIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Contents</span>
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronIcon className="w-3 h-3" />
        </motion.span>
      </button>

      {/* Sidebar panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed left-0 top-16 bottom-0 z-40 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden"
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Table of Contents
                </h3>
                {isFallback && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">(auto)</span>
                )}
              </div>

              {/* Entries */}
              <div className="flex-1 overflow-y-auto py-2">
                {entries.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <p className="text-sm">No headings detected</p>
                  </div>
                ) : (
                  <nav className="space-y-0.5">
                    {entries.map((entry, index) => (
                      <TocEntryItem
                        key={entry.id}
                        entry={entry}
                        isCurrent={index === currentEntryIndex}
                        onClick={() => handleEntryClick(entry)}
                      />
                    ))}
                  </nav>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

interface TocEntryItemProps {
  entry: TocEntry
  isCurrent: boolean
  onClick: () => void
}

function TocEntryItem({ entry, isCurrent, onClick }: TocEntryItemProps) {
  // Calculate indent based on level
  const paddingLeft = 16 + (entry.level - 1) * 12

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full text-left px-4 py-1.5 text-sm transition-colors
        ${
          isCurrent
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium border-l-2 border-blue-500'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-l-2 border-transparent'
        }
      `}
      style={{ paddingLeft }}
    >
      <span className="line-clamp-2">{entry.text}</span>
      {entry.type === 'allcaps' && (
        <span className="ml-1 text-xs text-gray-400">{entry.chunkIndex}</span>
      )}
    </button>
  )
}

function TocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 10h16M4 14h16M4 18h16"
      />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}
