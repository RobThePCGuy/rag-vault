import { useCallback, useEffect, useRef, useState } from 'react'

interface UseHoverPreviewOptions {
  delay?: number
  hideDelay?: number
}

interface HoverPreviewState {
  isVisible: boolean
  position: { x: number; y: number }
  targetRef: string | null
}

export interface UseHoverPreviewReturn {
  state: HoverPreviewState
  onHoverStart: (targetRef: string, rect: DOMRect) => void
  onHoverEnd: () => void
  onPreviewEnter: () => void
  onPreviewLeave: () => void
  hide: () => void
}

const VIEWPORT_PADDING = 12

/**
 * Hook that manages hover intent for showing preview cards.
 *
 * Uses a show delay to avoid flickering when the cursor passes over links,
 * and a hide delay to give the user time to move the cursor from the trigger
 * element onto the preview card itself.
 */
export function useHoverPreview(options: UseHoverPreviewOptions = {}): UseHoverPreviewReturn {
  const { delay = 300, hideDelay = 150 } = options

  const [state, setState] = useState<HoverPreviewState>({
    isVisible: false,
    position: { x: 0, y: 0 },
    targetRef: null,
  })

  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearShowTimeout = useCallback((): void => {
    if (showTimeoutRef.current !== null) {
      clearTimeout(showTimeoutRef.current)
      showTimeoutRef.current = null
    }
  }, [])

  const clearHideTimeout = useCallback((): void => {
    if (hideTimeoutRef.current !== null) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }, [])

  const clearAllTimeouts = useCallback((): void => {
    clearShowTimeout()
    clearHideTimeout()
  }, [clearShowTimeout, clearHideTimeout])

  const onHoverStart = useCallback(
    (targetRef: string, rect: DOMRect) => {
      clearHideTimeout()

      // Calculate position: centered below the element
      const x = rect.left + rect.width / 2
      const y = rect.bottom + 8

      // Clamp horizontally to stay within viewport
      const clampedX = Math.max(VIEWPORT_PADDING, Math.min(x, window.innerWidth - VIEWPORT_PADDING))

      // If placing below would overflow, place above the element instead
      const spaceBelow = window.innerHeight - rect.bottom
      const clampedY = spaceBelow < 200 ? rect.top - 8 : y

      clearShowTimeout()
      showTimeoutRef.current = setTimeout(() => {
        setState({
          isVisible: true,
          position: { x: clampedX, y: clampedY },
          targetRef,
        })
      }, delay)
    },
    [delay, clearHideTimeout, clearShowTimeout]
  )

  const onHoverEnd = useCallback(() => {
    clearShowTimeout()

    hideTimeoutRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, isVisible: false, targetRef: null }))
    }, hideDelay)
  }, [hideDelay, clearShowTimeout])

  const onPreviewEnter = useCallback(() => {
    clearHideTimeout()
  }, [clearHideTimeout])

  const onPreviewLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, isVisible: false, targetRef: null }))
    }, hideDelay)
  }, [hideDelay])

  const hide = useCallback(() => {
    clearAllTimeouts()
    setState({ isVisible: false, position: { x: 0, y: 0 }, targetRef: null })
  }, [clearAllTimeouts])

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => clearAllTimeouts()
  }, [clearAllTimeouts])

  return { state, onHoverStart, onHoverEnd, onPreviewEnter, onPreviewLeave, hide }
}
