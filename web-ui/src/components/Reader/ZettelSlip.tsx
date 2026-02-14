import { motion } from 'framer-motion'

export type ZettelSlipType = 'backlink' | 'forward' | 'semantic'

export interface ZettelSlipProps {
  filePath: string
  chunkIndex: number
  previewText: string
  type: ZettelSlipType
  score?: number
  sharedKeywords?: string[]
  onNavigate: () => void
  onPin?: () => void
  isPinned?: boolean
  /** Custom index for stagger animations */
  animationIndex?: number
}

/**
 * Animation variants for slip appearance
 */
export const slipVariants = {
  hidden: { opacity: 0, y: -15, rotate: -3, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    rotate: -0.3,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.3, ease: 'easeOut' as const },
  }),
  exit: { opacity: 0, x: -20, transition: { duration: 0.15 } },
}

/**
 * Get the border color class based on slip type
 */
function getTypeBorderClass(type: ZettelSlipType): string {
  switch (type) {
    case 'backlink':
      return 'zettel-backlink'
    case 'forward':
      return 'zettel-forward'
    case 'semantic':
      return 'zettel-semantic'
  }
}

/**
 * Get type indicator for screen readers and tooltips
 */
function getTypeLabel(type: ZettelSlipType): string {
  switch (type) {
    case 'backlink':
      return 'Links here'
    case 'forward':
      return 'Links to'
    case 'semantic':
      return 'Related'
  }
}

/**
 * Format file path to just filename
 */
function formatPath(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

/**
 * Format score as percentage (inverted - lower distance = higher match)
 */
function formatScore(score: number): string {
  const percent = Math.round((1 - score) * 100)
  return `${percent}%`
}

/**
 * Zettelkasten-style paper slip for displaying related content
 * Warm paper aesthetic with subtle shadows and serif fonts
 */
export function ZettelSlip({
  filePath,
  chunkIndex,
  previewText,
  type,
  score,
  sharedKeywords = [],
  onNavigate,
  onPin,
  isPinned = false,
  animationIndex = 0,
}: ZettelSlipProps) {
  const displayName = formatPath(filePath)
  const typeLabel = getTypeLabel(type)
  const typeBorderClass = getTypeBorderClass(type)

  return (
    <motion.button
      type="button"
      onClick={onNavigate}
      custom={animationIndex}
      variants={slipVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`
        zettel-slip ${typeBorderClass}
        w-full text-left cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-600
        ${isPinned ? 'ring-2 ring-amber-500 dark:ring-amber-400' : ''}
      `}
    >
      {/* Header row: file + chunk + score */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <TypeIndicator type={type} />
          <span
            className="text-xs font-medium text-stone-600 dark:text-stone-400 truncate font-serif"
            title={filePath}
          >
            {displayName}
          </span>
          <span className="text-xs text-stone-400 dark:text-stone-500 font-mono">
            #{chunkIndex}
          </span>
        </div>
        {score !== undefined && (
          <span
            className="text-xs px-1.5 py-0.5 rounded bg-stone-200/50 dark:bg-stone-700/50 text-stone-600 dark:text-stone-400"
            title={`Similarity: ${formatScore(score)}`}
          >
            {formatScore(score)}
          </span>
        )}
      </div>

      {/* Preview text - serif font for that old book feel */}
      <p className="text-sm text-stone-700 dark:text-stone-300 line-clamp-3 font-serif leading-relaxed">
        {previewText.slice(0, 180)}
        {previewText.length > 180 && '...'}
      </p>

      {/* Shared keywords as small tags */}
      {sharedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {sharedKeywords.slice(0, 3).map((keyword) => (
            <span
              key={keyword}
              className="px-1.5 py-0.5 text-xs bg-amber-100/60 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded font-sans"
            >
              {keyword}
            </span>
          ))}
        </div>
      )}

      {/* Footer with type label and actions */}
      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-stone-200/50 dark:border-stone-700/50">
        <span className="text-xs text-stone-500 dark:text-stone-400 italic">{typeLabel}</span>
        <div className="flex items-center gap-1">
          {onPin && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                onPin()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation()
                  e.preventDefault()
                  onPin()
                }
              }}
              className={`
                p-1 rounded transition-colors
                ${
                  isPinned
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-stone-400 hover:text-amber-500 dark:text-stone-500 dark:hover:text-amber-400'
                }
              `}
              title={isPinned ? 'Unpin' : 'Pin'}
            >
              <PinIcon className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>
    </motion.button>
  )
}

/**
 * Small colored dot indicator for slip type
 */
function TypeIndicator({ type }: { type: ZettelSlipType }) {
  const colorClass = {
    backlink: 'bg-blue-500',
    forward: 'bg-emerald-500',
    semantic: 'bg-violet-500',
  }[type]

  return <span className={`w-2 h-2 rounded-full ${colorClass} flex-shrink-0`} aria-hidden="true" />
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 19V5z" />
    </svg>
  )
}

/**
 * Empty state for when no slips are available
 */
export function ZettelEmptyState({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-6 text-stone-500 dark:text-stone-400"
    >
      <EmptySlipIcon />
      <p className="mt-2 text-sm font-serif italic">{message}</p>
    </motion.div>
  )
}

function EmptySlipIcon() {
  return (
    <svg
      className="mx-auto h-10 w-10 text-stone-300 dark:text-stone-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      />
    </svg>
  )
}

/**
 * Section header for grouping slips
 */
export function ZettelSectionHeader({
  title,
  count,
  icon,
}: {
  title: string
  count?: number
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 px-1 py-2">
      {icon && <span className="text-stone-400 dark:text-stone-500">{icon}</span>}
      <h4 className="text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wide font-sans">
        {title}
      </h4>
      {count !== undefined && count > 0 && (
        <span className="text-xs text-stone-400 dark:text-stone-500">({count})</span>
      )}
    </div>
  )
}

/**
 * Loading state with paper slip skeleton
 */
export function ZettelLoadingSlip() {
  return (
    <div className="zettel-slip zettel-semantic animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-stone-600" />
        <div className="h-3 w-24 bg-stone-300 dark:bg-stone-600 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-stone-200 dark:bg-stone-700 rounded" />
        <div className="h-3 w-4/5 bg-stone-200 dark:bg-stone-700 rounded" />
        <div className="h-3 w-2/3 bg-stone-200 dark:bg-stone-700 rounded" />
      </div>
    </div>
  )
}
