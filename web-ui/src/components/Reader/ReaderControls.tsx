import { AnimatePresence, motion } from 'framer-motion'
import {
  useReaderSettings,
  type FontFamily,
  type FontSize,
  type LineHeight,
} from '../../contexts/ReaderSettingsContext'

interface ReaderControlsProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Reader settings dropdown panel
 * Controls font size, line height, font family, and chunk number visibility
 */
export function ReaderControls({ isOpen, onClose }: ReaderControlsProps) {
  const {
    settings,
    setFontSize,
    setLineHeight,
    setFontFamily,
    setShowChunkNumbers,
    setShowHeatmap,
    resetSettings,
  } = useReaderSettings()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 w-72 rounded-lg shadow-xl border p-4"
            style={{ background: 'var(--ws-surface-raised)', borderColor: 'var(--ws-border)' }}
          >
            <div className="space-y-4">
              {/* Font Size */}
              <div>
                <span
                  className="block text-xs font-medium mb-2"
                  style={{ color: 'var(--ws-text-secondary)' }}
                >
                  Font Size
                </span>
                <div className="flex gap-1" role="group" aria-label="Font size">
                  {(['sm', 'base', 'lg', 'xl'] as FontSize[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFontSize(size)}
                      className="flex-1 px-2 py-1.5 text-sm rounded-md transition-colors"
                      style={
                        settings.fontSize === size
                          ? {
                              background: 'var(--ws-accent-subtle)',
                              color: 'var(--ws-accent)',
                              fontWeight: 500,
                            }
                          : { background: 'var(--ws-surface-1)', color: 'var(--ws-text-secondary)' }
                      }
                    >
                      {size === 'sm' && 'S'}
                      {size === 'base' && 'M'}
                      {size === 'lg' && 'L'}
                      {size === 'xl' && 'XL'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Height */}
              <div>
                <span
                  className="block text-xs font-medium mb-2"
                  style={{ color: 'var(--ws-text-secondary)' }}
                >
                  Line Spacing
                </span>
                <div className="flex gap-1" role="group" aria-label="Line spacing">
                  {(['tight', 'normal', 'relaxed'] as LineHeight[]).map((height) => (
                    <button
                      key={height}
                      type="button"
                      onClick={() => setLineHeight(height)}
                      className="flex-1 px-2 py-1.5 text-sm rounded-md transition-colors capitalize"
                      style={
                        settings.lineHeight === height
                          ? {
                              background: 'var(--ws-accent-subtle)',
                              color: 'var(--ws-accent)',
                              fontWeight: 500,
                            }
                          : { background: 'var(--ws-surface-1)', color: 'var(--ws-text-secondary)' }
                      }
                    >
                      {height}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Family */}
              <div>
                <label
                  className="block text-xs font-medium mb-2"
                  style={{ color: 'var(--ws-text-secondary)' }}
                >
                  Font
                  <select
                    value={settings.fontFamily}
                    onChange={(e) => setFontFamily(e.target.value as FontFamily)}
                    className="mt-1 w-full px-3 py-2 text-sm border-0 rounded-md focus:ring-2 focus:ring-blue-500"
                    style={{ background: 'var(--ws-surface-1)', color: 'var(--ws-text-secondary)' }}
                  >
                    <option value="sans">Sans-serif</option>
                    <option value="serif">Serif</option>
                    <option value="mono">Monospace</option>
                  </select>
                </label>
              </div>

              {/* Show Chunk Numbers */}
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--ws-text-secondary)' }}>
                  Show chunk numbers
                </span>
                <button
                  type="button"
                  onClick={() => setShowChunkNumbers(!settings.showChunkNumbers)}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  style={{
                    background: settings.showChunkNumbers
                      ? 'var(--ws-accent)'
                      : 'var(--ws-surface-2)',
                  }}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${settings.showChunkNumbers ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              {/* Semantic Heatmap Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <span className="text-sm" style={{ color: 'var(--ws-text-secondary)' }}>
                    Semantic heatmap
                  </span>
                  <p className="text-xs" style={{ color: 'var(--ws-text-muted)' }}>
                    Highlight connected terms
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHeatmap(!settings.showHeatmap)}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  style={{
                    background: settings.showHeatmap ? 'var(--ws-accent)' : 'var(--ws-surface-2)',
                  }}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${settings.showHeatmap ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              {/* Reset */}
              <div className="pt-2 border-t" style={{ borderColor: 'var(--ws-border)' }}>
                <button
                  type="button"
                  onClick={resetSettings}
                  className="w-full px-3 py-1.5 text-sm rounded-md transition-colors"
                  style={{ color: 'var(--ws-text-secondary)' }}
                >
                  Reset to defaults
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * Button to toggle reader controls panel
 */
export function ReaderControlsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
      style={{ color: 'var(--ws-text-secondary)' }}
      title="Reader settings"
    >
      <SettingsIcon className="w-4 h-4" />
      <span className="hidden sm:inline">Display</span>
    </button>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  )
}
