import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

// ============================================
// Types
// ============================================

export interface ChunkStat {
  totalTimeMs: number
  readCount: number
  lastReadAt: string
}

export interface ReadingSession {
  startedAt: string
  endedAt: string
  durationMs: number
}

export interface DocumentReadingStats {
  filePath: string
  totalChunks: number
  chunksRead: number
  totalTimeMs: number
  sessions: ReadingSession[]
  chunkStats: Record<number, ChunkStat>
}

export interface ReadingStatsStore {
  version: 1
  vaultId: string
  documents: Record<string, DocumentReadingStats>
}

export interface ReadingStatsContextValue {
  // Get stats for a document
  getDocumentStats: (filePath: string) => DocumentReadingStats | undefined
  getChunkStats: (filePath: string, chunkIndex: number) => ChunkStat | undefined

  // Recording
  recordChunkView: (filePath: string, chunkIndex: number, totalChunks: number) => void
  recordTimeSpent: (filePath: string, chunkIndex: number, timeMs: number) => void
  startSession: (filePath: string) => void
  endSession: (filePath: string) => void

  // Computed stats
  getCompletionPercent: (filePath: string) => number
  getTotalReadingTime: (filePath: string) => number
  getAverageTimePerChunk: (filePath: string) => number

  // Export
  exportStats: () => string
  clearStats: (filePath?: string) => void
}

// ============================================
// Constants
// ============================================

const DEFAULT_STORE: ReadingStatsStore = {
  version: 1,
  vaultId: '',
  documents: {},
}

const MAX_SESSIONS = 10

// ============================================
// Context
// ============================================

const ReadingStatsContext = createContext<ReadingStatsContextValue | null>(null)

interface ReadingStatsProviderProps {
  children: ReactNode
  vaultId?: string
}

/**
 * Provider for tracking reading statistics
 */
