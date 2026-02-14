import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'

interface WsTooltipProps {
  content: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  delay?: number
  children: ReactNode
}

export function WsTooltip({ content, side = 'top', delay = 300, children }: WsTooltipProps) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), delay)
  }, [delay])

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setVisible(false)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: tooltip trigger pattern
    <span
      className="ws-tooltip-anchor"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span className={`ws-tooltip ws-tooltip--${side}`} role="tooltip">
          {content}
        </span>
      )}
    </span>
  )
}
