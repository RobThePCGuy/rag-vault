import { useMemo } from 'react'
import { useLinkIndexContext } from '../../contexts/LinkIndexContext'
import { useSelection } from '../../contexts/SelectionContext'
import { WsBadge } from '../ws/WsBadge'
import { RailEmptyState } from './EmptyState'

export function OutgoingTab() {
  const { selection, select } = useSelection()
  const { getOutgoingLinks, isResolved, isScanning } = useLinkIndexContext()

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

  return (
    <div className="ws-rail-list">
      {outgoing.map((edge, i) => {
        const resolved = isResolved(edge.targetTitle)
        const key = `${edge.targetTitle}-${edge.chunkIndex}-${i}`

        const metaParts: string[] = []
        if (edge.heading) metaParts.push(`# ${edge.heading}`)
        if (edge.blockRef) metaParts.push(`^ ${edge.blockRef}`)
        metaParts.push(`Chunk #${edge.chunkIndex}`)

        return (
          <button
            type="button"
            key={key}
            className="ws-rail-item"
            disabled={!resolved}
            onClick={() => {
              if (resolved) {
                select({ docId: edge.targetTitle, source: 'backlink' })
              }
            }}
          >
            <span className="ws-rail-item-title">
              {edge.alias ?? edge.targetTitle}
            </span>
            <span className="ws-rail-item-meta">{metaParts.join(' - ')}</span>
            <WsBadge variant={resolved ? 'link-explicit' : 'link-unresolved'}>
              {resolved ? 'Resolved' : 'Unresolved'}
            </WsBadge>
          </button>
        )
      })}
    </div>
  )
}