export function ReadingStatsProvider({ children, vaultId = 'default' }: ReadingStatsProviderProps) {
  const storageKey = `rag-vault-reading-stats-v1-${vaultId}`
  const [store, setStore] = useLocalStorage<ReadingStatsStore>(storageKey, {
    ...DEFAULT_STORE,
    vaultId,
  })

  // ============================================
  // Get Operations
  // ============================================

  const getDocumentStats = useCallback(
    (filePath: string): DocumentReadingStats | undefined => {
      return store.documents[filePath]
    },
    [store.documents]
  )

  const getChunkStats = useCallback(
    (filePath: string, chunkIndex: number): ChunkStat | undefined => {
      const docStats = store.documents[filePath]
      if (!docStats) return undefined
      return docStats.chunkStats[chunkIndex]
    },
    [store.documents]
  )

  // ============================================
  // Recording Operations
  // ============================================

  const ensureDocumentStats = useCallback(
    (filePath: string, totalChunks: number): DocumentReadingStats => {
      const existing = store.documents[filePath]
      if (existing) {
        // Update totalChunks if changed
        if (existing.totalChunks !== totalChunks) {
          return { ...existing, totalChunks }
        }
        return existing
      }
      return {
        filePath,
        totalChunks,
        chunksRead: 0,
        totalTimeMs: 0,
        sessions: [],
        chunkStats: {},
      }
    },
    [store.documents]
  )

  const recordChunkView = useCallback(
    (filePath: string, chunkIndex: number, totalChunks: number) => {
      setStore((prev) => {
        const docStats = ensureDocumentStats(filePath, totalChunks)
        const chunkStat = docStats.chunkStats[chunkIndex] || {
          totalTimeMs: 0,
          readCount: 0,
          lastReadAt: '',
        }

        const isFirstRead = chunkStat.readCount === 0
        const updatedChunkStat: ChunkStat = {
          ...chunkStat,
          readCount: chunkStat.readCount + 1,
          lastReadAt: new Date().toISOString(),
        }

        const updatedDocStats: DocumentReadingStats = {
          ...docStats,
          chunksRead: isFirstRead ? docStats.chunksRead + 1 : docStats.chunksRead,
          chunkStats: {
            ...docStats.chunkStats,
            [chunkIndex]: updatedChunkStat,
          },
        }

        return {
          ...prev,
          documents: {
            ...prev.documents,
            [filePath]: updatedDocStats,
          },
        }
      })
    },
    [setStore, ensureDocumentStats]
  )

  const recordTimeSpent = useCallback(
    (filePath: string, chunkIndex: number, timeMs: number) => {
      if (timeMs <= 0) return

      setStore((prev) => {
        const docStats = prev.documents[filePath]
        if (!docStats) return prev

        const chunkStat = docStats.chunkStats[chunkIndex]
        if (!chunkStat) return prev

        const updatedChunkStat: ChunkStat = {
          ...chunkStat,
          totalTimeMs: chunkStat.totalTimeMs + timeMs,
        }

        const updatedDocStats: DocumentReadingStats = {
          ...docStats,
          totalTimeMs: docStats.totalTimeMs + timeMs,
          chunkStats: {
            ...docStats.chunkStats,
            [chunkIndex]: updatedChunkStat,
          },
        }

        return {
          ...prev,
          documents: {
            ...prev.documents,
            [filePath]: updatedDocStats,
          },
        }
      })
    },
    [setStore]
  )

  const startSession = useCallback(
    (filePath: string) => {
      setStore((prev) => {
        const docStats = prev.documents[filePath]
        if (!docStats) return prev

        // Check if there's already an open session
        const lastSession = docStats.sessions[docStats.sessions.length - 1]
        if (lastSession && !lastSession.endedAt) {
          return prev // Session already open
        }

        const newSession: ReadingSession = {
          startedAt: new Date().toISOString(),
          endedAt: '',
          durationMs: 0,
        }

        const sessions = [...docStats.sessions, newSession].slice(-MAX_SESSIONS)

        return {
          ...prev,
          documents: {
            ...prev.documents,
            [filePath]: {
              ...docStats,
              sessions,
            },
          },
        }
      })
    },
    [setStore]
  )

  const endSession = useCallback(
    (filePath: string) => {
      setStore((prev) => {
        const docStats = prev.documents[filePath]
        if (!docStats) return prev

        const sessions = [...docStats.sessions]
        const lastSession = sessions[sessions.length - 1]

        if (!lastSession || lastSession.endedAt) {
          return prev // No open session
        }

        const endedAt = new Date().toISOString()
        const durationMs =
          new Date(endedAt).getTime() - new Date(lastSession.startedAt).getTime()

        sessions[sessions.length - 1] = {
          ...lastSession,
          endedAt,
          durationMs,
        }

        return {
          ...prev,
          documents: {
            ...prev.documents,
            [filePath]: {
              ...docStats,
              sessions,
            },
          },
        }
      })
    },
    [setStore]
  )

  // ============================================
  // Computed Stats
  // ============================================

  const getCompletionPercent = useCallback(
    (filePath: string): number => {
      const docStats = store.documents[filePath]
      if (!docStats || docStats.totalChunks === 0) return 0
      return Math.round((docStats.chunksRead / docStats.totalChunks) * 100)
    },
    [store.documents]
  )

  const getTotalReadingTime = useCallback(
    (filePath: string): number => {
      const docStats = store.documents[filePath]
      return docStats?.totalTimeMs ?? 0
    },
    [store.documents]
  )

  const getAverageTimePerChunk = useCallback(
    (filePath: string): number => {
      const docStats = store.documents[filePath]
      if (!docStats || docStats.chunksRead === 0) return 0
      return Math.round(docStats.totalTimeMs / docStats.chunksRead)
    },
    [store.documents]
  )

  // ============================================
  // Export/Clear
  // ============================================

  const exportStats = useCallback((): string => {
    return JSON.stringify(store, null, 2)
  }, [store])

  const clearStats = useCallback(
    (filePath?: string) => {
      if (filePath) {
        setStore((prev) => {
          const { [filePath]: _, ...rest } = prev.documents
          return { ...prev, documents: rest }
        })
      } else {
        setStore((prev) => ({ ...prev, documents: {} }))
      }
    },
    [setStore]
  )

  // ============================================
  // Context Value
  // ============================================

  const value = useMemo<ReadingStatsContextValue>(
    () => ({
      getDocumentStats,
      getChunkStats,
      recordChunkView,
      recordTimeSpent,
      startSession,
      endSession,
      getCompletionPercent,
      getTotalReadingTime,
      getAverageTimePerChunk,
      exportStats,
      clearStats,
    }),
    [
      getDocumentStats,
      getChunkStats,
      recordChunkView,
      recordTimeSpent,
      startSession,
      endSession,
      getCompletionPercent,
      getTotalReadingTime,
      getAverageTimePerChunk,
      exportStats,
      clearStats,
    ]
  )

  return <ReadingStatsContext.Provider value={value}>{children}</ReadingStatsContext.Provider>
}

export function useReadingStatsContext(): ReadingStatsContextValue {
  const context = useContext(ReadingStatsContext)
  if (!context) {
    throw new Error('useReadingStatsContext must be used within a ReadingStatsProvider')
  }
  return context
}
