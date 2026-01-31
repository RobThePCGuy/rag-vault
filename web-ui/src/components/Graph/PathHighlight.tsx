import type { PathHighlightState } from '../../utils/graphPathfinding'

// ============================================
// Types
// ============================================

interface PathHighlightInfoProps {
  pathState: PathHighlightState
  onCancel: () => void
}

// ============================================
// Component
// ============================================

/**
 * UI overlay showing pathfinding state and instructions
 */
export function PathHighlightInfo({ pathState, onCancel }: PathHighlightInfoProps) {
  if (!pathState.isActive) return null

  return (
    <div className="absolute top-2 right-2 z-10 bg-white/95 dark:bg-gray-800/95 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-3 py-2 max-w-xs">
      {pathState.mode === 'selecting-start' && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            Click to select start node
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Select the node to start the path from
          </p>
        </div>
      )}

      {pathState.mode === 'selecting-end' && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            Click to select end node
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Start: selected. Now select the destination.
          </p>
        </div>
      )}

      {pathState.mode === 'complete' && (
        <div className="space-y-2">
          {pathState.path.length > 0 ? (
            <>
              <p className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                <PathIcon className="w-4 h-4" />
                Path found!
              </p>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p>
                  Distance: <span className="font-medium">{pathState.path.length - 1} hops</span>
                </p>
                <p>
                  Nodes: <span className="font-medium">{pathState.path.length}</span>
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
              <NoPathIcon className="w-4 h-4" />
              No path found
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="mt-2 w-full px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
      >
        {pathState.mode === 'complete' ? 'Clear path' : 'Cancel'}
      </button>
    </div>
  )
}

// ============================================
// Color and Styling Helpers
// ============================================

export interface PathHighlightColors {
  startNode: string
  endNode: string
  pathEdge: string
  pathNode: string
}

export const PATH_HIGHLIGHT_COLORS: PathHighlightColors = {
  startNode: '#22c55e', // green-500
  endNode: '#ef4444', // red-500
  pathEdge: '#eab308', // yellow-500
  pathNode: '#f59e0b', // amber-500
}

/**
 * Get the highlight color for a node based on pathfinding state
 */
export function getNodePathColor(nodeId: string, pathState: PathHighlightState): string | null {
  if (!pathState.isActive) return null

  if (nodeId === pathState.startNode) {
    return PATH_HIGHLIGHT_COLORS.startNode
  }

  if (nodeId === pathState.endNode) {
    return PATH_HIGHLIGHT_COLORS.endNode
  }

  if (
    pathState.path.includes(nodeId) &&
    nodeId !== pathState.startNode &&
    nodeId !== pathState.endNode
  ) {
    return PATH_HIGHLIGHT_COLORS.pathNode
  }

  return null
}

/**
 * Check if an edge is part of the path
 */
export function isEdgeInPath(
  source: string,
  target: string,
  pathState: PathHighlightState
): boolean {
  if (!pathState.isActive || pathState.pathEdges.size === 0) return false
  return pathState.pathEdges.has(`${source}:${target}`)
}

// ============================================
// Icons
// ============================================

function PathIcon({ className }: { className?: string }) {
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

function NoPathIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      />
    </svg>
  )
}
