import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import type { DiscoverySuggestion, DiscoveryStep } from '../../hooks/useDiscoveryMode'
import { getSuggestionReasonText } from '../../hooks/useDiscoveryMode'
import { DiscoveryMiniMap } from './DiscoveryMiniMap'

// ============================================
// Types
// ============================================

interface DiscoveryModeProps {
  isActive: boolean
  currentStep: DiscoveryStep | null
  history: DiscoveryStep[]
  suggestions: DiscoverySuggestion[]
  onGoToChunk: (chunk: DiscoverySuggestion['chunk']) => void
  onGoBack: () => void
  onSaveAsTrail: (name: string) => void
  onStop: () => void
  onNavigateToChunk: (filePath: string, chunkIndex: number) => void
  canGoBack: boolean
}

// ============================================
// Component
// ============================================

/**
 * Full-screen discovery mode interface for exploring through semantic connections
 */
export function DiscoveryMode({
  isActive,
  currentStep,
  history,
  suggestions,
  onGoToChunk,
  onGoBack,
  onSaveAsTrail,
  onStop,
  onNavigateToChunk,
  canGoBack,
}: DiscoveryModeProps) {
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [trailName, setTrailName] = useState('')

  const handleSave = () => {
    if (trailName.trim()) {
      onSaveAsTrail(trailName.trim())
      setShowSaveModal(false)
      setTrailName('')
    }
  }

  const handleSelectSuggestion = (index: number) => {
    if (suggestions[index]) {
      onGoToChunk(suggestions[index].chunk)
      onNavigateToChunk(suggestions[index].chunk.filePath, suggestions[index].chunk.chunkIndex)
    }
  }

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gray-900/95 z-50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <CompassIcon className="w-5 h-5 text-blue-400" />
                Discovery Mode
              </h2>
              <span className="text-sm text-gray-400">
                {history.length} steps
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Back button */}
              <button
                type="button"
                onClick={onGoBack}
                disabled={!canGoBack}
                className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <BackIcon className="w-4 h-4" />
                Back
              </button>

              {/* Save as trail */}
              <button
                type="button"
                onClick={() => setShowSaveModal(true)}
                disabled={history.length < 2}
                className="px-3 py-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <SaveIcon className="w-4 h-4" />
                Save as Trail
              </button>

              {/* Exit */}
              <button
                type="button"
                onClick={onStop}
                className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                Exit
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Current chunk */}
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              {currentStep ? (
                <motion.div
                  key={`${currentStep.chunkKey.filePath}:${currentStep.chunkKey.chunkIndex}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-2xl"
                >
                  {/* Current chunk card */}
                  <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-8">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-medium text-blue-400 bg-blue-900/30 px-2 py-1 rounded">
                        Current
                      </span>
                      <span className="text-sm text-gray-400">
                        {formatPath(currentStep.chunkKey.filePath)} #{currentStep.chunkKey.chunkIndex}
                      </span>
                    </div>
                    <p className="text-gray-200 leading-relaxed">
                      {currentStep.text.slice(0, 500)}
                      {currentStep.text.length > 500 && '...'}
                    </p>
                  </div>

                  {/* Suggestions */}
                  {suggestions.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-4 text-center">
                        Where to go next?
                      </h3>
                      <div className="grid gap-3">
                        {suggestions.map((suggestion, index) => (
                          <SuggestionCard
                            key={`${suggestion.chunk.filePath}:${suggestion.chunk.chunkIndex}`}
                            suggestion={suggestion}
                            index={index}
                            onSelect={() => handleSelectSuggestion(index)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center">
                      No more suggestions available. Try going back or saving your trail.
                    </p>
                  )}
                </motion.div>
              ) : (
                <p className="text-gray-500">No chunk selected</p>
              )}
            </div>

            {/* Mini map */}
            <div className="w-64 border-l border-gray-700 p-4">
              <DiscoveryMiniMap
                history={history}
                onNavigateToStep={(index) => {
                  const step = history[index]
                  if (step) {
                    onNavigateToChunk(step.chunkKey.filePath, step.chunkKey.chunkIndex)
                  }
                }}
              />
            </div>
          </div>

          {/* Keyboard hints */}
          <div className="px-6 py-2 border-t border-gray-700 bg-gray-800/50">
            <p className="text-xs text-gray-500 text-center">
              Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">1-5</kbd> to select suggestion
              {' '}&bull;{' '}
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">Backspace</kbd> to go back
              {' '}&bull;{' '}
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">Escape</kbd> to exit
            </p>
          </div>

          {/* Save modal */}
          <AnimatePresence>
            {showSaveModal && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-60"
                  onClick={() => setShowSaveModal(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-60 w-96 bg-gray-800 rounded-xl border border-gray-700 p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-4">Save as Trail</h3>
                  <input
                    type="text"
                    value={trailName}
                    onChange={(e) => setTrailName(e.target.value)}
                    placeholder="Trail name..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave()
                      if (e.key === 'Escape') setShowSaveModal(false)
                    }}
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowSaveModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!trailName.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================
// Suggestion Card
// ============================================

interface SuggestionCardProps {
  suggestion: DiscoverySuggestion
  index: number
  onSelect: () => void
}

function SuggestionCard({ suggestion, index, onSelect }: SuggestionCardProps) {
  const similarity = Math.round((1 - suggestion.chunk.score) * 100)
  const reasonText = getSuggestionReasonText(suggestion.reason)

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500 rounded-lg transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Number indicator */}
        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-gray-700 rounded text-sm font-medium text-gray-300">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-300">
              {formatPath(suggestion.chunk.filePath)}
            </span>
            <span className="text-xs text-gray-500">#{suggestion.chunk.chunkIndex}</span>
            <span
              className={`ml-auto text-xs px-1.5 py-0.5 rounded ${
                similarity >= 70
                  ? 'bg-green-900/30 text-green-400'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {similarity}%
            </span>
          </div>

          {/* Preview */}
          <p className="text-sm text-gray-400 line-clamp-2 mb-2">
            {suggestion.chunk.text.slice(0, 150)}
          </p>

          {/* Reason */}
          <span
            className={`text-xs ${
              suggestion.reason === 'high_similarity'
                ? 'text-green-400'
                : suggestion.reason === 'different_document'
                  ? 'text-blue-400'
                  : 'text-gray-500'
            }`}
          >
            {reasonText}
          </span>
        </div>
      </div>
    </motion.button>
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

function CompassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  )
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
      />
    </svg>
  )
}
