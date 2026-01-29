import { useMemo } from 'react'
import type { RelatedChunk } from '../api/client'

// ============================================
// Types
// ============================================

export interface CrossDocumentGroup {
  filePath: string
  fileName: string
  chunks: RelatedChunk[]
  avgScore: number
  minScore: number
}

interface UseCrossDocumentRelatedOptions {
  currentFilePath: string
  relatedChunks: RelatedChunk[]
  /** Minimum similarity score filter (lower = more similar) */
  minScore?: number
  /** Maximum similarity score filter */
  maxScore?: number
}

interface UseCrossDocumentRelatedResult {
  /** Related chunks grouped by document */
  groups: CrossDocumentGroup[]
  /** Total number of cross-document chunks */
  totalChunks: number
  /** Number of documents with related content */
  documentCount: number
  /** All cross-document related chunks (flat) */
  allChunks: RelatedChunk[]
}

// ============================================
// Hook
// ============================================

/**
 * Hook for grouping related chunks by source document
 * Filters to only show cross-document relationships
 */
export function useCrossDocumentRelated({
  currentFilePath,
  relatedChunks,
  minScore = 0,
  maxScore = 0.7,
}: UseCrossDocumentRelatedOptions): UseCrossDocumentRelatedResult {
  // Filter and group by document
  const groups = useMemo(() => {
    // Filter to cross-document chunks within score range
    const crossDocChunks = relatedChunks.filter(
      (chunk) =>
        chunk.filePath !== currentFilePath &&
        chunk.score >= minScore &&
        chunk.score <= maxScore
    )

    // Group by file path
    const groupMap = new Map<string, RelatedChunk[]>()
    for (const chunk of crossDocChunks) {
      if (!groupMap.has(chunk.filePath)) {
        groupMap.set(chunk.filePath, [])
      }
      groupMap.get(chunk.filePath)!.push(chunk)
    }

    // Build groups with stats
    const result: CrossDocumentGroup[] = []
    for (const [filePath, chunks] of groupMap) {
      // Sort chunks by score (lower = more similar = first)
      chunks.sort((a, b) => a.score - b.score)

      const scores = chunks.map((c) => c.score)
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
      const minScoreInGroup = Math.min(...scores)

      result.push({
        filePath,
        fileName: extractFileName(filePath),
        chunks,
        avgScore,
        minScore: minScoreInGroup,
      })
    }

    // Sort groups by average score (most similar first)
    result.sort((a, b) => a.avgScore - b.avgScore)

    return result
  }, [currentFilePath, relatedChunks, minScore, maxScore])

  const totalChunks = useMemo(
    () => groups.reduce((sum, g) => sum + g.chunks.length, 0),
    [groups]
  )

  const allChunks = useMemo(
    () => groups.flatMap((g) => g.chunks),
    [groups]
  )

  return {
    groups,
    totalChunks,
    documentCount: groups.length,
    allChunks,
  }
}

// ============================================
// Helpers
// ============================================

function extractFileName(filePath: string): string {
  const parts = filePath.split(/[/\\]/)
  return parts[parts.length - 1] || filePath
}
