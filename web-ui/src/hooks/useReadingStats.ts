import { useCallback, useEffect, useRef } from 'react'
import { useReadingStatsContext, type DocumentReadingStats, type ReadingSession } from '../contexts/ReadingStatsContext'

// ============================================
// Types
// ============================================

interface UseReadingStatsOptions {
  filePath: string
  totalChunks: number
  activeChunkIndex: number | null
  enabled?: boolean
  /** Minimum time in ms to count as meaningful view */
  minViewTimeMs?: number
}

interface UseReadingStatsResult {
  /** Stats for the current document */
  stats: DocumentReadingStats | undefined
  /** Completion percentage (0-100) */
  completionPercent: number
  /** Total time spent reading in ms */
  totalTimeMs: number
  /** Average time per chunk in ms */
  averageTimePerChunk: number
  /** Recent reading sessions */
  sessions: ReadingSession[]
  /** Check if a chunk has been read */
  isChunkRead: (chunkIndex: number) => boolean
  /** Get time spent on a specific chunk */
  getChunkTime: (chunkIndex: number) => number
  /** Export stats as JSON */
  exportStats: () => string
  /** Clear stats for this document */
  clearStats: () => void
}

// ============================================
// Hook
// ============================================

/**
 * Hook for tracking and retrieving reading statistics for a document
 */
export function useReadingStats({
  filePath,
  totalChunks,
  activeChunkIndex,
  enabled = true,
  minViewTimeMs = 1000,
}: UseReadingStatsOptions): UseReadingStatsResult {
  const ctx = useReadingStatsContext()

  // Track time spent on current chunk
  const chunkStartTime = useRef<number | null>(null)
  const lastChunkIndex = useRef<number | null>(null)
  const isWindowFocused = useRef(true)

  // Handle window focus/blur for pausing time tracking
  useEffect(() => {
    if (!enabled) return

    const handleFocus = () => {
      isWindowFocused.current = true
      // Resume timing
      if (activeChunkIndex !== null && chunkStartTime.current === null) {
        chunkStartTime.current = Date.now()
      }
    }

    const handleBlur = () => {
      isWindowFocused.current = false
      // Pause timing - record current time
      if (activeChunkIndex !== null && chunkStartTime.current !== null) {
        const timeSpent = Date.now() - chunkStartTime.current
        if (timeSpent >= minViewTimeMs) {
          ctx.recordTimeSpent(filePath, activeChunkIndex, timeSpent)
        }
        chunkStartTime.current = null
      }
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [enabled, filePath, activeChunkIndex, minViewTimeMs, ctx])

  // Track chunk changes
  useEffect(() => {
    if (!enabled || activeChunkIndex === null) return

    // Record time for previous chunk
    if (
      lastChunkIndex.current !== null &&
      lastChunkIndex.current !== activeChunkIndex &&
      chunkStartTime.current !== null
    ) {
      const timeSpent = Date.now() - chunkStartTime.current
      if (timeSpent >= minViewTimeMs) {
        ctx.recordTimeSpent(filePath, lastChunkIndex.current, timeSpent)
      }
    }

    // Record view of new chunk
    ctx.recordChunkView(filePath, activeChunkIndex, totalChunks)

    // Start timing new chunk
    if (isWindowFocused.current) {
      chunkStartTime.current = Date.now()
    } else {
      chunkStartTime.current = null
    }
    lastChunkIndex.current = activeChunkIndex
  }, [enabled, filePath, activeChunkIndex, totalChunks, minViewTimeMs, ctx])

  // Start session on mount, end on unmount
  useEffect(() => {
    if (!enabled) return

    ctx.startSession(filePath)

    return () => {
      // Record final chunk time
      if (lastChunkIndex.current !== null && chunkStartTime.current !== null) {
        const timeSpent = Date.now() - chunkStartTime.current
        if (timeSpent >= minViewTimeMs) {
          ctx.recordTimeSpent(filePath, lastChunkIndex.current, timeSpent)
        }
      }
      ctx.endSession(filePath)
    }
  }, [enabled, filePath, minViewTimeMs, ctx])

  // Get current stats
  const stats = ctx.getDocumentStats(filePath)
  const completionPercent = ctx.getCompletionPercent(filePath)
  const totalTimeMs = ctx.getTotalReadingTime(filePath)
  const averageTimePerChunk = ctx.getAverageTimePerChunk(filePath)

  const isChunkRead = useCallback(
    (chunkIndex: number): boolean => {
      const chunkStats = ctx.getChunkStats(filePath, chunkIndex)
      return chunkStats !== undefined && chunkStats.readCount > 0
    },
    [ctx, filePath]
  )

  const getChunkTime = useCallback(
    (chunkIndex: number): number => {
      const chunkStats = ctx.getChunkStats(filePath, chunkIndex)
      return chunkStats?.totalTimeMs ?? 0
    },
    [ctx, filePath]
  )

  const exportStats = useCallback(() => {
    const docStats = ctx.getDocumentStats(filePath)
    if (!docStats) return '{}'
    return JSON.stringify(docStats, null, 2)
  }, [ctx, filePath])

  const clearStats = useCallback(() => {
    ctx.clearStats(filePath)
  }, [ctx, filePath])

  return {
    stats,
    completionPercent,
    totalTimeMs,
    averageTimePerChunk,
    sessions: stats?.sessions ?? [],
    isChunkRead,
    getChunkTime,
    exportStats,
    clearStats,
  }
}

// ============================================
// Helpers
// ============================================

export function formatReadingTime(ms: number): string {
  if (ms < 1000) return '<1s'

  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}
