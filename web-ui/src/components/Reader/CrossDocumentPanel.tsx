import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import type { RelatedChunk } from '../../api/client'
import { useCrossDocumentRelated, type CrossDocumentGroup } from '../../hooks/useCrossDocumentRelated'

// ============================================
// Types
// ============================================

interface CrossDocumentPanelProps {
  isOpen: boolean
  onClose: () => void
  currentFilePath: string
  relatedChunks: RelatedChunk[]
  onNavigate: (filePath: string, chunkIndex: number) => void
  onOpenSplit: (filePath: string, chunkIndex: number) => void
  onCompare: (filePath: string, chunkIndex: number) => void
}

// ============================================
// Component
// ============================================

/**
 * Full panel for exploring related content across all documents
 */
export function CrossDocumentPanel({
  isOpen,
  onClose,
  currentFilePath,
  relatedChunks,
  onNavigate,
  onOpenSplit,
  onCompare,
}: CrossDocumentPanelProps) {
  const [scoreThreshold, setScoreThreshold] = useState(0.5)
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set())

  const { groups, totalChunks, documentCount } = useCrossDocumentRelated({
    currentFilePath,
    relatedChunks,
    maxScore: scoreThreshold,
  })

  const toggleDoc = (filePath: string) => {
    setExpandedDocs((prev) => {
      const next = new Set(prev)
      if (next.has(filePath)) {
        next.delete(filePath)
      } else {
        next.add(filePath)
      }
      return next
    })
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
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-[480px] max-w-full bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <CrossDocIcon className="w-5 h-5 text-blue-500" />
                Cross-Document
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({totalChunks} chunks in {documentCount} docs)
                </span>
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Score filter */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <label className="block">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Similarity threshold: {Math.round((1 - scoreThreshold) * 100)}%+
                </span>
                <input
                  type="range"
                  min="0.3"
                  max="0.7"
                  step="0.05"
                  value={scoreThreshold}
                  onChange={(e) => setScoreThreshold(parseFloat(e.target.value))}
                  className="w-full mt-1"
                />
                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                  <span>Very similar (70%+)</span>
                  <span>Somewhat similar (30%+)</span>
                </div>
              </label>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {groups.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <CrossDocIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No cross-document matches</p>
                  <p className="text-xs mt-1">Try lowering the similarity threshold</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.map((group) => (
                    <DocumentGroup
                      key={group.filePath}
                      group={group}
                      isExpanded={expandedDocs.has(group.filePath)}
                      onToggle={() => toggleDoc(group.filePath)}
                      onNavigate={onNavigate}
                      onOpenSplit={onOpenSplit}
                      onCompare={onCompare}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ============================================
// Document Group
// ============================================

interface DocumentGroupProps {
  group: CrossDocumentGroup
  isExpanded: boolean
  onToggle: () => void
  onNavigate: (filePath: string, chunkIndex: number) => void
  onOpenSplit: (filePath: string, chunkIndex: number) => void
  onCompare: (filePath: string, chunkIndex: number) => void
}

function DocumentGroup({
  group,
  isExpanded,
  onToggle,
  onNavigate,
  onOpenSplit,
  onCompare,
}: DocumentGroupProps) {
  const avgSimilarity = Math.round((1 - group.avgScore) * 100)

  return (
    <div className="bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronIcon className="w-4 h-4 text-gray-400" />
        </motion.div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {group.fileName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {group.chunks.length} related chunks
          </p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded ${
            avgSimilarity >= 60
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : avgSimilarity >= 40
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          ~{avgSimilarity}% avg
        </span>
      </button>

      {/* Expanded chunks */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">
              {group.chunks.map((chunk) => (
                <ChunkItem
                  key={`${chunk.filePath}:${chunk.chunkIndex}`}
                  chunk={chunk}
                  onNavigate={() => onNavigate(chunk.filePath, chunk.chunkIndex)}
                  onOpenSplit={() => onOpenSplit(chunk.filePath, chunk.chunkIndex)}
                  onCompare={() => onCompare(chunk.filePath, chunk.chunkIndex)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================
// Chunk Item
// ============================================

interface ChunkItemProps {
  chunk: RelatedChunk
  onNavigate: () => void
  onOpenSplit: () => void
  onCompare: () => void
}

function ChunkItem({ chunk, onNavigate, onOpenSplit, onCompare }: ChunkItemProps) {
  const similarity = Math.round((1 - chunk.score) * 100)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">#{chunk.chunkIndex}</span>
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${
            similarity >= 60
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          {similarity}% similar
        </span>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
        {chunk.text.slice(0, 200)}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onNavigate}
          className="flex-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
        >
          Navigate
        </button>
        <button
          type="button"
          onClick={onOpenSplit}
          className="flex-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          Split View
        </button>
        <button
          type="button"
          onClick={onCompare}
          className="flex-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          Compare
        </button>
      </div>
    </div>
  )
}

// ============================================
// Icons
// ============================================

function CrossDocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
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

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}
