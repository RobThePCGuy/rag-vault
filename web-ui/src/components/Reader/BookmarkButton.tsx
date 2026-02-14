import { motion } from 'framer-motion'

interface BookmarkButtonProps {
  isBookmarked: boolean
  onClick: () => void
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Bookmark toggle button with fill animation
 * No layout jitter - uses same dimensions for both states
 */
export function BookmarkButton({
  isBookmarked,
  onClick,
  size = 'md',
  className = '',
}: BookmarkButtonProps) {
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  const buttonPadding = size === 'sm' ? 'p-1' : 'p-1.5'

  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`
        ${buttonPadding}
        rounded
        transition-colors
        ${className}
      `}
      style={isBookmarked ? { color: 'var(--ws-accent)' } : { color: 'var(--ws-text-muted)' }}
      title={isBookmarked ? 'Remove bookmark (b)' : 'Add bookmark (b)'}
      whileTap={{ scale: 0.9 }}
    >
      {isBookmarked ? (
        <BookmarkFilledIcon className={iconSize} />
      ) : (
        <BookmarkOutlineIcon className={iconSize} />
      )}
    </motion.button>
  )
}

function BookmarkFilledIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
    </svg>
  )
}

function BookmarkOutlineIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 20 20"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"
      />
    </svg>
  )
}
