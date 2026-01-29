import { motion } from 'framer-motion'
import type { HighlightColor } from '../../contexts/AnnotationsContext'

interface SelectionPopoverProps {
  rect: DOMRect
  onSelectColor: (color: HighlightColor) => void
  onClose: () => void
}

const COLORS: { color: HighlightColor; bg: string; ring: string }[] = [
  { color: 'yellow', bg: 'bg-yellow-300', ring: 'ring-yellow-400' },
  { color: 'green', bg: 'bg-green-300', ring: 'ring-green-400' },
  { color: 'blue', bg: 'bg-blue-300', ring: 'ring-blue-400' },
  { color: 'pink', bg: 'bg-pink-300', ring: 'ring-pink-400' },
  { color: 'purple', bg: 'bg-purple-300', ring: 'ring-purple-400' },
]

/**
 * Color picker popover that appears above text selection
 */
export function SelectionPopover({ rect, onSelectColor, onClose }: SelectionPopoverProps) {
  // Calculate position - center above selection
  const popoverWidth = 160
  const popoverHeight = 44
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
        className="fixed z-50 flex items-center gap-1 px-2 py-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"
        style={{
          left: adjustedLeft,
          top: adjustedTop,
          width: popoverWidth,
        }}
      >
        {COLORS.map(({ color, bg, ring }) => (
          <button
            key={color}
            type="button"
            onClick={() => onSelectColor(color)}
            className={`w-7 h-7 rounded-full ${bg} hover:ring-2 ${ring} transition-all`}
            title={`Highlight ${color}`}
          />
        ))}
      </motion.div>
    </>
  )
}
