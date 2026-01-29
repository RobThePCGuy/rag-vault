import { motion } from 'framer-motion'
import type { DiscoveryStep } from '../../hooks/useDiscoveryMode'

// ============================================
// Types
// ============================================

interface DiscoveryMiniMapProps {
  history: DiscoveryStep[]
  onNavigateToStep: (index: number) => void
}

// ============================================
// Component
// ============================================

/**
 * Visual representation of the discovery path
 */
export function DiscoveryMiniMap({ history, onNavigateToStep }: DiscoveryMiniMapProps) {
  if (history.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-gray-500">Start exploring to see your path</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
        <MapIcon className="w-4 h-4" />
        Exploration Path
      </h3>

      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {/* Vertical line connecting steps */}
          {history.length > 1 && (
            <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-gray-700" />
          )}

          {/* Steps */}
          <div className="space-y-1">
            {history.map((step, index) => (
              <MiniMapStep
                key={`${step.chunkKey.filePath}:${step.chunkKey.chunkIndex}:${index}`}
                step={step}
                index={index}
                isFirst={index === 0}
                isCurrent={index === history.length - 1}
                onClick={() => onNavigateToStep(index)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-xl font-bold text-white">{history.length}</p>
            <p className="text-xs text-gray-500">Steps</p>
          </div>
          <div>
            <p className="text-xl font-bold text-white">{countUniqueDocuments(history)}</p>
            <p className="text-xs text-gray-500">Documents</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Mini Map Step
// ============================================

interface MiniMapStepProps {
  step: DiscoveryStep
  index: number
  isFirst: boolean
  isCurrent: boolean
  onClick: () => void
}

function MiniMapStep({ step, index, isFirst, isCurrent, onClick }: MiniMapStepProps) {
  const fileName = formatPath(step.chunkKey.filePath)

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors ${
        isCurrent
          ? 'bg-blue-900/30'
          : 'hover:bg-gray-800'
      }`}
    >
      {/* Node indicator */}
      <div className="relative flex-shrink-0">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center ${
            isCurrent
              ? 'bg-blue-500'
              : isFirst
                ? 'bg-green-500'
                : 'bg-gray-600'
          }`}
        >
          {isFirst ? (
            <StartIcon className="w-3 h-3 text-white" />
          ) : isCurrent ? (
            <CurrentIcon className="w-3 h-3 text-white" />
          ) : (
            <span className="text-xs text-white font-medium">{index}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm truncate ${
            isCurrent ? 'text-white font-medium' : 'text-gray-400'
          }`}
        >
          {fileName}
        </p>
        <p className="text-xs text-gray-500">
          #{step.chunkKey.chunkIndex}
        </p>
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

function countUniqueDocuments(history: DiscoveryStep[]): number {
  const docs = new Set<string>()
  for (const step of history) {
    docs.add(step.chunkKey.filePath)
  }
  return docs.size
}

// ============================================
// Icons
// ============================================

function MapIcon({ className }: { className?: string }) {
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

function StartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 3l14 9-14 9V3z" />
    </svg>
  )
}

function CurrentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5" />
    </svg>
  )
}
