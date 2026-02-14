import { useCallback, useRef, useState } from 'react'

// ============================================
// Types
// ============================================

export interface ComparisonChunk {
  filePath: string
  chunkIndex: number
  text: string
}

interface UseChunkComparisonResult {
  isComparing: boolean
  leftChunk: ComparisonChunk | null
  rightChunk: ComparisonChunk | null
  setLeftChunk: (chunk: ComparisonChunk | null) => void
  setRightChunk: (chunk: ComparisonChunk | null) => void
  swapChunks: () => void
  openComparison: (initialChunk: ComparisonChunk) => void
  closeComparison: () => void
  clearChunks: () => void
}

// ============================================
// Hook
// ============================================

/**
 * Hook for managing chunk comparison view state
 */
export function useChunkComparison(): UseChunkComparisonResult {
  const [isComparing, setIsComparing] = useState(false)
  const [leftChunk, setLeftChunk] = useState<ComparisonChunk | null>(null)
  const [rightChunk, setRightChunk] = useState<ComparisonChunk | null>(null)

  // Use refs to hold current values for swap to avoid stale closures
  const leftChunkRef = useRef(leftChunk)
  const rightChunkRef = useRef(rightChunk)
  leftChunkRef.current = leftChunk
  rightChunkRef.current = rightChunk

  const openComparison = useCallback((initialChunk: ComparisonChunk) => {
    setLeftChunk(initialChunk)
    setRightChunk(null)
    setIsComparing(true)
  }, [])

  const closeComparison = useCallback(() => {
    setIsComparing(false)
  }, [])

  const swapChunks = useCallback(() => {
    // Use refs to get current values and avoid stale closure issues
    const currentLeft = leftChunkRef.current
    const currentRight = rightChunkRef.current
    setLeftChunk(currentRight)
    setRightChunk(currentLeft)
  }, [])

  const clearChunks = useCallback(() => {
    setLeftChunk(null)
    setRightChunk(null)
  }, [])

  return {
    isComparing,
    leftChunk,
    rightChunk,
    setLeftChunk,
    setRightChunk,
    swapChunks,
    openComparison,
    closeComparison,
    clearChunks,
  }
}

// ============================================
// Diff utilities
// ============================================

export interface DiffSegment {
  text: string
  type: 'same' | 'added' | 'removed'
}

/**
 * Simple word-level diff between two texts
 * Returns segments marked as same, added, or removed
 */
export function computeWordDiff(
  left: string,
  right: string
): {
  leftSegments: DiffSegment[]
  rightSegments: DiffSegment[]
} {
  const leftWords = tokenize(left)
  const rightWords = tokenize(right)

  // Build LCS (longest common subsequence)
  const lcs = findLCS(leftWords, rightWords)
  const lcsSet = new Set(lcs.map((w) => `${w.index}:${w.word}`))

  // Build segments for left
  const leftSegments: DiffSegment[] = []
  let currentLeftSegment: DiffSegment | null = null

  for (let i = 0; i < leftWords.length; i++) {
    const word = leftWords[i] ?? ''
    const isCommon = lcsSet.has(`${i}:${word}`)
    const type: 'same' | 'removed' = isCommon ? 'same' : 'removed'

    if (currentLeftSegment && currentLeftSegment.type === type) {
      currentLeftSegment.text += word
    } else {
      if (currentLeftSegment) {
        leftSegments.push(currentLeftSegment)
      }
      currentLeftSegment = { text: word, type }
    }
  }
  if (currentLeftSegment) {
    leftSegments.push(currentLeftSegment)
  }

  // Build segments for right
  const rightSegments: DiffSegment[] = []
  let currentRightSegment: DiffSegment | null = null

  // For right side, we need to track which words are in left's LCS
  const rightLcsSet = new Set<number>()
  let lcsIndex = 0
  for (let i = 0; i < rightWords.length && lcsIndex < lcs.length; i++) {
    const lcsItem = lcs[lcsIndex]
    if (lcsItem && rightWords[i] === lcsItem.word) {
      rightLcsSet.add(i)
      lcsIndex++
    }
  }

  for (let i = 0; i < rightWords.length; i++) {
    const word = rightWords[i] ?? ''
    const isCommon = rightLcsSet.has(i)
    const type: 'same' | 'added' = isCommon ? 'same' : 'added'

    if (currentRightSegment && currentRightSegment.type === type) {
      currentRightSegment.text += word
    } else {
      if (currentRightSegment) {
        rightSegments.push(currentRightSegment)
      }
      currentRightSegment = { text: word, type }
    }
  }
  if (currentRightSegment) {
    rightSegments.push(currentRightSegment)
  }

  return { leftSegments, rightSegments }
}

function tokenize(text: string): string[] {
  // Split into words while preserving whitespace
  return text.split(/(\s+)/).filter((s) => s.length > 0)
}

interface WordWithIndex {
  word: string
  index: number
}

function findLCS(left: string[], right: string[]): WordWithIndex[] {
  const m = left.length
  const n = right.length

  // DP table
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  // Fill DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const dpRow = dp[i]
      const dpPrevRow = dp[i - 1]
      if (!dpRow || !dpPrevRow) continue

      if (left[i - 1] === right[j - 1]) {
        dpRow[j] = (dpPrevRow[j - 1] ?? 0) + 1
      } else {
        dpRow[j] = Math.max(dpPrevRow[j] ?? 0, dpRow[j - 1] ?? 0)
      }
    }
  }

  // Backtrack to find LCS
  const lcs: WordWithIndex[] = []
  let i = m
  let j = n
  while (i > 0 && j > 0) {
    const dpRow = dp[i]
    const dpPrevRow = dp[i - 1]
    if (!dpRow || !dpPrevRow) break

    if (left[i - 1] === right[j - 1]) {
      lcs.unshift({ word: left[i - 1] ?? '', index: i - 1 })
      i--
      j--
    } else if ((dpPrevRow[j] ?? 0) > (dpRow[j - 1] ?? 0)) {
      i--
    } else {
      j--
    }
  }

  return lcs
}
