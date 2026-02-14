import { useCallback, useEffect, useRef, useState } from 'react'

interface UseViewportChunksResult {
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
  // Queue for elements registered before observer is ready
  const pendingObserveRef = useRef<Set<number>>(new Set())

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

    const observer = observerRef.current

    // Observe all registered elements
    for (const [, element] of elementsRef.current) {
      observer.observe(element)
    }

    // Process pending registrations (elements registered before observer was ready)
    for (const index of pendingObserveRef.current) {
      const element = elementsRef.current.get(index)
      if (element) observer.observe(element)
    }
    pendingObserveRef.current.clear()

    return () => {
      observer.disconnect()
      observerRef.current = null // Mark as unavailable
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
    // Remove from pending queue if present
    pendingObserveRef.current.delete(index)

    if (element) {
      // Store new element
      elementsRef.current.set(index, element)
      element.setAttribute('data-chunk-index', String(index))

      if (observer) {
        // Observer is ready - observe immediately
        observer.observe(element)
      } else {
        // Observer not ready yet - queue for later
        pendingObserveRef.current.add(index)
      }
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
