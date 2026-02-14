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
            <div
              className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
              style={{ background: 'var(--ws-surface-raised)' }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-4 border-b"
                style={{ borderColor: 'var(--ws-border)' }}
              >
                <h2 className="text-lg font-semibold" style={{ color: 'var(--ws-text)' }}>
                  Keyboard Shortcuts
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-lg transition-colors"
                  style={{ color: 'var(--ws-text-muted)' }}
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Shortcuts list */}
              <div className="p-4">
                <table className="w-full">
                  <tbody className="divide-y" style={{ borderColor: 'var(--ws-border-subtle)' }}>
                    {SHORTCUTS.map((shortcut) => (
                      <tr key={shortcut.key} className="group">
                        <td className="py-2.5 pr-4">
                          <kbd
                            className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 text-sm font-mono font-semibold border rounded shadow-sm"
                            style={{
                              color: 'var(--ws-text-secondary)',
                              background: 'var(--ws-surface-1)',
                              borderColor: 'var(--ws-border)',
                            }}
                          >
                            {shortcut.key}
                          </kbd>
                        </td>
                        <td
                          className="py-2.5 text-sm"
                          style={{ color: 'var(--ws-text-secondary)' }}
                        >
                          {shortcut.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div
                className="px-6 py-3 border-t"
                style={{ background: 'var(--ws-surface-1)', borderColor: 'var(--ws-border)' }}
              >
                <p className="text-xs text-center" style={{ color: 'var(--ws-text-muted)' }}>
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
