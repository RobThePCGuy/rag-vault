import { useCallback, useState } from 'react'
import type { RelatedChunk } from '../api/client'
import type { ChunkKey } from '../contexts/LinksContext'

// ============================================
// Types
// ============================================

export interface DiscoverySuggestion {
  chunk: RelatedChunk
  reason: 'high_similarity' | 'different_document' | 'unexplored_topic'
  priority: number
}

export interface DiscoveryStep {
  chunkKey: ChunkKey
  text: string
  timestamp: string
}

interface UseDiscoveryModeOptions {
  currentFilePath: string
  currentChunkIndex: number | null
  currentChunkText: string
  relatedChunks: RelatedChunk[]
  onSaveTrail?: (steps: DiscoveryStep[], name: string) => void
}

interface UseDiscoveryModeResult {
  isActive: boolean
  currentStep: DiscoveryStep | null
  history: DiscoveryStep[]
  suggestions: DiscoverySuggestion[]
  startDiscovery: () => void
  stopDiscovery: () => void
  goToChunk: (chunk: RelatedChunk) => void
  goBack: () => boolean
  saveAsTrail: (name: string) => void
  canGoBack: boolean
}

// ============================================
// Hook
// ============================================

/**
 * Hook for managing discovery mode - interactive exploration through semantic connections
 */
export function useDiscoveryMode({
  currentFilePath,
  currentChunkIndex,
  currentChunkText,
  relatedChunks,
  onSaveTrail,
}: UseDiscoveryModeOptions): UseDiscoveryModeResult {
  const [isActive, setIsActive] = useState(false)
  const [history, setHistory] = useState<DiscoveryStep[]>([])

  // Generate suggestions from related chunks
  const suggestions = generateSuggestions(relatedChunks, currentFilePath, history)

  // Current step
  const currentStep: DiscoveryStep | null =
    currentChunkIndex !== null
      ? {
          chunkKey: { filePath: currentFilePath, chunkIndex: currentChunkIndex },
          text: currentChunkText,
          timestamp: new Date().toISOString(),
        }
      : null

  const startDiscovery = useCallback(() => {
    if (currentStep) {
      setHistory([currentStep])
    }
    setIsActive(true)
  }, [currentStep])

  const stopDiscovery = useCallback(() => {
    setIsActive(false)
    setHistory([])
  }, [])

  const goToChunk = useCallback((chunk: RelatedChunk) => {
    const step: DiscoveryStep = {
      chunkKey: { filePath: chunk.filePath, chunkIndex: chunk.chunkIndex },
      text: chunk.text,
      timestamp: new Date().toISOString(),
    }
    setHistory((prev) => [...prev, step])
  }, [])

  const goBack = useCallback((): boolean => {
    if (history.length <= 1) return false
    setHistory((prev) => prev.slice(0, -1))
    return true
  }, [history.length])

  const saveAsTrail = useCallback(
    (name: string) => {
      if (history.length === 0) return

      // Save the trail through the callback if provided
      if (onSaveTrail) {
        onSaveTrail(history, name)
      }

      // Stop discovery after saving
      stopDiscovery()
    },
    [history, stopDiscovery, onSaveTrail]
  )

  return {
    isActive,
    currentStep,
    history,
    suggestions,
    startDiscovery,
    stopDiscovery,
    goToChunk,
    goBack,
    saveAsTrail,
    canGoBack: history.length > 1,
  }
}

// ============================================
// Helpers
// ============================================

function generateSuggestions(
  relatedChunks: RelatedChunk[],
  currentFilePath: string,
  history: DiscoveryStep[]
): DiscoverySuggestion[] {
  // Build a set of visited chunks
  const visitedKeys = new Set<string>()
  for (const step of history) {
    visitedKeys.add(`${step.chunkKey.filePath}:${step.chunkKey.chunkIndex}`)
  }

  return relatedChunks
    .filter((chunk) => {
      // Filter out already visited chunks
      const key = `${chunk.filePath}:${chunk.chunkIndex}`
      return !visitedKeys.has(key)
    })
    .map((chunk): DiscoverySuggestion => {
      const isDifferentDoc = chunk.filePath !== currentFilePath
      const isHighSimilarity = chunk.score < 0.4

      let reason: DiscoverySuggestion['reason']
      let priority: number

      if (isHighSimilarity && isDifferentDoc) {
        reason = 'high_similarity'
        priority = 1 // Highest priority
      } else if (isDifferentDoc) {
        reason = 'different_document'
        priority = 2
      } else if (isHighSimilarity) {
        reason = 'high_similarity'
        priority = 3
      } else {
        reason = 'unexplored_topic'
        priority = 4
      }

      return { chunk, reason, priority }
    })
    .sort((a, b) => {
      // Sort by priority first, then by score (lower = more similar = first)
      if (a.priority !== b.priority) return a.priority - b.priority
      return a.chunk.score - b.chunk.score
    })
    .slice(0, 5) as DiscoverySuggestion[] // Limit to top 5 suggestions
}

/**
 * Get human-readable reason text
 */
export function getSuggestionReasonText(reason: DiscoverySuggestion['reason']): string {
  switch (reason) {
    case 'high_similarity':
      return 'Highly similar content'
    case 'different_document':
      return 'Cross-document connection'
    case 'unexplored_topic':
      return 'Explore further'
    default:
      return 'Related'
  }
}
