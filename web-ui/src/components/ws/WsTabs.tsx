import { type KeyboardEvent, type ReactNode, useRef } from 'react'

export interface WsTabItem {
  id: string
  label: string
  icon?: ReactNode
  badge?: number | string
  closeable?: boolean
  pinned?: boolean
}

interface WsTabsProps {
  tabs: WsTabItem[]
  activeId: string
  onSelect: (id: string) => void
  onClose?: (id: string) => void
  variant?: 'underline' | 'pill'
  className?: string
}

export function WsTabs({
  tabs,
  activeId,
  onSelect,
  onClose,
  variant = 'underline',
  className = '',
}: WsTabsProps) {
  const listRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const focusable = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    if (!focusable?.length) return

    const current = Array.from(focusable).indexOf(document.activeElement as HTMLButtonElement)
    let next = current

    if (e.key === 'ArrowRight') {
      e.preventDefault()
      next = current + 1 >= focusable.length ? 0 : current + 1
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      next = current - 1 < 0 ? focusable.length - 1 : current - 1
    }

    if (next !== current) {
      const nextTab = focusable[next]
      if (nextTab) {
        nextTab.focus()
        const tabId = nextTab.dataset.tabId
        if (tabId) onSelect(tabId)
      }
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      className={`ws-tabs ws-tabs--${variant} ${className}`}
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            data-tab-id={tab.id}
            className="ws-tab"
            onClick={() => onSelect(tab.id)}
          >
            {tab.icon && <span className="ws-tab-icon">{tab.icon}</span>}
            {tab.label}
            {tab.badge !== undefined && <span className="ws-tab-badge">{tab.badge}</span>}
            {tab.closeable && !tab.pinned && (
              <span
                role="button"
                tabIndex={-1}
                className="ws-tab-close"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose?.(tab.id)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation()
                    onClose?.(tab.id)
                  }
                }}
              >
                x
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
