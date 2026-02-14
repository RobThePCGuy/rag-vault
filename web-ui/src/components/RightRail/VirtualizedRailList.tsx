import { useVirtualizer } from '@tanstack/react-virtual'
import { type ReactNode, useRef } from 'react'

const VIRTUALIZATION_THRESHOLD = 50
const ESTIMATED_ITEM_HEIGHT = 72

interface VirtualizedRailListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  getKey: (item: T, index: number) => string
}

/**
 * Renders a rail list with virtualization when items exceed the threshold.
 * Below 50 items, renders normally to avoid overhead.
 */
export function VirtualizedRailList<T>({ items, renderItem, getKey }: VirtualizedRailListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ITEM_HEIGHT,
    overscan: 5,
  })

  if (items.length <= VIRTUALIZATION_THRESHOLD) {
    return (
      <div className="ws-rail-list">
        {items.map((item, i) => (
          <div key={getKey(item, i)}>{renderItem(item, i)}</div>
        ))}
      </div>
    )
  }

  return (
    <div ref={parentRef} className="ws-rail-list" style={{ height: '100%', overflow: 'auto' }}>
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index]!
          return (
            <div
              key={getKey(item, virtualItem.index)}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
