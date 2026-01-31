import { useMemo } from 'react'
import {
  useAnnotations,
  type Highlight,
  type Annotation,
  type HighlightColor,
} from '../contexts/AnnotationsContext'

// ============================================
// Types
// ============================================

export interface AnnotationSummaryItem {
  highlight: Highlight
  annotation?: Annotation
  chunkPreview: string
}

export interface UseDocumentAnnotationsOptions {
  filePath: string
  sortBy?: 'chunk' | 'date' | 'color'
  filterColor?: HighlightColor | null
}

interface ChunkGroup {
  chunkIndex: number
  items: AnnotationSummaryItem[]
}

interface UseDocumentAnnotationsResult {
  /** All items matching filter criteria */
  items: AnnotationSummaryItem[]
  /** Items grouped by chunk */
  groupedByChunk: ChunkGroup[]
  /** Total count of highlights in document */
  totalCount: number
  /** Filtered count */
  filteredCount: number
  /** Check if a specific color is present */
  hasColor: (color: HighlightColor) => boolean
  /** Available colors in the document */
  availableColors: HighlightColor[]
}

// ============================================
// Color order for sorting
// ============================================

const COLOR_ORDER: Record<HighlightColor, number> = {
  yellow: 0,
  green: 1,
  blue: 2,
  pink: 3,
  purple: 4,
}

// ============================================
// Hook
// ============================================

/**
 * Hook for retrieving all annotations for a document with filtering and sorting
 */
export function useDocumentAnnotations({
  filePath,
  sortBy = 'chunk',
  filterColor = null,
}: UseDocumentAnnotationsOptions): UseDocumentAnnotationsResult {
  const { highlights, getAnnotationForHighlight } = useAnnotations()

  // Get all highlights for this document
  const documentHighlights = useMemo(() => {
    return highlights.filter((h) => h.chunkKey.filePath === filePath)
  }, [highlights, filePath])

  // Get available colors
  const availableColors = useMemo(() => {
    const colors = new Set<HighlightColor>()
    for (const h of documentHighlights) {
      colors.add(h.color)
    }
    return Array.from(colors).sort((a, b) => COLOR_ORDER[a] - COLOR_ORDER[b])
  }, [documentHighlights])

  // Build items with annotation lookup
  const allItems = useMemo(() => {
    return documentHighlights.map((highlight): AnnotationSummaryItem => {
      const annotation = getAnnotationForHighlight(highlight.id)
      return {
        highlight,
        annotation,
        chunkPreview: buildChunkPreview(highlight),
      }
    })
  }, [documentHighlights, getAnnotationForHighlight])

  // Apply color filter
  const filteredItems = useMemo(() => {
    if (!filterColor) return allItems
    return allItems.filter((item) => item.highlight.color === filterColor)
  }, [allItems, filterColor])

  // Sort items
  const sortedItems = useMemo(() => {
    const items = [...filteredItems]
    switch (sortBy) {
      case 'chunk':
        return items.sort((a, b) => {
          // First by chunk index
          const chunkDiff = a.highlight.chunkKey.chunkIndex - b.highlight.chunkKey.chunkIndex
          if (chunkDiff !== 0) return chunkDiff
          // Then by offset within chunk
          return a.highlight.range.startOffset - b.highlight.range.startOffset
        })
      case 'date':
        return items.sort((a, b) => {
          return (
            new Date(b.highlight.createdAt).getTime() - new Date(a.highlight.createdAt).getTime()
          )
        })
      case 'color':
        return items.sort((a, b) => {
          const colorDiff = COLOR_ORDER[a.highlight.color] - COLOR_ORDER[b.highlight.color]
          if (colorDiff !== 0) return colorDiff
          // Then by chunk
          return a.highlight.chunkKey.chunkIndex - b.highlight.chunkKey.chunkIndex
        })
      default:
        return items
    }
  }, [filteredItems, sortBy])

  // Group by chunk
  const groupedByChunk = useMemo(() => {
    const groups = new Map<number, AnnotationSummaryItem[]>()

    for (const item of sortedItems) {
      const chunkIndex = item.highlight.chunkKey.chunkIndex
      if (!groups.has(chunkIndex)) {
        groups.set(chunkIndex, [])
      }
      groups.get(chunkIndex)!.push(item)
    }

    // Convert to array and sort by chunk index
    const result: ChunkGroup[] = []
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => a - b)
    for (const chunkIndex of sortedKeys) {
      result.push({
        chunkIndex,
        items: groups.get(chunkIndex)!,
      })
    }
    return result
  }, [sortedItems])

  // Check if a color exists
  const hasColor = useMemo(() => {
    const colorSet = new Set(availableColors)
    return (color: HighlightColor) => colorSet.has(color)
  }, [availableColors])

  return {
    items: sortedItems,
    groupedByChunk,
    totalCount: documentHighlights.length,
    filteredCount: filteredItems.length,
    hasColor,
    availableColors,
  }
}

// ============================================
// Helpers
// ============================================

function buildChunkPreview(highlight: Highlight): string {
  const { contextBefore, text, contextAfter } = highlight
  const preview = `${contextBefore}${text}${contextAfter}`
  return preview.slice(0, 150)
}
