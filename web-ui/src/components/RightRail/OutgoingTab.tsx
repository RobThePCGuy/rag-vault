import { useMemo } from 'react'
import { useLinkIndexContext } from '../../contexts/LinkIndexContext'
import { useSelection } from '../../contexts/SelectionContext'
import { useHoverPreview } from '../../hooks/useHoverPreview'
import { HoverPreview } from '../Links/HoverPreview'
import { WsBadge } from '../ws/WsBadge'
import { RailEmptyState } from './EmptyState'
import { VirtualizedRailList } from './VirtualizedRailList'

export function OutgoingTab() {
  const { selection, select } = useSelection()
  const { getOutgoingLinks, isResolved, isScanning } = useLinkIndexContext()
  const {
    state: hoverState,
    onHoverStart,
    onHoverEnd,
    onPreviewEnter,
    onPreviewLeave,
    hide,
  } = useHoverPreview()

  const outgoing = useMemo(
    () => (selection.docId ? getOutgoingLinks(selection.docId) : []),
    [selection.docId, getOutgoingLinks]
  )

  if (!selection.docId) {
    return <RailEmptyState message="Select a document to see outgoing links" />
  }

  if (isScanning) {
    return <div className="ws-rail-loading">Scanning links...</div>
  }

  if (outgoing.length === 0) {
    return <RailEmptyState message="No outgoing links found" />
  }

  const hoveredEdge = hoverState.isVisible
    ? outgoing.find(
        (edge, i) => `${edge.targetTitle}-${edge.chunkIndex}-${i}` === hoverState.targetRef
      )
    : null

  return (
    <>
      <VirtualizedRailList
        items={outgoing}
        getKey={(edge, i) => `${edge.targetTitle}-${edge.chunkIndex}-${i}`}
        renderItem={(edge, i) => {
          const resolved = isResolved(edge.targetTitle)
          const itemKey = `${edge.targetTitle}-${edge.chunkIndex}-${i}`

          const metaParts: string[] = []
          if (edge.heading) metaParts.push(`# ${edge.heading}`)
          if (edge.blockRef) metaParts.push(`^ ${edge.blockRef}`)
          metaParts.push(`Chunk #${edge.chunkIndex}`)

          return (
            <button
              type="button"
              className="ws-rail-item"
              disabled={!resolved}
              onClick={() => {
                if (resolved) {
                  hide()
                  select({ docId: edge.targetTitle, source: 'backlink' })
                }
              }}
              onMouseEnter={(e) => {
                if (resolved) {
                  onHoverStart(itemKey, e.currentTarget.getBoundingClientRect())
                }
              }}
              onMouseLeave={onHoverEnd}
            >
              <span className="ws-rail-item-title">{edge.alias ?? edge.targetTitle}</span>
              <span className="ws-rail-item-meta">{metaParts.join(' - ')}</span>
              <WsBadge variant={resolved ? 'link-explicit' : 'link-unresolved'}>
                {resolved ? 'Resolved' : 'Unresolved'}
              </WsBadge>
            </button>
          )
        }}
      />
      {hoveredEdge && (
        <HoverPreview
          docTitle={hoveredEdge.alias ?? hoveredEdge.targetTitle}
          excerpt={hoveredEdge.heading ? `# ${hoveredEdge.heading}` : undefined}
          position={hoverState.position}
          onNavigate={() => {
            hide()
            select({ docId: hoveredEdge.targetTitle, source: 'backlink' })
          }}
          onMouseEnter={onPreviewEnter}
          onMouseLeave={onPreviewLeave}
        />
      )}
    </>
  )
}
