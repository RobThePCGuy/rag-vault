import { useCallback, useEffect, useRef } from 'react'
import {
  useGraphState,
  type SavedNodePosition,
  type GraphViewState,
} from '../contexts/GraphStateContext'

// ============================================
// Types
// ============================================

interface UseGraphStatePersistenceOptions {
  /** Debounce delay for saving positions (ms) */
  debounceMs?: number
  /** Whether persistence is enabled */
  enabled?: boolean
}

interface UseGraphStatePersistenceResult {
  /** Get saved position for a node */
  getPosition: (nodeId: string) => SavedNodePosition | undefined
  /** Save a node's position (debounced) */
  savePosition: (nodeId: string, x: number, y: number) => void
  /** Get saved view state */
  viewState: GraphViewState
  /** Save view state (debounced) */
  saveViewState: (viewState: GraphViewState) => void
  /** Reset layout - clears all saved positions */
  resetLayout: () => void
  /** Whether there are any saved positions */
  hasStoredPositions: boolean
}

// ============================================
// Hook
// ============================================

/**
 * Hook for persisting graph node positions and view state with debouncing
 */
export function useGraphStatePersistence({
  debounceMs = 500,
  enabled = true,
}: UseGraphStatePersistenceOptions = {}): UseGraphStatePersistenceResult {
  const { nodePositions, getNodePosition, setNodePosition, viewState, setViewState, resetAll } =
    useGraphState()

  // Debounce timers
  const positionTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const viewStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all pending timers
      for (const timer of positionTimerRef.current.values()) {
        clearTimeout(timer)
      }
      if (viewStateTimerRef.current) {
        clearTimeout(viewStateTimerRef.current)
      }
    }
  }, [])

  const savePosition = useCallback(
    (nodeId: string, x: number, y: number) => {
      if (!enabled) return

      // Cancel any existing timer for this node
      const existingTimer = positionTimerRef.current.get(nodeId)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      // Set new debounced timer
      const timer = setTimeout(() => {
        setNodePosition(nodeId, { x, y })
        positionTimerRef.current.delete(nodeId)
      }, debounceMs)

      positionTimerRef.current.set(nodeId, timer)
    },
    [enabled, debounceMs, setNodePosition]
  )

  const saveViewState = useCallback(
    (newViewState: GraphViewState) => {
      if (!enabled) return

      // Cancel existing timer
      if (viewStateTimerRef.current) {
        clearTimeout(viewStateTimerRef.current)
      }

      // Set new debounced timer
      viewStateTimerRef.current = setTimeout(() => {
        setViewState(newViewState)
        viewStateTimerRef.current = null
      }, debounceMs)
    },
    [enabled, debounceMs, setViewState]
  )

  const resetLayout = useCallback(() => {
    // Clear all pending timers first
    for (const timer of positionTimerRef.current.values()) {
      clearTimeout(timer)
    }
    positionTimerRef.current.clear()

    if (viewStateTimerRef.current) {
      clearTimeout(viewStateTimerRef.current)
      viewStateTimerRef.current = null
    }

    // Clear stored positions and view state
    resetAll()
  }, [resetAll])

  const hasStoredPositions = Object.keys(nodePositions).length > 0

  return {
    getPosition: enabled ? getNodePosition : () => undefined,
    savePosition,
    viewState: enabled ? viewState : { pan: { x: 0, y: 0 }, zoom: 1 },
    saveViewState,
    resetLayout,
    hasStoredPositions,
  }
}
