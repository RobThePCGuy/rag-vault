import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import type { ChunkKey } from './LinksContext'

// ============================================
// Types
// ============================================

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple'

export interface Highlight {
  id: string
  chunkKey: ChunkKey
  range: { startOffset: number; endOffset: number }
  text: string
  contextBefore: string
  contextAfter: string
  color: HighlightColor
  createdAt: string
}

export interface Annotation {
  id: string
  highlightId: string
  note: string
  createdAt: string
  updatedAt: string
}

export interface AnnotationsStore {
  version: 1
  vaultId: string
  highlights: Highlight[]
  annotations: Annotation[]
}

export interface AnnotationsContextValue {
  // Highlights
  highlights: Highlight[]
  createHighlight: (
    chunkKey: ChunkKey,
    range: { startOffset: number; endOffset: number },
    text: string,
    contextBefore: string,
    contextAfter: string,
    color: HighlightColor
  ) => Highlight
  deleteHighlight: (highlightId: string) => void
  updateHighlightColor: (highlightId: string, color: HighlightColor) => void
  getHighlightsForChunk: (chunkKey: ChunkKey) => Highlight[]

  // Annotations
  annotations: Annotation[]
  createAnnotation: (highlightId: string, note: string) => Annotation
  updateAnnotation: (annotationId: string, note: string) => void
  deleteAnnotation: (annotationId: string) => void
  getAnnotationForHighlight: (highlightId: string) => Annotation | undefined

  // Export/Import
  exportAnnotations: () => string
  importAnnotations: (json: string) => { imported: number; errors: string[] }
}

// ============================================
// Utilities
// ============================================

function generateId(): string {
  return crypto.randomUUID()
}

function isSameChunkKey(a: ChunkKey, b: ChunkKey): boolean {
  return a.filePath === b.filePath && a.chunkIndex === b.chunkIndex
}

const DEFAULT_STORE: AnnotationsStore = {
  version: 1,
  vaultId: '',
  highlights: [],
  annotations: [],
}

// ============================================
// Context
// ============================================

const AnnotationsContext = createContext<AnnotationsContextValue | null>(null)

interface AnnotationsProviderProps {
  children: ReactNode
  vaultId?: string
}

