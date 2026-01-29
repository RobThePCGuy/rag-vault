import { motion } from 'framer-motion'

// ============================================
// Types
// ============================================

interface ReadingProgressBarProps {
  completionPercent: number
  chunksRead: number
  totalChunks: number
  onClick?: () => void
}

// ============================================
// Component
// ============================================

/**
 * Progress bar showing reading completion percentage
 * Displayed in document header
 */
export function ReadingProgressBar({
  completionPercent,
  chunksRead,
  totalChunks,
  onClick,
}: ReadingProgressBarProps) {
  const isComplete = completionPercent === 100

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      title={`${completionPercent}% complete (${chunksRead}/${totalChunks} chunks read)`}
    >
      {/* Progress bar */}
      <div className="relative w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${
            isComplete
              ? 'bg-green-500'
              : completionPercent > 50
                ? 'bg-blue-500'
                : 'bg-blue-400'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${completionPercent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Percentage */}
      <span
        className={`text-xs font-medium ${
          isComplete
            ? 'text-green-600 dark:text-green-400'
            : 'text-gray-600 dark:text-gray-400'
        } group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors`}
      >
        {completionPercent}%
      </span>

      {/* Completion indicator */}
      {isComplete && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-green-500"
        >
          <CheckIcon className="w-4 h-4" />
        </motion.span>
      )}
    </button>
  )
}

// ============================================
// Compact Progress
// ============================================

interface CompactProgressProps {
  completionPercent: number
}

/**
 * Minimal progress indicator for tight spaces
 */
export function CompactProgress({ completionPercent }: CompactProgressProps) {
  const isComplete = completionPercent === 100

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${
        isComplete
          ? 'text-green-600 dark:text-green-400'
          : 'text-gray-500 dark:text-gray-400'
      }`}
    >
      {isComplete ? (
        <CheckIcon className="w-3.5 h-3.5" />
      ) : (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-current relative">
          <span
            className="absolute inset-0 rounded-full bg-current origin-bottom"
            style={{
              clipPath: `polygon(0 ${100 - completionPercent}%, 100% ${100 - completionPercent}%, 100% 100%, 0 100%)`,
            }}
          />
        </span>
      )}
      {completionPercent}%
    </span>
  )
}

// ============================================
// Icons
// ============================================

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}
