import { useSelection } from '../../contexts/SelectionContext'
import { useRelatedChunks } from '../../hooks'
import { RailEmptyState } from './EmptyState'

export function RelatedTab() {
  const { selection } = useSelection()
  const { related, isLoading } = useRelatedChunks(
    selection.docId ?? null,
    selection.chunkIndex ?? null
  )

  if (!selection.docId) return <RailEmptyState message="Select a document to see related passages" />
  if (isLoading) return <div className="ws-rail-loading">Loading related...</div>
  if (!related || related.length === 0) return <RailEmptyState message="No related passages found" />

  return (
    <div className="ws-rail-list">
      {related.map((chunk) => (
        <div key={`${chunk.filePath}-${chunk.chunkIndex}`} className="ws-rail-item">
          <span className="ws-rail-item-title">{chunk.filePath.split('/').pop()}</span>
          <span className="ws-rail-item-meta">Score: {chunk.score.toFixed(3)}</span>
          <p className="ws-rail-item-excerpt">{chunk.text.slice(0, 120)}...</p>
        </div>
      ))}
    </div>
  )
}