export function AnnotationsProvider({ children, vaultId = 'default' }: AnnotationsProviderProps) {
  const storageKey = `rag-vault-annotations-v1-${vaultId}`
  const [store, setStore] = useLocalStorage<AnnotationsStore>(storageKey, {
    ...DEFAULT_STORE,
    vaultId,
  })

  // ============================================
  // Highlight Operations
  // ============================================

  const createHighlight = useCallback(
    (
      chunkKey: ChunkKey,
      range: { startOffset: number; endOffset: number },
      text: string,
      contextBefore: string,
      contextAfter: string,
      color: HighlightColor
    ): Highlight => {
      const highlight: Highlight = {
        id: generateId(),
        chunkKey,
        range,
        text,
        contextBefore: contextBefore.slice(-30),
        contextAfter: contextAfter.slice(0, 30),
        color,
        createdAt: new Date().toISOString(),
      }

      setStore((prev) => ({
        ...prev,
        highlights: [...prev.highlights, highlight],
      }))

      return highlight
    },
    [setStore]
  )

  const deleteHighlight = useCallback(
    (highlightId: string) => {
      setStore((prev) => ({
        ...prev,
        highlights: prev.highlights.filter((h) => h.id !== highlightId),
        // Also delete associated annotation
        annotations: prev.annotations.filter((a) => a.highlightId !== highlightId),
      }))
    },
    [setStore]
  )

  const updateHighlightColor = useCallback(
    (highlightId: string, color: HighlightColor) => {
      setStore((prev) => ({
        ...prev,
        highlights: prev.highlights.map((h) => (h.id === highlightId ? { ...h, color } : h)),
      }))
    },
    [setStore]
  )

  const getHighlightsForChunk = useCallback(
    (chunkKey: ChunkKey): Highlight[] => {
      return store.highlights
        .filter((h) => isSameChunkKey(h.chunkKey, chunkKey))
        .sort((a, b) => a.range.startOffset - b.range.startOffset)
    },
    [store.highlights]
  )

  // ============================================
  // Annotation Operations
  // ============================================

  const createAnnotation = useCallback(
    (highlightId: string, note: string): Annotation => {
      const annotation: Annotation = {
        id: generateId(),
        highlightId,
        note,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setStore((prev) => ({
        ...prev,
        annotations: [...prev.annotations, annotation],
      }))

      return annotation
    },
    [setStore]
  )

  const updateAnnotation = useCallback(
    (annotationId: string, note: string) => {
      setStore((prev) => ({
        ...prev,
        annotations: prev.annotations.map((a) =>
          a.id === annotationId ? { ...a, note, updatedAt: new Date().toISOString() } : a
        ),
      }))
    },
    [setStore]
  )

  const deleteAnnotation = useCallback(
    (annotationId: string) => {
      setStore((prev) => ({
        ...prev,
        annotations: prev.annotations.filter((a) => a.id !== annotationId),
      }))
    },
    [setStore]
  )

  const getAnnotationForHighlight = useCallback(
    (highlightId: string): Annotation | undefined => {
      return store.annotations.find((a) => a.highlightId === highlightId)
    },
    [store.annotations]
  )

  // ============================================
  // Export/Import
  // ============================================

  const exportAnnotations = useCallback((): string => {
    return JSON.stringify(store, null, 2)
  }, [store])

  const importAnnotations = useCallback(
    (json: string): { imported: number; errors: string[] } => {
      const errors: string[] = []
      let imported = 0

      try {
        const data = JSON.parse(json) as AnnotationsStore

        if (data.version !== 1) {
          errors.push(`Unsupported version: ${data.version}`)
          return { imported, errors }
        }

        // Import highlights
        if (Array.isArray(data.highlights)) {
          for (const highlight of data.highlights) {
            if (
              highlight.id &&
              highlight.chunkKey &&
              highlight.range &&
              !store.highlights.some((h) => h.id === highlight.id)
            ) {
              setStore((prev) => ({
                ...prev,
                highlights: [...prev.highlights, highlight],
              }))
              imported++
            }
          }
        }

        // Import annotations
        if (Array.isArray(data.annotations)) {
          for (const annotation of data.annotations) {
            if (
              annotation.id &&
              annotation.highlightId &&
              !store.annotations.some((a) => a.id === annotation.id)
            ) {
              setStore((prev) => ({
                ...prev,
                annotations: [...prev.annotations, annotation],
              }))
              imported++
            }
          }
        }
      } catch (e) {
        errors.push(`Invalid JSON: ${(e as Error).message}`)
      }

      return { imported, errors }
    },
    [store, setStore]
  )

  // ============================================
  // Context Value
  // ============================================

  const value = useMemo<AnnotationsContextValue>(
    () => ({
      highlights: store.highlights,
      createHighlight,
      deleteHighlight,
      updateHighlightColor,
      getHighlightsForChunk,
      annotations: store.annotations,
      createAnnotation,
      updateAnnotation,
      deleteAnnotation,
      getAnnotationForHighlight,
      exportAnnotations,
      importAnnotations,
    }),
    [
      store.highlights,
      store.annotations,
      createHighlight,
      deleteHighlight,
      updateHighlightColor,
      getHighlightsForChunk,
      createAnnotation,
      updateAnnotation,
      deleteAnnotation,
      getAnnotationForHighlight,
      exportAnnotations,
      importAnnotations,
    ]
  )

  return <AnnotationsContext.Provider value={value}>{children}</AnnotationsContext.Provider>
}

export function useAnnotations(): AnnotationsContextValue {
  const context = useContext(AnnotationsContext)
  if (!context) {
    throw new Error('useAnnotations must be used within an AnnotationsProvider')
  }
  return context
}
