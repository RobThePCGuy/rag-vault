import { AnimatePresence, motion } from 'framer-motion'
import type { InferredBacklink } from '../../hooks/useInferredBacklinks'

// ============================================
// Types
// ============================================

interface InferredLinksPanelProps {
  suggestions: InferredBacklink[]
  isVisible: boolean
  onPin: (suggestion: InferredBacklink) => void
  onDismiss: (suggestion: InferredBacklink) => void
  onNavigate: (filePath: string, chunkIndex: number) => void
}

// ============================================
// Component
// ============================================

/**
 * Panel showing inferred/suggested links based on semantic similarity
 * Appears in the Dynamic Margin
 */
export function InferredLinksPanel({
  suggestions,
  isVisible,
  onPin,
  onDismiss,
  onNavigate,
}: InferredLinksPanelProps) {
  if (!isVisible || suggestions.length === 0) return null

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide flex items-center gap-2">
          <LightbulbIcon className="w-3.5 h-3.5" />
          Suggested Links
          <span className="text-purple-500 dark:text-purple-500">({suggestions.length})</span>
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Based on semantic similarity
        </p>
      </div>
      <div className="p-3 space-y-2">
        <AnimatePresence mode="popLayout">
          {suggestions.map((suggestion) => (
            <InferredLinkItem
              key={suggestion.id}
              suggestion={suggestion}
              onPin={() => onPin(suggestion)}
              onDismiss={() => onDismiss(suggestion)}
              onNavigate={() =>
                onNavigate(suggestion.targetKey.filePath, suggestion.targetKey.chunkIndex)
              }
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ============================================
// Inferred Link Item
// ============================================

interface InferredLinkItemProps {
  suggestion: InferredBacklink
  onPin: () => void
  onDismiss: () => void
  onNavigate: () => void
}

function InferredLinkItem({ suggestion, onPin, onDismiss, onNavigate }: InferredLinkItemProps) {
  const similarity = Math.round((1 - suggestion.score) * 100)
  const fileName = formatPath(suggestion.targetKey.filePath)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors overflow-hidden"
    >
      {/* Content */}
      <button
        type="button"
        onClick={onNavigate}
        className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
            {fileName}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            #{suggestion.targetKey.chunkIndex}
          </span>
          <span
            className={`ml-auto text-xs px-1.5 py-0.5 rounded ${
              similarity >= 70
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : similarity >= 50
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            {similarity}% similar
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {suggestion.targetPreview}
        </p>
        <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">{suggestion.reason}</p>
      </button>

      {/* Actions */}
      <div className="flex border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onPin()
          }}
          className="flex-1 px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-1"
        >
          <PinIcon className="w-3.5 h-3.5" />
          Pin
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          className="flex-1 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-1 border-l border-gray-100 dark:border-gray-700"
        >
          <DismissIcon className="w-3.5 h-3.5" />
          Dismiss
        </button>
      </div>
    </motion.div>
  )
}

// ============================================
// Helpers
// ============================================

function formatPath(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

// ============================================
// Icons
// ============================================

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  )
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
      />
    </svg>
  )
}

function DismissIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
