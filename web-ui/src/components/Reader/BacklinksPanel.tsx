import { AnimatePresence, motion } from 'framer-motion'
import type { PinnedLink } from '../../contexts/LinksContext'

interface BacklinksPanelProps {
  backlinks: PinnedLink[]
  onNavigate: (filePath: string, chunkIndex: number) => void
  isExpanded?: boolean
  onToggleExpand?: () => void
}

/**
 * Panel showing "What links here" - backlinks to the current chunk
 * Displays all pinned links that point to the current chunk
 */
export function BacklinksPanel({
  backlinks,
  onNavigate,
  isExpanded = true,
  onToggleExpand,
}: BacklinksPanelProps) {
  if (backlinks.length === 0) {
    return null
  }

  return (
    <div className="border-t" style={{ borderColor: 'var(--ws-border)' }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => onToggleExpand?.()}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BacklinkIcon />
          <span className="text-sm font-medium" style={{ color: 'var(--ws-text-secondary)' }}>
            Backlinks
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ color: 'var(--ws-text-muted)', background: 'var(--ws-surface-1)' }}
          >
            {backlinks.length}
          </span>
        </div>
        <ChevronIcon isExpanded={isExpanded} />
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">
              {backlinks.map((link) => (
                <BacklinkItem
                  key={link.id}
                  link={link}
                  onNavigate={() => onNavigate(link.sourceKey.filePath, link.sourceKey.chunkIndex)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface BacklinkItemProps {
  link: PinnedLink
  onNavigate: () => void
}

function BacklinkItem({ link, onNavigate }: BacklinkItemProps) {
  const displaySource = formatPath(link.sourceKey.filePath)

  return (
    <button
      type="button"
      onClick={onNavigate}
      className="w-full text-left p-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs font-medium text-blue-700 dark:text-blue-400 truncate">
          {displaySource}
        </span>
        <span className="text-xs text-blue-500 dark:text-blue-400">
          #{link.sourceKey.chunkIndex}
        </span>
      </div>

      <p className="text-xs line-clamp-2" style={{ color: 'var(--ws-text-secondary)' }}>
        {link.sourceText}
      </p>

      {link.label && (
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">"{link.label}"</p>
      )}
    </button>
  )
}

function formatPath(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

function BacklinkIcon() {
  return (
    <svg
      className="w-4 h-4 text-blue-500 dark:text-blue-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  )
}

interface ChevronIconProps {
  isExpanded: boolean
}

function ChevronIcon({ isExpanded }: ChevronIconProps) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
      style={{ color: 'var(--ws-text-muted)' }}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}
