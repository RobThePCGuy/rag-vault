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
      className="h-full flex flex-col border-l"
      style={{ background: 'var(--ws-surface-raised)', borderColor: 'var(--ws-border)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--ws-border)', background: 'var(--ws-surface-1)' }}
      >
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-medium truncate"
            style={{ color: 'var(--ws-text)' }}
            title={filePath}
          >
            {displaySource}
          </h3>
          <p className="text-xs" style={{ color: 'var(--ws-text-muted)' }}>
            {chunks.length} chunks &middot; Viewing #{chunkIndex}
          </p>
        </div>

        <div className="flex items-center gap-2 ml-4">
          {/* Open in main view */}
          <button
            type="button"
            onClick={() => onNavigate(filePath, chunkIndex)}
            className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
            style={{ color: 'var(--ws-accent)' }}
          >
            Open Full
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--ws-text-muted)' }}
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
            <Spinner className="w-6 h-6" style={{ color: 'var(--ws-text-muted)' }} />
            <span className="ml-2" style={{ color: 'var(--ws-text-muted)' }}>
              Loading document...
            </span>
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
