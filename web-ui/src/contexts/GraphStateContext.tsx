import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

// ============================================
// Types
// ============================================

export interface SavedNodePosition {
  x: number
  y: number
  fixedAt?: string // ISO timestamp when position was fixed
}

export interface GraphViewState {
  pan: { x: number; y: number }
  zoom: number
}

export interface GraphStateStore {
  version: 1
  vaultId: string
  nodePositions: Record<string, SavedNodePosition>
  viewState: GraphViewState
}

export interface GraphStateContextValue {
  // Node positions
  nodePositions: Record<string, SavedNodePosition>
  getNodePosition: (nodeId: string) => SavedNodePosition | undefined
  setNodePosition: (nodeId: string, position: { x: number; y: number }) => void
  clearNodePositions: () => void

  // View state
  viewState: GraphViewState
  setPan: (pan: { x: number; y: number }) => void
  setZoom: (zoom: number) => void
  setViewState: (viewState: GraphViewState) => void
  resetViewState: () => void

  // Full reset
  resetAll: () => void

  // Export/Import
  exportGraphState: () => string
  importGraphState: (json: string) => { success: boolean; error?: string }
}

// ============================================
// Constants
// ============================================

const DEFAULT_VIEW_STATE: GraphViewState = {
  pan: { x: 0, y: 0 },
  zoom: 1,
}

const DEFAULT_STORE: GraphStateStore = {
  version: 1,
  vaultId: '',
  nodePositions: {},
  viewState: DEFAULT_VIEW_STATE,
}

// ============================================
// Context
// ============================================

const GraphStateContext = createContext<GraphStateContextValue | null>(null)

interface GraphStateProviderProps {
  children: ReactNode
  vaultId?: string
}

/**
 * Provider for persisting graph node positions and view state
 */
export function GraphStateProvider({ children, vaultId = 'default' }: GraphStateProviderProps) {
  const storageKey = `rag-vault-graph-state-v1-${vaultId}`
  const [store, setStore] = useLocalStorage<GraphStateStore>(storageKey, {
    ...DEFAULT_STORE,
    vaultId,
  })

  // ============================================
  // Node Position Operations
  // ============================================

  const getNodePosition = useCallback(
    (nodeId: string): SavedNodePosition | undefined => {
      return store.nodePositions[nodeId]
    },
    [store.nodePositions]
  )

  const setNodePosition = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      setStore((prev) => ({
        ...prev,
        nodePositions: {
          ...prev.nodePositions,
          [nodeId]: {
            x: position.x,
            y: position.y,
            fixedAt: new Date().toISOString(),
          },
        },
      }))
    },
    [setStore]
  )

  const clearNodePositions = useCallback(() => {
    setStore((prev) => ({
      ...prev,
      nodePositions: {},
    }))
  }, [setStore])

  // ============================================
  // View State Operations
  // ============================================

  const setPan = useCallback(
    (pan: { x: number; y: number }) => {
      setStore((prev) => ({
        ...prev,
        viewState: {
          ...prev.viewState,
          pan,
        },
      }))
    },
    [setStore]
  )

  const setZoom = useCallback(
    (zoom: number) => {
      setStore((prev) => ({
        ...prev,
        viewState: {
          ...prev.viewState,
          zoom,
        },
      }))
    },
    [setStore]
  )

  const setViewState = useCallback(
    (viewState: GraphViewState) => {
      setStore((prev) => ({
        ...prev,
        viewState,
      }))
    },
    [setStore]
  )

  const resetViewState = useCallback(() => {
    setStore((prev) => ({
      ...prev,
      viewState: DEFAULT_VIEW_STATE,
    }))
  }, [setStore])

  // ============================================
  // Full Reset
  // ============================================

  const resetAll = useCallback(() => {
    setStore((prev) => ({
      ...DEFAULT_STORE,
      vaultId: prev.vaultId,
    }))
  }, [setStore])

  // ============================================
  // Export/Import
  // ============================================

  const exportGraphState = useCallback((): string => {
    return JSON.stringify(store, null, 2)
  }, [store])

  const importGraphState = useCallback(
    (json: string): { success: boolean; error?: string } => {
      try {
        const data = JSON.parse(json) as GraphStateStore

        if (data.version !== 1) {
          return { success: false, error: `Unsupported version: ${data.version}` }
        }

        setStore((prev) => ({
          ...prev,
          nodePositions: data.nodePositions || {},
          viewState: data.viewState || DEFAULT_VIEW_STATE,
        }))

        return { success: true }
      } catch (e) {
        return { success: false, error: `Invalid JSON: ${(e as Error).message}` }
      }
    },
    [setStore]
  )

  // ============================================
  // Context Value
  // ============================================

  const value = useMemo<GraphStateContextValue>(
    () => ({
      nodePositions: store.nodePositions,
      getNodePosition,
      setNodePosition,
      clearNodePositions,
      viewState: store.viewState,
      setPan,
      setZoom,
      setViewState,
      resetViewState,
      resetAll,
      exportGraphState,
      importGraphState,
    }),
    [
      store.nodePositions,
      store.viewState,
      getNodePosition,
      setNodePosition,
      clearNodePositions,
      setPan,
      setZoom,
      setViewState,
      resetViewState,
      resetAll,
      exportGraphState,
      importGraphState,
    ]
  )

  return <GraphStateContext.Provider value={value}>{children}</GraphStateContext.Provider>
}

export function useGraphState(): GraphStateContextValue {
  const context = useContext(GraphStateContext)
  if (!context) {
    throw new Error('useGraphState must be used within a GraphStateProvider')
  }
  return context
}
