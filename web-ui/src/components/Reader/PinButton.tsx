import { motion } from 'framer-motion'

interface PinButtonProps {
  isPinned: boolean
  onToggle: () => void
  size?: 'sm' | 'md'
}

/**
 * Toggle button for pinning/unpinning links
 * Shows different visual states for pinned vs unpinned
 */
export function PinButton({ isPinned, onToggle, size = 'sm' }: PinButtonProps) {
  const sizeClasses = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
  const buttonClasses =
    size === 'sm' ? 'p-1 rounded' : 'p-1.5 rounded-lg'

  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      whileTap={{ scale: 0.9 }}
      className={`
        ${buttonClasses}
        transition-colors
        ${
          isPinned
            ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60'
            : 'text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }
      `}
      title={isPinned ? 'Unpin link' : 'Pin link'}
    >
      <PinIcon className={sizeClasses} filled={isPinned} />
    </motion.button>
  )
}

interface PinIconProps {
  className?: string
  filled?: boolean
}

function PinIcon({ className = 'w-5 h-5', filled = false }: PinIconProps) {
  if (filled) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 2L8 2L7 4L9 6L9 12L5 14L5 16L11 16L11 22L13 22L13 16L19 16L19 14L15 12L15 6L17 4L16 2Z" />
      </svg>
    )
  }

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 2L8 2L7 4L9 6L9 12L5 14L5 16L11 16L11 22L13 22L13 16L19 16L19 14L15 12L15 6L17 4L16 2Z"
      />
    </svg>
  )
}
