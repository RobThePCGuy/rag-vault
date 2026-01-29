import { AnimatePresence, motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import type { ComparisonChunk } from '../../hooks/useChunkComparison'
import { computeWordDiff, type DiffSegment } from '../../hooks/useChunkComparison'

// ============================================
// Types
// ============================================

interface ComparisonViewProps {
  isOpen: boolean
  leftChunk: ComparisonChunk | null
  rightChunk: ComparisonChunk | null
  onClose: () => void
  onSwapChunks: () => void
  onSelectRightChunk: () => void
  onNavigateToChunk: (filePath: string, chunkIndex: number) => void
}

// ============================================
// Component
// ============================================

/**
 * Full-screen overlay for comparing two chunks side by side
 */
export function ComparisonView({
  isOpen,
  leftChunk,
  rightChunk,
  onClose,
  onSwapChunks,
  onSelectRightChunk,
  onNavigateToChunk,
}: ComparisonViewProps) {
  const [showDiff, setShowDiff] = useState(true)

  // Compute diff if both chunks present
  const diff = useMemo(() => {
    if (!leftChunk || !rightChunk || !showDiff) return null
    return computeWordDiff(leftChunk.text, rightChunk.text)
  }, [leftChunk, rightChunk, showDiff])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <CompareIcon className="w-5 h-5 text-blue-500" />
                Compare Chunks
              </h2>

              {/* Swap button */}
              {leftChunk && rightChunk && (
                <button
                  type="button"
                  onClick={onSwapChunks}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Swap chunks"
                >
                  <SwapIcon className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Diff toggle */}
              {leftChunk && rightChunk && (
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDiff}
                    onChange={(e) => setShowDiff(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  Show diff
                </label>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left panel */}
            <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700">
              {leftChunk ? (
                <>
                  <ChunkHeader
                    chunk={leftChunk}
                    side="left"
                    onNavigate={() => onNavigateToChunk(leftChunk.filePath, leftChunk.chunkIndex)}
                  />
                  <div className="flex-1 overflow-y-auto p-6">
                    {diff ? (
                      <DiffRenderer segments={diff.leftSegments} />
                    ) : (
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {leftChunk.text}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <p>No chunk selected</p>
                </div>
              )}
            </div>

            {/* Right panel */}
            <div className="flex-1 flex flex-col">
              {rightChunk ? (
                <>
                  <ChunkHeader
                    chunk={rightChunk}
                    side="right"
                    onNavigate={() => onNavigateToChunk(rightChunk.filePath, rightChunk.chunkIndex)}
                  />
                  <div className="flex-1 overflow-y-auto p-6">
                    {diff ? (
                      <DiffRenderer segments={diff.rightSegments} />
                    ) : (
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {rightChunk.text}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={onSelectRightChunk}
                    className="px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <SelectIcon className="w-5 h-5" />
                    Select chunk to compare
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Keyboard hint */}
          <div className="px-6 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Escape</kbd> to close
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================
// Chunk Header
// ============================================

interface ChunkHeaderProps {
  chunk: ComparisonChunk
  side: 'left' | 'right'
  onNavigate: () => void
}

function ChunkHeader({ chunk, side, onNavigate }: ChunkHeaderProps) {
  const fileName = formatPath(chunk.filePath)

  return (
    <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span
          className={`w-2 h-2 rounded-full ${
            side === 'left' ? 'bg-blue-500' : 'bg-green-500'
          }`}
        />
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{fileName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Chunk #{chunk.chunkIndex}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onNavigate}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
      >
        <NavigateIcon className="w-4 h-4" />
        Go to chunk
      </button>
    </div>
  )
}

// ============================================
// Diff Renderer
// ============================================

interface DiffRendererProps {
  segments: DiffSegment[]
}

function DiffRenderer({ segments }: DiffRendererProps) {
  return (
    <p className="whitespace-pre-wrap">
      {segments.map((segment, index) => {
        switch (segment.type) {
          case 'same':
            return (
              <span key={index} className="text-gray-700 dark:text-gray-300">
                {segment.text}
              </span>
            )
          case 'added':
            return (
              <span
                key={index}
                className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200"
              >
                {segment.text}
              </span>
            )
          case 'removed':
            return (
              <span
                key={index}
                className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 line-through"
              >
                {segment.text}
              </span>
            )
          default:
            return segment.text
        }
      })}
    </p>
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

function CompareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  )
}

function SwapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
      />
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

function SelectIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
      />
    </svg>
  )
}

function NavigateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 7l5 5m0 0l-5 5m5-5H6"
      />
    </svg>
  )
}
