import { AnimatePresence, motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import type { RelatedChunk } from '../../api/client'
import type { ComparisonChunk } from '../../hooks/useChunkComparison'

// ============================================
// Types
// ============================================

interface ComparisonChunkPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelectChunk: (chunk: ComparisonChunk) => void
  relatedChunks: RelatedChunk[]
  allChunks: Array<{ text: string; chunkIndex?: number }>
  currentFilePath: string
  excludeChunkKey?: { filePath: string; chunkIndex: number }
}

// ============================================
// Component
// ============================================

/**
 * Modal for picking a chunk to compare against
 * Shows related chunks first, then allows searching all chunks
 */
export function ComparisonChunkPicker({
  isOpen,
  onClose,
  onSelectChunk,
  relatedChunks,
  allChunks,
  currentFilePath,
  excludeChunkKey,
}: ComparisonChunkPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showAllChunks, setShowAllChunks] = useState(false)

  // Filter related chunks (exclude current)
  const filteredRelated = useMemo(() => {
    return relatedChunks.filter((chunk) => {
      if (
        excludeChunkKey &&
        chunk.filePath === excludeChunkKey.filePath &&
        chunk.chunkIndex === excludeChunkKey.chunkIndex
      ) {
        return false
      }
      return true
    })
  }, [relatedChunks, excludeChunkKey])

  // Search in all chunks
  const searchedChunks = useMemo(() => {
    if (!searchQuery.trim()) return []
    const query = searchQuery.toLowerCase()
    return allChunks
      .map((chunk, index) => ({
        text: chunk.text,
        chunkIndex: chunk.chunkIndex ?? index,
        filePath: currentFilePath,
      }))
      .filter((chunk) => {
        // Exclude current chunk
        if (
          excludeChunkKey &&
          chunk.filePath === excludeChunkKey.filePath &&
          chunk.chunkIndex === excludeChunkKey.chunkIndex
        ) {
          return false
        }
        return chunk.text.toLowerCase().includes(query)
      })
      .slice(0, 20) // Limit results
  }, [allChunks, searchQuery, currentFilePath, excludeChunkKey])

  const handleSelect = (chunk: { filePath: string; chunkIndex: number; text: string }) => {
    onSelectChunk({
      filePath: chunk.filePath,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
    })
    onClose()
    setSearchQuery('')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] md:max-h-[80vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Select chunk to compare
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chunks by content..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Search results */}
              {searchQuery.trim() && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    Search Results ({searchedChunks.length})
                  </h3>
                  {searchedChunks.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No chunks found matching "{searchQuery}"
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {searchedChunks.map((chunk) => (
                        <ChunkOption
                          key={`${chunk.filePath}:${chunk.chunkIndex}`}
                          chunk={chunk}
                          onSelect={() => handleSelect(chunk)}
                          searchQuery={searchQuery}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Related chunks */}
              {!searchQuery.trim() && (
                <>
                  {filteredRelated.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <ConnectionIcon className="w-3.5 h-3.5" />
                        Related Chunks ({filteredRelated.length})
                      </h3>
                      <div className="space-y-2">
                        {filteredRelated.map((chunk) => (
                          <ChunkOption
                            key={`${chunk.filePath}:${chunk.chunkIndex}`}
                            chunk={chunk}
                            score={chunk.score}
                            onSelect={() => handleSelect(chunk)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Toggle to show all chunks */}
                  {!showAllChunks ? (
                    <button
                      type="button"
                      onClick={() => setShowAllChunks(true)}
                      className="w-full py-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      Show all document chunks
                    </button>
                  ) : (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <ChunkIcon className="w-3.5 h-3.5" />
                        All Chunks ({allChunks.length})
                      </h3>
                      <div className="space-y-2">
                        {allChunks.map((chunk, index) => {
                          const chunkIndex = chunk.chunkIndex ?? index
                          // Skip excluded chunk
                          if (
                            excludeChunkKey &&
                            currentFilePath === excludeChunkKey.filePath &&
                            chunkIndex === excludeChunkKey.chunkIndex
                          ) {
                            return null
                          }
                          return (
                            <ChunkOption
                              key={chunkIndex}
                              chunk={{
                                filePath: currentFilePath,
                                chunkIndex,
                                text: chunk.text,
                              }}
                              onSelect={() =>
                                handleSelect({
                                  filePath: currentFilePath,
                                  chunkIndex,
                                  text: chunk.text,
                                })
                              }
                            />
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ============================================
// Chunk Option
// ============================================

interface ChunkOptionProps {
  chunk: { filePath: string; chunkIndex: number; text: string }
  score?: number
  onSelect: () => void
  searchQuery?: string
}

function ChunkOption({ chunk, score, onSelect, searchQuery }: ChunkOptionProps) {
  const preview = chunk.text.slice(0, 150)
  const fileName = formatPath(chunk.filePath)

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left p-3 rounded-lg bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {fileName}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          #{chunk.chunkIndex}
        </span>
        {score !== undefined && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              score < 0.4
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
            }`}
          >
            {Math.round((1 - score) * 100)}% similar
          </span>
        )}
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
        {searchQuery ? (
          <HighlightedText text={preview} highlight={searchQuery} />
        ) : (
          preview
        )}
        {chunk.text.length > 150 && '...'}
      </p>
    </button>
  )
}

// ============================================
// Helpers
// ============================================

function formatPath(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>

  const regex = new RegExp(`(${escapeRegex(highlight)})`, 'gi')
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/40 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ============================================
// Icons
// ============================================

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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

function ChunkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  )
}
