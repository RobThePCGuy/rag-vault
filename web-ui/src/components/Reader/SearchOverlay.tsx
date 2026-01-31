import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef } from 'react'
import type { SearchMatch } from './UnifiedTextRenderer'

// ============================================
// Types
// ============================================

interface SearchOverlayProps {
  isOpen: boolean
  query: string
  matches: SearchMatch[]
  currentIndex: number
  caseSensitive: boolean
  onQueryChange: (query: string) => void
  onToggleCaseSensitive: () => void
  onNextMatch: () => void
  onPreviousMatch: () => void
  onGoToMatch: (index: number) => void
  onClose: () => void
}

// ============================================
// Component
// ============================================

/**
 * Floating search overlay with results list
 * Keyboard: n (next), N (previous), Enter (next), Esc (close)
 */
export function SearchOverlay({
  isOpen,
  query,
  matches,
  currentIndex,
  caseSensitive,
  onQueryChange,
  onToggleCaseSensitive,
  onNextMatch,
  onPreviousMatch,
  onGoToMatch,
  onClose,
}: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [isOpen])

  // Scroll current result into view
  useEffect(() => {
    if (currentIndex >= 0 && resultsRef.current) {
      const currentItem = resultsRef.current.querySelector(`[data-result-index="${currentIndex}"]`)
      currentItem?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [currentIndex])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'Enter':
          e.preventDefault()
          if (e.shiftKey) {
            onPreviousMatch()
          } else {
            onNextMatch()
          }
          break
        case 'n':
          // Only if not typing in input (for n/N navigation)
          if (e.target !== inputRef.current) {
            e.preventDefault()
            if (e.shiftKey) {
              onPreviousMatch()
            } else {
              onNextMatch()
            }
          }
          break
        case 'N':
          if (e.target !== inputRef.current) {
            e.preventDefault()
            onPreviousMatch()
          }
          break
      }
    },
    [onClose, onNextMatch, onPreviousMatch]
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4"
          onKeyDown={handleKeyDown}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Search Input Row */}
            <div className="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-700">
              <SearchIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search in document..."
                className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none text-base"
              />

              {/* Match counter */}
              {matches.length > 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap px-2">
                  {currentIndex + 1}/{matches.length}
                </span>
              )}

              {/* Case sensitive toggle */}
              <button
                type="button"
                onClick={onToggleCaseSensitive}
                className={`p-1.5 rounded text-sm font-medium transition-colors ${
                  caseSensitive
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="Case sensitive (Aa)"
              >
                Aa
              </button>

              {/* Navigation buttons */}
              <div className="flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-2">
                <button
                  type="button"
                  onClick={onPreviousMatch}
                  disabled={matches.length === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Previous match (N)"
                >
                  <ChevronUpIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onNextMatch}
                  disabled={matches.length === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Next match (n)"
                >
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Close (Esc)"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Results List */}
            {query.length > 0 && (
              <div ref={resultsRef} className="max-h-64 overflow-y-auto">
                {matches.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                    <p className="text-sm">No matches found</p>
                  </div>
                ) : (
                  <div className="py-1">
                    {matches.slice(0, 50).map((match, index) => (
                      <button
                        key={`${match.chunkIndex}-${match.startOffset}`}
                        data-result-index={index}
                        type="button"
                        onClick={() => onGoToMatch(index)}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${
                          index === currentIndex
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500'
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Chunk #{match.chunkIndex}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                          {highlightContext(match.context, query, caseSensitive)}
                        </p>
                      </button>
                    ))}
                    {matches.length > 50 && (
                      <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 text-center border-t border-gray-200 dark:border-gray-700">
                        Showing first 50 of {matches.length} matches
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Keyboard hints */}
            {query.length === 0 && (
              <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-850">
                <span className="mr-4">
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                    Enter
                  </kbd>{' '}
                  next
                </span>
                <span className="mr-4">
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                    Shift+Enter
                  </kbd>{' '}
                  previous
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                    Esc
                  </kbd>{' '}
                  close
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Highlight the matched text within context
 */
function highlightContext(context: string, query: string, caseSensitive: boolean): React.ReactNode {
  if (!query) return context

  const searchQuery = caseSensitive ? query : query.toLowerCase()
  const searchContext = caseSensitive ? context : context.toLowerCase()
  const matchIndex = searchContext.indexOf(searchQuery)

  if (matchIndex === -1) return context

  const before = context.slice(0, matchIndex)
  const match = context.slice(matchIndex, matchIndex + query.length)
  const after = context.slice(matchIndex + query.length)

  return (
    <>
      {before}
      <mark className="bg-orange-200 dark:bg-orange-800/60 rounded px-0.5">{match}</mark>
      {after}
    </>
  )
}

// ============================================
// Icons
// ============================================

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  )
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
