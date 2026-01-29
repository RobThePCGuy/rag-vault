import { AnimatePresence, motion } from 'framer-motion'

interface KeyboardHelpProps {
  isOpen: boolean
  onClose: () => void
}

interface ShortcutItem {
  key: string
  description: string
}

const SHORTCUTS: ShortcutItem[] = [
  { key: 'j', description: 'Navigate to next chunk' },
  { key: 'k', description: 'Navigate to previous chunk' },
  { key: 'Space', description: 'Toggle split view' },
  { key: 'p', description: 'Pin top margin suggestion' },
  { key: '/', description: 'Open search' },
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: 'Esc', description: 'Close overlays' },
]

/**
 * Keyboard shortcuts help overlay
 */
export function KeyboardHelp({ isOpen, onClose }: KeyboardHelpProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
          >
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Keyboard Shortcuts
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Shortcuts list */}
              <div className="p-4">
                <table className="w-full">
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {SHORTCUTS.map((shortcut) => (
                      <tr key={shortcut.key} className="group">
                        <td className="py-2.5 pr-4">
                          <kbd className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 text-sm font-mono font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-sm">
                            {shortcut.key}
                          </kbd>
                        </td>
                        <td className="py-2.5 text-sm text-gray-600 dark:text-gray-400">
                          {shortcut.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Shortcuts are disabled when typing in inputs or selecting text
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
