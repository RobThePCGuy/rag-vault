import { type ReactNode, useEffect, useRef } from 'react'

interface LinkPopoverProps {
  docTitle: string
  heading?: string
  preview?: string
  isResolved: boolean
  position: { x: number; y: number }
  onClose: () => void
  onNavigate: () => void
  children?: ReactNode
}

export function LinkPopover({
  docTitle,
  heading,
  preview,
  isResolved,
  position,
  onClose,
  onNavigate,
}: LinkPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="ws-link-popover"
      style={{ left: position.x, top: position.y }}
    >
      <div className="ws-link-popover-header">
        <span className={`ws-link-popover-status ${isResolved ? 'ws-link-popover-status--resolved' : 'ws-link-popover-status--unresolved'}`} />
        <span className="ws-link-popover-title">{docTitle}</span>
        {heading && <span className="ws-link-popover-heading"># {heading}</span>}
      </div>
      {preview && (
        <p className="ws-link-popover-preview">{preview}</p>
      )}
      <div className="ws-link-popover-actions">
        <button type="button" className="ws-link-popover-action" onClick={onNavigate}>
          Open
        </button>
      </div>
    </div>
  )
}
