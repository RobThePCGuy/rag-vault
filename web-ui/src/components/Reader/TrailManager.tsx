import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import type { Trail, TrailNode } from '../../contexts/LinksContext'

interface TrailManagerProps {
  currentTrail: Trail | null
  savedTrails: Trail[]
  onSaveTrail: (name: string) => void
  onLoadTrail: (trailId: string) => void
  onDeleteTrail: (trailId: string) => void
  onClearCurrentTrail: () => void
  onNavigateToStep: (filePath: string, chunkIndex: number) => void
  isOpen: boolean
  onClose: () => void
  /** Folgezettel: tree view of trail */
  trailTree?: TrailNode | null
  /** Currently active node ID */
  currentNodeId?: string | null
  /** Set active node */
  onSetCurrentNode?: (nodeId: string) => void
}

/**
 * Manager for viewing, saving, loading, and deleting trails
 * Shows current trail progress and saved trails list
 */
export function TrailManager({
  currentTrail,
  savedTrails,
  onSaveTrail,
  onLoadTrail,
  onDeleteTrail,
  onClearCurrentTrail,
  onNavigateToStep,
  isOpen,
  onClose,
  trailTree,
  currentNodeId,
  onSetCurrentNode,
}: TrailManagerProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [trailName, setTrailName] = useState('')
  const [activeTab, setActiveTab] = useState<'current' | 'saved'>('current')

  const handleSave = () => {
    if (trailName.trim()) {
      onSaveTrail(trailName.trim())
      setTrailName('')
      setSaveDialogOpen(false)
    }
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Trail Manager</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setActiveTab('current')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'current'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Current Trail
            {currentTrail && (
              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                {currentTrail.steps.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'saved'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Saved Trails
            {savedTrails.length > 0 && (
              <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">
                {savedTrails.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            {activeTab === 'current' ? (
              <motion.div
                key="current"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {currentTrail ? (
                  <div className="space-y-4">
                    {/* Current trail - tree view if available, otherwise linear */}
                    <div className="space-y-2">
                      {trailTree ? (
                        <TrailTreeNode
                          node={trailTree}
                          depth={0}
                          currentNodeId={currentNodeId}
                          onNavigate={(node) =>
                            onNavigateToStep(node.chunkKey.filePath, node.chunkKey.chunkIndex)
                          }
                          onSetCurrent={(nodeId) => onSetCurrentNode?.(nodeId)}
                        />
                      ) : (
                        currentTrail.steps.map((step, index) => (
                          <TrailStepItem
                            key={`${step.chunkKey.filePath}-${step.chunkKey.chunkIndex}-${index}`}
                            step={step}
                            index={index}
                            isLast={index === currentTrail.steps.length - 1}
                            onNavigate={() =>
                              onNavigateToStep(step.chunkKey.filePath, step.chunkKey.chunkIndex)
                            }
                          />
                        ))
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => setSaveDialogOpen(true)}
                        disabled={currentTrail.steps.length < 2}
                        className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Save Trail
                      </button>
                      <button
                        type="button"
                        onClick={onClearCurrentTrail}
                        className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <TrailIcon />
                    <p className="mt-2">No active trail</p>
                    <p className="text-sm mt-1">Navigate between documents to start recording</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="saved"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {savedTrails.length > 0 ? (
                  <div className="space-y-2">
                    {savedTrails.map((trail) => (
                      <SavedTrailItem
                        key={trail.id}
                        trail={trail}
                        onLoad={() => {
                          onLoadTrail(trail.id)
                          onClose()
                        }}
                        onDelete={() => onDeleteTrail(trail.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <BookmarkIcon />
                    <p className="mt-2">No saved trails</p>
                    <p className="text-sm mt-1">Save your explorations to revisit later</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Save Dialog */}
        <AnimatePresence>
          {saveDialogOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-xl"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 m-4 shadow-lg"
              >
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Save Trail
                </h3>
                <input
                  type="text"
                  value={trailName}
                  onChange={(e) => setTrailName(e.target.value)}
                  placeholder="Enter trail name..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave()
                    if (e.key === 'Escape') setSaveDialogOpen(false)
                  }}
                />
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!trailName.trim()}
                    className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveDialogOpen(false)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

interface TrailStepItemProps {
  step: { chunkKey: { filePath: string; chunkIndex: number }; connectionReason?: string }
  index: number
  isLast: boolean
  onNavigate: () => void
}

function TrailStepItem({ step, index, isLast, onNavigate }: TrailStepItemProps) {
  const displaySource = formatPath(step.chunkKey.filePath)

  return (
    <div className="flex items-start gap-2">
      {/* Step number */}
      <div className="flex flex-col items-center">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
            isLast
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          {index + 1}
        </div>
        {!isLast && <div className="w-0.5 h-4 bg-gray-200 dark:bg-gray-700" />}
      </div>

      {/* Step content */}
      <button
        type="button"
        onClick={onNavigate}
        className="flex-1 text-left p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {displaySource}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Chunk #{step.chunkKey.chunkIndex}
          {step.connectionReason && (
            <span className="ml-2 italic">via "{step.connectionReason}"</span>
          )}
        </div>
      </button>
    </div>
  )
}

interface SavedTrailItemProps {
  trail: Trail
  onLoad: () => void
  onDelete: () => void
}

function SavedTrailItem({ trail, onLoad, onDelete }: SavedTrailItemProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {trail.name}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {trail.steps.length} steps &middot; {new Date(trail.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {showConfirm ? (
            <>
              <button
                type="button"
                onClick={onDelete}
                className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onLoad}
                className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
              >
                Load
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function formatPath(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function TrailIcon() {
  return (
    <svg
      className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  )
}

function BookmarkIcon() {
  return (
    <svg
      className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
      />
    </svg>
  )
}

// ============================================
// Folgezettel Tree Components
// ============================================

interface TrailTreeNodeProps {
  node: TrailNode
  depth: number
  currentNodeId?: string | null
  onNavigate: (node: TrailNode) => void
  onSetCurrent: (nodeId: string) => void
}

function TrailTreeNode({
  node,
  depth,
  currentNodeId,
  onNavigate,
  onSetCurrent,
}: TrailTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const displaySource = formatPath(node.chunkKey.filePath)
  const isActive = node.id === currentNodeId
  const hasBranches = node.children.length > 1

  return (
    <div className="relative">
      {/* Node item */}
      <div className="flex items-start gap-2">
        {/* Expand/collapse for branches */}
        {hasBranches ? (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-1 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Branch label badge */}
        <div
          className={`
            flex items-center justify-center min-w-[2rem] h-6 px-1.5 rounded text-xs font-medium
            ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }
          `}
        >
          {node.branchLabel || depth + 1}
        </div>

        {/* Node content */}
        <button
          type="button"
          onClick={() => {
            onNavigate(node)
            onSetCurrent(node.id)
          }}
          className={`
            flex-1 text-left p-2 rounded-lg transition-colors
            ${
              isActive
                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                : 'hover:bg-gray-50 dark:hover:bg-gray-750'
            }
          `}
        >
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {displaySource}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Chunk #{node.chunkKey.chunkIndex}
            {node.connectionReason && (
              <span className="ml-2 italic">via "{node.connectionReason}"</span>
            )}
          </div>
        </button>
      </div>

      {/* Children (branches) */}
      {isExpanded && node.children.length > 0 && (
        <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
          {node.children.map((child) => (
            <TrailTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              currentNodeId={currentNodeId}
              onNavigate={onNavigate}
              onSetCurrent={onSetCurrent}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}
