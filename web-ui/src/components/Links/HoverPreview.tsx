import { useEffect, useRef, useState } from 'react'

interface HoverPreviewProps {
  docTitle: string
  excerpt?: string
  backlinkCount?: number
  score?: number
  position: { x: number; y: number }
  onNavigate: () => void
  onOpenInNewTab?: () => void
  onPinAsLink?: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

const MAX_EXCERPT_LENGTH = 150
const VIEWPORT_PADDING = 12

function truncateExcerpt(text: string): string {
  if (text.length <= MAX_EXCERPT_LENGTH) return text
  // Cut at the last space before the limit to avoid mid-word breaks
  const truncated = text.slice(0, MAX_EXCERPT_LENGTH)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > MAX_EXCERPT_LENGTH * 0.6) {
    return `${truncated.slice(0, lastSpace)}...`
  }
  return `${truncated}...`
}

function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`
}

export function HoverPreview({
  docTitle,
  excerpt,
  backlinkCount,
  score,
  position,
  onNavigate,
  onOpenInNewTab,
  onPinAsLink,
  onMouseEnter,
  onMouseLeave,
}: HoverPreviewProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [clampedPos, setClampedPos] = useState(position)
  const [isEntering, setIsEntering] = useState(true)

  const hasMetadata = (backlinkCount !== undefined && backlinkCount > 0) || score !== undefined
  const hasSecondaryActions = onOpenInNewTab !== undefined || onPinAsLink !== undefined

  // Clamp position within viewport bounds once the element is rendered
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    let { x, y } = position

    // Center the preview horizontally on the target position
    x = x - rect.width / 2

    // Clamp horizontal bounds
    if (x + rect.width > window.innerWidth - VIEWPORT_PADDING) {
      x = window.innerWidth - VIEWPORT_PADDING - rect.width
    }
    if (x < VIEWPORT_PADDING) {
      x = VIEWPORT_PADDING
    }

    // Clamp vertical: if it overflows below, flip above the trigger
    if (y + rect.height > window.innerHeight - VIEWPORT_PADDING) {
      y = position.y - rect.height - 16
    }
    if (y < VIEWPORT_PADDING) {
      y = VIEWPORT_PADDING
    }

    setClampedPos({ x, y })
  }, [position])

  // Trigger the entry animation after mount
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setIsEntering(false)
    })
    return () => cancelAnimationFrame(frameId)
  }, [])

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover intent tracking for preview card
    <div
      ref={ref}
      className={`ws-hover-preview ${isEntering ? 'ws-hover-preview--entering' : ''}`}
      style={{ left: clampedPos.x, top: clampedPos.y }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="ws-hover-preview-title">{docTitle}</div>

      {excerpt && <p className="ws-hover-preview-excerpt">{truncateExcerpt(excerpt)}</p>}

      {hasMetadata && (
        <div className="ws-hover-preview-meta">
          {backlinkCount !== undefined && backlinkCount > 0 && (
            <span className="ws-badge" data-variant="link-backlink">
              {backlinkCount} {backlinkCount === 1 ? 'backlink' : 'backlinks'}
            </span>
          )}
          {score !== undefined && (
            <span className="ws-badge" data-variant="link-semantic">
              {formatScore(score)} match
            </span>
          )}
        </div>
      )}

      <div className="ws-hover-preview-actions">
        <button
          type="button"
          className="ws-button"
          data-variant="primary"
          data-size="sm"
          onClick={onNavigate}
        >
          Open
        </button>

        {hasSecondaryActions && (
          <div className="ws-hover-preview-secondary-actions">
            {onOpenInNewTab && (
              <button
                type="button"
                className="ws-button"
                data-variant="ghost"
                data-size="sm"
                onClick={onOpenInNewTab}
              >
                New Tab
              </button>
            )}
            {onPinAsLink && (
              <button
                type="button"
                className="ws-button"
                data-variant="ghost"
                data-size="sm"
                onClick={onPinAsLink}
              >
                Pin as Link
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
