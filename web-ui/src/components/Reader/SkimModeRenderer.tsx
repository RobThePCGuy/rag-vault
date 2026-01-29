import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import type { SkimSection } from '../../hooks/useSkimMode'

// ============================================
// Types
// ============================================

interface SkimModeRendererProps {
  sections: SkimSection[]
  activeChunkIndex: number | null
  onExpandChunk: (chunkIndex: number) => void
  onNavigateToChunk: (chunkIndex: number) => void
}

// ============================================
// Component
// ============================================

/**
 * Renders document in skim mode showing only headings and first sentences
 */
export function SkimModeRenderer({
  sections,
  activeChunkIndex,
  onExpandChunk,
  onNavigateToChunk,
}: SkimModeRendererProps) {
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set())

  const toggleExpanded = (chunkIndex: number) => {
    setExpandedChunks((prev) => {
      const next = new Set(prev)
      if (next.has(chunkIndex)) {
        next.delete(chunkIndex)
      } else {
        next.add(chunkIndex)
      }
      return next
    })
  }

  return (
    <div className="space-y-2">
      {sections.map((section) => {
        const isActive = activeChunkIndex === section.chunkIndex
        const isExpanded = expandedChunks.has(section.chunkIndex)

        return (
          <SkimSectionCard
            key={section.chunkIndex}
            section={section}
            isActive={isActive}
            isExpanded={isExpanded}
            onToggleExpand={() => toggleExpanded(section.chunkIndex)}
            onNavigate={() => {
              onNavigateToChunk(section.chunkIndex)
              onExpandChunk(section.chunkIndex)
            }}
          />
        )
      })}
    </div>
  )
}

// ============================================
// Section Card
// ============================================

interface SkimSectionCardProps {
  section: SkimSection
  isActive: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onNavigate: () => void
}

function SkimSectionCard({
  section,
  isActive,
  isExpanded,
  onToggleExpand,
  onNavigate,
}: SkimSectionCardProps) {
  const hasHeading = !!section.heading

  return (
    <motion.div
      layout
      className={`
        rounded-lg border transition-colors overflow-hidden
        ${
          isActive
            ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
        }
      `}
    >
      {/* Header */}
      <div
        className={`
          flex items-start gap-3 p-4 cursor-pointer
          hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors
        `}
        onClick={onToggleExpand}
      >
        {/* Chunk number */}
        <span className="text-xs font-mono text-gray-400 dark:text-gray-500 min-w-[2rem]">
          #{section.chunkIndex}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Heading */}
          {hasHeading && (
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {section.heading}
            </h3>
          )}

          {/* First sentence */}
          <p className={`text-sm text-gray-600 dark:text-gray-400 ${!hasHeading ? 'font-medium' : ''}`}>
            {section.firstSentence || <span className="italic text-gray-400">(No preview available)</span>}
          </p>
        </div>

        {/* Expand indicator */}
        <div className="flex items-center gap-2">
          {section.hasMoreContent && (
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronIcon className="w-5 h-5 text-gray-400" />
            </motion.div>
          )}
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && section.hasMoreContent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">
              {/* Full text preview */}
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {section.originalText}
              </p>

              {/* Navigate button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onNavigate()
                }}
                className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <NavigateIcon className="w-4 h-4" />
                Read in full mode
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================
// Icons
// ============================================

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
