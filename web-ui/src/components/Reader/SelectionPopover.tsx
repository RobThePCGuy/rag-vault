import { motion } from 'framer-motion'
import type { HighlightColor } from '../../contexts/AnnotationsContext'

/**
 * X-Ray Vision action types for selection-based discovery
 */
export type SelectionAction = 'related' | 'support' | 'contradict' | 'compare' | 'pin'

interface SelectionPopoverProps {
  rect: DOMRect
  onSelectColor: (color: HighlightColor) => void
  onClose: () => void
  /** X-Ray Vision: Handler for discovery actions */
  onSelectionAction?: (action: SelectionAction) => void
  /** Whether actions are currently loading */
  isActionLoading?: boolean
}

const COLORS: { color: HighlightColor; bg: string; ring: string }[] = [
  { color: 'yellow', bg: 'bg-yellow-300', ring: 'ring-yellow-400' },
  { color: 'green', bg: 'bg-green-300', ring: 'ring-green-400' },
  { color: 'blue', bg: 'bg-blue-300', ring: 'ring-blue-400' },
  { color: 'pink', bg: 'bg-pink-300', ring: 'ring-pink-400' },
  { color: 'purple', bg: 'bg-purple-300', ring: 'ring-purple-400' },
]

const ACTIONS: { action: SelectionAction; icon: string; label: string; title: string }[] = [
  { action: 'related', icon: '🔍', label: 'Related', title: 'Find related content in vault' },
  { action: 'support', icon: '✓', label: 'Support', title: 'Find supporting evidence' },
  { action: 'contradict', icon: '✗', label: 'Contradict', title: 'Find contradicting content' },
  { action: 'compare', icon: '⚖️', label: 'Compare', title: 'Compare with other chunks' },
  { action: 'pin', icon: '📌', label: 'Pin', title: 'Pin selection as note' },
]

/**
 * Color picker popover that appears above text selection
 * Enhanced with X-Ray Vision actions for selection-based discovery
 */
export function SelectionPopover({
  rect,
  onSelectColor,
  onClose,
  onSelectionAction,
  isActionLoading = false,
}: SelectionPopoverProps) {
  // Calculate position - center above selection
  const hasActions = !!onSelectionAction
  const popoverWidth = hasActions ? 220 : 160
  const popoverHeight = hasActions ? 80 : 44
  const gap = 8

  // Position above the selection, centered
  const left = rect.left + rect.width / 2 - popoverWidth / 2
  const top = rect.top - popoverHeight - gap + window.scrollY

  // Ensure popover stays within viewport
  const adjustedLeft = Math.max(8, Math.min(left, window.innerWidth - popoverWidth - 8))
  const adjustedTop = top < 8 ? rect.bottom + gap + window.scrollY : top

  return (
    <>
      {/* Invisible backdrop to catch clicks outside */}
      <div className="fixed inset-0 z-50" onClick={onClose} />

      {/* Popover */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.1 }}
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2"
        style={{
          left: adjustedLeft,
          top: adjustedTop,
          minWidth: popoverWidth,
        }}
      >
        {/* Row 1: Highlight colors */}
        <div className="flex items-center justify-center gap-1 mb-1.5">
          {COLORS.map(({ color, bg, ring }) => (
            <button
              key={color}
              type="button"
              onClick={() => onSelectColor(color)}
              className={`w-7 h-7 rounded-full ${bg} hover:ring-2 ${ring} transition-all`}
              title={`Highlight ${color}`}
            />
          ))}
        </div>

        {/* Row 2: X-Ray Vision actions */}
        {hasActions && (
          <div className="flex items-center justify-center gap-1 pt-1.5 border-t border-gray-200 dark:border-gray-700">
            {ACTIONS.map(({ action, icon, title }) => (
              <button
                key={action}
                type="button"
                onClick={() => onSelectionAction(action)}
                disabled={isActionLoading}
                className={`
                  flex items-center justify-center w-8 h-8 rounded-md text-sm
                  transition-all
                  ${isActionLoading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
                title={title}
              >
                {icon}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </>
  )
}
