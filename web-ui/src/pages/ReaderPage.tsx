import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ReaderLayout, TrailManager } from '../components/Reader'
import { usePins, useTrail } from '../hooks'
import {
  decodeTrail,
  parseTrailFromUrl,
  validateTrail,
  type ShareableTrail,
  type TrailImportResult,
} from '../utils/shareTrail'

/**
 * Reader page for immersive document reading experience
 * Reads from search params:
 * - path: the document filePath (required)
 * - chunk: optional chunkIndex to scroll to
 * Reads from hash:
 * - #trail=... : encoded trail to import
 */
export function ReaderPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [trailManagerOpen, setTrailManagerOpen] = useState(false)

  // Trail import state
  const [showTrailImport, setShowTrailImport] = useState(false)
  const [pendingTrail, setPendingTrail] = useState<{
    decoded: ShareableTrail
    validation: TrailImportResult
  } | null>(null)

  const filePath = searchParams.get('path')
  const chunkIndexStr = searchParams.get('chunk')
  const chunkIndex = chunkIndexStr ? Number.parseInt(chunkIndexStr, 10) : undefined

  // Phase 2: Pins and Trail hooks
  const { pinnedChunkKeys, togglePin } = usePins()
  const {
    currentTrail,
    savedTrails,
    addStep,
    saveTrail,
    loadTrail,
    deleteTrail,
    clearCurrentTrail,
  } = useTrail()

  // Check for trail in URL hash on mount
  useEffect(() => {
    const encoded = parseTrailFromUrl()
    if (!encoded) return

    const decoded = decodeTrail(encoded)
    if (!decoded) return

    // Validate the trail
    const validation = validateTrail(decoded, {
      currentVaultId: 'default',
      // We don't have a file existence checker here, so we'll import all steps
    })

    setPendingTrail({ decoded, validation })
    setShowTrailImport(true)

    // Clear the hash to avoid re-importing on refresh
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [])

  // Handle navigation to a different document/chunk
  const handleNavigate = useCallback(
    (targetFilePath: string, targetChunkIndex?: number) => {
      const params = new URLSearchParams({ path: targetFilePath })
      if (targetChunkIndex !== undefined) {
        params.set('chunk', String(targetChunkIndex))
      }
      navigate(`/read?${params.toString()}`)

      // Add to trail
      addStep({ filePath: targetFilePath, chunkIndex: targetChunkIndex ?? 0 })
    },
    [navigate, addStep]
  )

  // Handle going back to search/home
  const handleGoHome = useCallback(() => {
    navigate('/')
  }, [navigate])

  // Handle toggle pin from the margin
  const handleTogglePin = useCallback(
    (targetFilePath: string, targetChunkIndex: number) => {
      if (!filePath || chunkIndex === undefined) return

      // We need the text content to create a pin
      // For now, use placeholder text - in a full implementation,
      // this would come from the chunk data
      togglePin(
        { filePath, chunkIndex },
        { filePath: targetFilePath, chunkIndex: targetChunkIndex },
        '', // Source text - would come from actual chunk
        '', // Target text - would come from actual chunk
        undefined
      )
    },
    [filePath, chunkIndex, togglePin]
  )

  // Handle save trail
  const handleSaveTrail = useCallback(() => {
    setTrailManagerOpen(true)
  }, [])

  // Handle importing shared trail
  const handleImportTrail = useCallback(() => {
    if (!pendingTrail?.validation.trail) return

    // Load the imported trail as current trail
    const trail = pendingTrail.validation.trail

    // Navigate to the first step
    if (trail.steps.length > 0) {
      const firstStep = trail.steps[0]
      if (firstStep) {
        // Add all steps to the current trail
        for (const step of trail.steps) {
          addStep(step.chunkKey)
        }
        navigate(
          `/read?path=${encodeURIComponent(firstStep.chunkKey.filePath)}&chunk=${firstStep.chunkKey.chunkIndex}`
        )
      }
    }

    setShowTrailImport(false)
    setPendingTrail(null)
  }, [pendingTrail, addStep, navigate])

  // Handle dismissing the trail import
  const handleDismissTrailImport = useCallback(() => {
    setShowTrailImport(false)
    setPendingTrail(null)
  }, [])

  // If no file path provided, show error state
  if (!filePath) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            No document selected
          </h2>
          <p className="text-yellow-700 dark:text-yellow-300 mb-4">
            Please select a document from the search results or files page to read.
          </p>
          <button
            type="button"
            onClick={handleGoHome}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Go to Search
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ReaderLayout
        filePath={filePath}
        initialChunkIndex={chunkIndex}
        onNavigate={handleNavigate}
        onGoHome={handleGoHome}
        pinnedChunkKeys={pinnedChunkKeys}
        onTogglePin={handleTogglePin}
        onSaveTrail={handleSaveTrail}
      />

      {/* Trail Manager Modal */}
      <TrailManager
        currentTrail={currentTrail}
        savedTrails={savedTrails}
        onSaveTrail={saveTrail}
        onLoadTrail={(trailId) => {
          const trail = loadTrail(trailId)
          if (trail && trail.steps.length > 0) {
            const firstStep = trail.steps[0]
            if (firstStep) {
              handleNavigate(firstStep.chunkKey.filePath, firstStep.chunkKey.chunkIndex)
            }
          }
        }}
        onDeleteTrail={deleteTrail}
        onClearCurrentTrail={clearCurrentTrail}
        onNavigateToStep={handleNavigate}
        isOpen={trailManagerOpen}
        onClose={() => setTrailManagerOpen(false)}
      />

      {/* Trail Import Dialog */}
      <AnimatePresence>
        {showTrailImport && pendingTrail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={handleDismissTrailImport}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                  <TrailIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Import Shared Trail
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {pendingTrail.decoded.steps.length} steps
                  </p>
                </div>
              </div>

              {/* Warnings */}
              {pendingTrail.validation.warnings.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    {pendingTrail.validation.warnings[0]}
                  </p>
                </div>
              )}

              {/* Errors */}
              {pendingTrail.validation.errors.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {pendingTrail.validation.errors[0]}
                  </p>
                </div>
              )}

              {/* Trail preview */}
              {pendingTrail.validation.success && pendingTrail.validation.trail && (
                <div className="mb-4 max-h-48 overflow-y-auto">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Trail steps:
                  </p>
                  <div className="space-y-1">
                    {pendingTrail.validation.trail.steps.slice(0, 5).map((step, idx) => (
                      <div
                        key={`${step.chunkKey.filePath}::${step.chunkKey.chunkIndex}`}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="text-gray-400 w-4">{idx + 1}.</span>
                        <span className="text-gray-700 dark:text-gray-300 truncate">
                          {step.chunkKey.filePath.split('/').pop()}
                        </span>
                        <span className="text-gray-400 text-xs">#{step.chunkKey.chunkIndex}</span>
                      </div>
                    ))}
                    {pendingTrail.validation.trail.steps.length > 5 && (
                      <p className="text-xs text-gray-400 pl-6">
                        +{pendingTrail.validation.trail.steps.length - 5} more steps
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleDismissTrailImport}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                {pendingTrail.validation.success && (
                  <button
                    type="button"
                    onClick={handleImportTrail}
                    className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Import & Navigate
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Icon component
function TrailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  )
}
