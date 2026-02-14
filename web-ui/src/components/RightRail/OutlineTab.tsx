import { useSelection } from '../../contexts/SelectionContext'
import { useDocumentChunks, useTableOfContents } from '../../hooks'
import { RailEmptyState } from './EmptyState'

export function OutlineTab() {
  const { selection } = useSelection()
  const { chunks } = useDocumentChunks(selection.docId ?? null)
  const { entries } = useTableOfContents({ chunks: chunks ?? [] })

  if (!selection.docId) return <RailEmptyState message="Select a document to see its outline" />
  if (entries.length === 0) return <RailEmptyState message="No headings found in this document" />

  return (
    <nav className="ws-rail-list">
      {entries.map((entry) => (
        <button
          type="button"
          key={entry.id}
          className="ws-rail-item"
          style={{ paddingLeft: `calc(var(--ws-space-3) + ${(entry.level - 1) * 12}px)` }}
        >
          <span className="ws-rail-item-title">{entry.text}</span>
        </button>
      ))}
    </nav>
  )
}
