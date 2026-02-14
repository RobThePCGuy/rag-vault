import { useSelection } from '../../contexts/SelectionContext'
import { useBacklinks } from '../../hooks'
import { RailEmptyState } from './EmptyState'

export function BacklinksTab() {
  const { selection } = useSelection()
  const { backlinks, backlinkCount } = useBacklinks(
    selection.docId ?? null,
    selection.chunkIndex ?? null
  )

  if (!selection.docId) return <RailEmptyState message="Select a document to see backlinks" />
  if (backlinkCount === 0) return <RailEmptyState message="No backlinks found for this document" />

  return (
    <div className="ws-rail-list">
      {backlinks.map((link) => {
        const fileName = link.sourceKey.filePath.split('/').pop() ?? link.sourceKey.filePath
        return (
          <button type="button" key={link.id} className="ws-rail-item">
            <span className="ws-rail-item-title">{fileName}</span>
            <span className="ws-rail-item-meta">Chunk #{link.sourceKey.chunkIndex}</span>
            {link.label && <span className="ws-rail-item-label">{link.label}</span>}
            <p className="ws-rail-item-excerpt">{link.sourceText.slice(0, 120)}...</p>
          </button>
        )
      })}
    </div>
  )
}
