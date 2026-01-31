import { useCallback, useEffect, useRef } from 'react'
import { useLocalStorage } from './useLocalStorage'

interface LatestPosition {
  chunkIndex: number
  scrollOffset: number
}

interface ChunkProgress {
  lastChunkIndex: number
  scrollOffsetWithinChunk: number
  lastVisited: string
  fileFingerprint: string
}

interface ReadingProgress {
  [progressKey: string]: ChunkProgress
}

interface UseReadingProgressOptions {
  filePath: string
  chunks: Array<{ text: string; chunkIndex: number }>
  activeChunkIndex: number | null
  vaultId?: string
  debounceMs?: number
}

interface UseReadingProgressResult {
  /** Restore saved position - call after chunks are rendered */
  restorePosition: () => { chunkIndex: number; scrollOffset: number } | null
  /** Save current position - called automatically on scroll */
  savePosition: (chunkIndex: number, scrollOffset: number) => void
  /** Check if there's a saved position for this file */
  hasSavedPosition: boolean
  /** Get the saved chunk index (for UI display) */
  savedChunkIndex: number | null
}

/**
 * Generate a fingerprint from the first chunk's text
 * Used to detect if a file has been re-ingested
 */
async function generateFingerprint(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text.slice(0, 500)) // Use first 500 chars
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray
    .slice(0, 8) // Just use first 8 bytes for shorter fingerprint
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Hook for persisting and restoring reading progress
 * Stores position by file path + fingerprint to handle re-ingestion
 */
export function useReadingProgress({
  filePath,
  chunks,
  activeChunkIndex,
  vaultId = 'default',
  debounceMs = 1000,
}: UseReadingProgressOptions): UseReadingProgressResult {
  const storageKey = `rag-vault-reading-progress-${vaultId}`
  const [progress, setProgress] = useLocalStorage<ReadingProgress>(storageKey, {})

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentFingerprintRef = useRef<string | null>(null)
  const hasRestoredRef = useRef(false)
  const latestPositionRef = useRef<LatestPosition>({ chunkIndex: 0, scrollOffset: 0 })

  // Generate fingerprint from first chunk
  useEffect(() => {
    if (chunks.length > 0) {
      const firstChunk = chunks[0]
      if (firstChunk) {
        generateFingerprint(firstChunk.text).then((fp) => {
          currentFingerprintRef.current = fp
        })
      }
    }
  }, [chunks])

  // Build progress key
  const getProgressKey = useCallback(
    (fingerprint: string): string => {
      return `${filePath}:${fingerprint}`
    },
    [filePath]
  )

  // Check if there's a saved position
  const savedProgress = Object.entries(progress).find(([key]) => key.startsWith(`${filePath}:`))
  const hasSavedPosition = !!savedProgress
  const savedChunkIndex = savedProgress ? savedProgress[1].lastChunkIndex : null

  // Save position with debouncing
  const savePosition = useCallback(
    (chunkIndex: number, scrollOffset: number) => {
      if (!currentFingerprintRef.current) return

      // Store latest position in ref to avoid stale closure
      latestPositionRef.current = { chunkIndex, scrollOffset }

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Debounce save - use ref to get latest position when timeout fires
      saveTimeoutRef.current = setTimeout(() => {
        const fingerprint = currentFingerprintRef.current
        if (!fingerprint) return

        const { chunkIndex: latestChunkIndex, scrollOffset: latestScrollOffset } =
          latestPositionRef.current
        const key = getProgressKey(fingerprint)
        setProgress((prev) => ({
          ...prev,
          [key]: {
            lastChunkIndex: latestChunkIndex,
            scrollOffsetWithinChunk: latestScrollOffset,
            lastVisited: new Date().toISOString(),
            fileFingerprint: fingerprint,
          },
        }))
      }, debounceMs)
    },
    [getProgressKey, setProgress, debounceMs]
  )

  // Auto-save on active chunk change
  useEffect(() => {
    if (activeChunkIndex !== null && hasRestoredRef.current) {
      // Get scroll offset within the chunk element
      const chunkElement = document.getElementById(`chunk-${activeChunkIndex}`)
      const scrollOffset = chunkElement ? chunkElement.getBoundingClientRect().top : 0
      savePosition(activeChunkIndex, scrollOffset)
    }
  }, [activeChunkIndex, savePosition])

  // Restore position
  const restorePosition = useCallback((): { chunkIndex: number; scrollOffset: number } | null => {
    if (!currentFingerprintRef.current || chunks.length === 0) return null

    const fingerprint = currentFingerprintRef.current
    const key = getProgressKey(fingerprint)
    const saved = progress[key]

    if (!saved) {
      // Check for position with different fingerprint (file changed)
      const oldEntry = Object.entries(progress).find(([k]) => k.startsWith(`${filePath}:`))
      if (oldEntry) {
        // File has been re-ingested, fall back to chunk 0
        hasRestoredRef.current = true
        return { chunkIndex: 0, scrollOffset: 0 }
      }
      hasRestoredRef.current = true
      return null
    }

    // Verify fingerprint matches
    if (saved.fileFingerprint !== fingerprint) {
      // Fingerprint mismatch - file has changed, start from beginning
      hasRestoredRef.current = true
      return { chunkIndex: 0, scrollOffset: 0 }
    }

    hasRestoredRef.current = true
    return {
      chunkIndex: Math.min(saved.lastChunkIndex, chunks.length - 1),
      scrollOffset: saved.scrollOffsetWithinChunk,
    }
  }, [filePath, chunks, progress, getProgressKey])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    restorePosition,
    savePosition,
    hasSavedPosition,
    savedChunkIndex,
  }
}
