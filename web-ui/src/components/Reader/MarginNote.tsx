import { motion } from 'framer-motion'
import type { RelatedChunk } from '../../api/client'

interface MarginNoteProps {
  chunk: RelatedChunk
  onNavigate: () => void
  onOpenSplit?: () => void
  isPinned?: boolean
  onTogglePin?: () => void
}

/**
 * Single margin note showing a related chunk suggestion
 * Displays preview text, score badge, and connection reason
 */
export function MarginNote({
  chunk,
  onNavigate,
  onOpenSplit,
  isPinned = false,
  onTogglePin,
}: MarginNoteProps) {
  const scoreColor = getScoreColor(chunk.score)
  const displaySource = chunk.source || formatPath(chunk.filePath)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`
        relative p-3 rounded-lg transition-all duration-200 cursor-pointer
        ${isPinned ? 'border-2 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500'}
      `}
    >
      {/* Header: source and score */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate flex-1"
          title={chunk.filePath}
        >
          {displaySource}
        </span>
        <span
          className={`px-1.5 py-0.5 text-xs font-medium rounded ${scoreColor}`}
          title={`Distance: ${chunk.score.toFixed(4)}`}
        >
          {formatScore(chunk.score)}
        </span>
      </div>

      {/* Preview text */}
      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 mb-2">
        {chunk.text.slice(0, 150)}
        {chunk.text.length > 150 && '...'}
      </p>

      {/* Connection reason */}
      {chunk.connectionReason && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-2">
          {chunk.connectionReason}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onNavigate()
          }}
          className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
        >
          Read
        </button>

        {onOpenSplit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpenSplit()
            }}
            className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            Split View
          </button>
        )}

        {onTogglePin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onTogglePin()
            }}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              isPinned
                ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={isPinned ? 'Unpin link' : 'Pin link'}
          >
            {isPinned ? 'Pinned' : 'Pin'}
          </button>
        )}
      </div>

      {/* Chunk index */}
      <span className="absolute top-2 right-2 text-xs text-gray-400 dark:text-gray-500">
        #{chunk.chunkIndex}
      </span>
    </motion.div>
  )
}

function formatPath(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

function formatScore(score: number): string {
  if (score < 0.3) return 'High'
  if (score < 0.5) return 'Good'
  if (score < 0.7) return 'Fair'
  return 'Low'
}

function getScoreColor(score: number): string {
  if (score < 0.3) return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
  if (score < 0.5) return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
  if (score < 0.7) return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
  return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
}
