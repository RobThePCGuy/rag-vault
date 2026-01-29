import { motion } from 'framer-motion'
import { useDocumentChunks } from '../../hooks'
import { Spinner } from '../ui'
import { DocumentRenderer } from './DocumentRenderer'

interface SplitPortalProps {
  filePath: string
  chunkIndex: number
  onClose: () => void
  onNavigate: (filePath: string, chunkIndex: number) => void
}

/**
 * Split view portal showing a related document alongside the main document
 * Allows side-by-side reading and navigation to the target document
 */
export function SplitPortal({ filePath, chunkIndex, onClose, onNavigate }: SplitPortalProps) {
  const { chunks, isLoading, error } = useDocumentChunks(filePath)

  const displaySource = formatPath(filePath)

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
            title={filePath}
          >
            {displaySource}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {chunks.length} chunks &middot; Viewing #{chunkIndex}
          </p>
        </div>

        <div className="flex items-center gap-2 ml-4">
          {/* Open in main view */}
          <button
            type="button"
            onClick={() => onNavigate(filePath, chunkIndex)}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          >
            Open Full
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close split view"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Spinner className="w-6 h-6 text-gray-400" />
            <span className="ml-2 text-gray-500 dark:text-gray-400">Loading document...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            <p className="font-medium">Error loading document</p>
            <p className="text-sm mt-1">{error.message}</p>
          </div>
        ) : (
          <DocumentRenderer
            chunks={chunks}
            activeChunkIndex={chunkIndex}
            onRegisterChunk={() => {}} // No viewport tracking in split view
            scrollToChunk={chunkIndex}
          />
        )}
      </div>
    </motion.div>
  )
}

function formatPath(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
