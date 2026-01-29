import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseViewportChunksResult {
  visibleChunkIndices: Set<number>
  registerChunk: (index: number, element: HTMLElement | null) => void
  activeChunkIndex: number | null
}

/**
 * Hook for tracking which chunks are currently visible in the viewport
 * Uses Intersection Observer for efficient scroll tracking
 */
export function useViewportChunks(rootMargin = '100px'): UseViewportChunksResult {
  const [visibleChunkIndices, setVisibleChunkIndices] = useState<Set<number>>(new Set())
  const [activeChunkIndex, setActiveChunkIndex] = useState<number | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const elementsRef = useRef<Map<number, HTMLElement>>(new Map())

  // Initialize intersection observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        setVisibleChunkIndices((prev) => {
          const next = new Set(prev)

          for (const entry of entries) {
            const index = Number(entry.target.getAttribute('data-chunk-index'))
            if (!Number.isNaN(index)) {
              if (entry.isIntersecting) {
                next.add(index)
              } else {
                next.delete(index)
              }
            }
          }

          return next
        })
      },
      {
        rootMargin,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    )

    // Observe all registered elements
    for (const [, element] of elementsRef.current) {
      observerRef.current.observe(element)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [rootMargin])

  // Update active chunk based on visible chunks
  useEffect(() => {
    if (visibleChunkIndices.size === 0) {
      setActiveChunkIndex(null)
    } else {
      // Set active to the first visible chunk (topmost)
      const sortedIndices = Array.from(visibleChunkIndices).sort((a, b) => a - b)
      setActiveChunkIndex(sortedIndices[0] ?? null)
    }
  }, [visibleChunkIndices])

  // Register a chunk element for observation
  const registerChunk = useCallback((index: number, element: HTMLElement | null) => {
    const observer = observerRef.current

    // Unobserve previous element if exists
    const prevElement = elementsRef.current.get(index)
    if (prevElement && observer) {
      observer.unobserve(prevElement)
    }

    if (element) {
      // Store and observe new element
      elementsRef.current.set(index, element)
      element.setAttribute('data-chunk-index', String(index))
      observer?.observe(element)
    } else {
      // Remove from map if element is null
      elementsRef.current.delete(index)
    }
  }, [])

  return {
    visibleChunkIndices,
    registerChunk,
    activeChunkIndex,
  }
}
