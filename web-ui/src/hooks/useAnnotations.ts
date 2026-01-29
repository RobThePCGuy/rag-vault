import { useCallback, useMemo } from 'react'
import {
  useAnnotations as useAnnotationsContext,
  type Highlight,
  type HighlightColor,
  type Annotation,
} from '../contexts/AnnotationsContext'
import type { ChunkKey } from '../contexts/LinksContext'

interface UseAnnotationsForChunkResult {
  highlights: Highlight[]
  annotations: Map<string, Annotation>
  createHighlight: (
    range: { startOffset: number; endOffset: number },
    text: string,
    contextBefore: string,
    contextAfter: string,
    color: HighlightColor
  ) => Highlight
  deleteHighlight: (highlightId: string) => void
  updateHighlightColor: (highlightId: string, color: HighlightColor) => void
  addNote: (highlightId: string, note: string) => Annotation
  updateNote: (annotationId: string, note: string) => void
  deleteNote: (annotationId: string) => void
  hasHighlights: boolean
}

/**
 * Hook for working with annotations for a specific chunk
 */
export function useAnnotationsForChunk(chunkKey: ChunkKey | null): UseAnnotationsForChunkResult {
  const ctx = useAnnotationsContext()

  // Get highlights for this chunk
  const highlights = useMemo(() => {
    if (!chunkKey) return []
    return ctx.getHighlightsForChunk(chunkKey)
  }, [ctx, chunkKey])

  // Map annotations by highlight ID for quick lookup
  const annotations = useMemo(() => {
    const map = new Map<string, Annotation>()
    for (const highlight of highlights) {
      const annotation = ctx.getAnnotationForHighlight(highlight.id)
      if (annotation) {
        map.set(highlight.id, annotation)
      }
    }
    return map
  }, [highlights, ctx])

  const createHighlight = useCallback(
    (
      range: { startOffset: number; endOffset: number },
      text: string,
      contextBefore: string,
      contextAfter: string,
      color: HighlightColor
    ) => {
      if (!chunkKey) {
        throw new Error('No chunk key provided')
      }
      return ctx.createHighlight(chunkKey, range, text, contextBefore, contextAfter, color)
    },
    [ctx, chunkKey]
  )

  const deleteHighlight = useCallback(
    (highlightId: string) => {
      ctx.deleteHighlight(highlightId)
    },
    [ctx]
  )

  const updateHighlightColor = useCallback(
    (highlightId: string, color: HighlightColor) => {
      ctx.updateHighlightColor(highlightId, color)
    },
    [ctx]
  )

  const addNote = useCallback(
    (highlightId: string, note: string) => {
      return ctx.createAnnotation(highlightId, note)
    },
    [ctx]
  )

  const updateNote = useCallback(
    (annotationId: string, note: string) => {
      ctx.updateAnnotation(annotationId, note)
    },
    [ctx]
  )

  const deleteNote = useCallback(
    (annotationId: string) => {
      ctx.deleteAnnotation(annotationId)
    },
    [ctx]
  )

  return {
    highlights,
    annotations,
    createHighlight,
    deleteHighlight,
    updateHighlightColor,
    addNote,
    updateNote,
    deleteNote,
    hasHighlights: highlights.length > 0,
  }
}

export { useAnnotationsContext as useAnnotationsStore }
