import { useCallback, useEffect, useRef, useState } from 'react'
import { searchDocuments } from '../api/client'

// Common English stopwords to filter out
const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'have',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'that',
  'the',
  'to',
  'was',
  'were',
  'will',
  'with',
  'this',
  'but',
  'they',
  'had',
  'what',
  'when',
  'where',
  'who',
  'which',
  'can',
  'could',
  'would',
  'should',
  'their',
  'there',
  'been',
  'being',
  'do',
  'does',
  'did',
  'doing',
  'these',
  'those',
  'then',
  'than',
  'so',
  'if',
  'not',
  'no',
  'nor',
  'only',
  'own',
  'same',
  'such',
  'too',
  'very',
  'just',
  'also',
  'any',
  'each',
  'few',
  'more',
  'most',
  'other',
  'some',
  'all',
  'both',
  'into',
  'out',
  'up',
  'down',
  'about',
  'after',
  'before',
  'over',
  'under',
])

/**
 * Connection count for a keyphrase
 */
export interface KeyphraseConnection {
  phrase: string
  documentCount: number
  positions: Array<{ start: number; end: number }>
}

interface UseSemanticHeatmapOptions {
  /** Text to analyze */
  text: string
  /** Current file path (to exclude from counts) */
  currentFilePath?: string
  /** Whether heatmap is enabled */
  enabled?: boolean
  /** Maximum keyphrases to query (default: 20) */
  maxPhrases?: number
  /** Minimum word length (default: 5) */
  minWordLength?: number
}

interface UseSemanticHeatmapResult {
  /** Keyphrase connections with counts */
  connections: KeyphraseConnection[]
  /** Whether queries are in progress */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Refresh heatmap data */
  refresh: () => void
}

/**
 * Extract keyphrases from text
 * Returns unique words sorted by frequency (descending)
 */
function extractKeyphrases(text: string, maxN: number, minLength: number): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= minLength && !STOPWORDS.has(w))

  // Count frequencies
  const freq = new Map<string, number>()
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1)
  }

  // Sort by frequency descending
  const sorted = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxN)
    .map(([word]) => word)

  return sorted
}

/**
 * Find all positions of a word in text (case-insensitive)
 */
function findWordPositions(text: string, word: string): Array<{ start: number; end: number }> {
  const positions: Array<{ start: number; end: number }> = []
  const lowerText = text.toLowerCase()
  const lowerWord = word.toLowerCase()

  // Use word boundary matching to avoid partial matches
  const regex = new RegExp(`\\b${lowerWord}\\b`, 'gi')
  let match = regex.exec(lowerText)
  while (match !== null) {
    positions.push({ start: match.index, end: match.index + word.length })
    match = regex.exec(lowerText)
  }

  return positions
}

/**
 * Hook for semantic heatmap - shows which terms have connections elsewhere
 */
export function useSemanticHeatmap(options: UseSemanticHeatmapOptions): UseSemanticHeatmapResult {
  const { text, currentFilePath, enabled = false, maxPhrases = 20, minWordLength = 5 } = options

  const [connections, setConnections] = useState<KeyphraseConnection[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const queryQueueRef = useRef<string[]>([])
  const activeQueriesRef = useRef(0)
  const MAX_CONCURRENT = 2 // Throttle to 2 concurrent queries

  // Refs to avoid stale closures in async processQueue
  const textRef = useRef(text)
  const currentFilePathRef = useRef(currentFilePath)
  const processQueueRef = useRef<() => Promise<void>>()

  // Sync refs on every render
  textRef.current = text
  currentFilePathRef.current = currentFilePath

  const processQueue = useCallback(async () => {
    while (queryQueueRef.current.length > 0 && activeQueriesRef.current < MAX_CONCURRENT) {
      const phrase = queryQueueRef.current.shift()
      if (!phrase) continue

      activeQueriesRef.current++

      try {
        const results = await searchDocuments(phrase, 5)

        // Use refs to get current values (avoid stale closures)
        const currentPath = currentFilePathRef.current
        const currentText = textRef.current

        // Count distinct documents (excluding current)
        const distinctDocs = new Set(
          results.filter((r) => !currentPath || r.filePath !== currentPath).map((r) => r.filePath)
        )

        // Find positions in text
        const positions = findWordPositions(currentText, phrase)

        if (distinctDocs.size > 0 && positions.length > 0) {
          setConnections((prev) => [
            ...prev,
            { phrase, documentCount: distinctDocs.size, positions },
          ])
        }
      } catch {
        // Silently ignore individual query failures
      } finally {
        activeQueriesRef.current--
        // Continue processing queue - use ref for latest version
        if (queryQueueRef.current.length > 0) {
          processQueueRef.current?.()
        } else if (activeQueriesRef.current === 0) {
          setIsLoading(false)
        }
      }
    }
  }, []) // Empty deps - uses refs

  // Store processQueue in ref for recursive calls
  processQueueRef.current = processQueue

  const analyzeText = useCallback(async () => {
    if (!enabled || !text) {
      setConnections([])
      return
    }

    // Cancel any in-progress analysis
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)
    setConnections([])
    queryQueueRef.current = []
    activeQueriesRef.current = 0

    try {
      // Extract keyphrases
      const keyphrases = extractKeyphrases(text, maxPhrases, minWordLength)

      if (keyphrases.length === 0) {
        setIsLoading(false)
        return
      }

      // Add to queue and start processing
      queryQueueRef.current = keyphrases
      processQueue()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze text')
      setIsLoading(false)
    }
  }, [enabled, text, maxPhrases, minWordLength, processQueue])

  // Re-analyze when text or enabled state changes
  useEffect(() => {
    if (enabled) {
      analyzeText()
    } else {
      setConnections([])
      setIsLoading(false)
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [enabled, analyzeText])

  return {
    connections,
    isLoading,
    error,
    refresh: analyzeText,
  }
}
