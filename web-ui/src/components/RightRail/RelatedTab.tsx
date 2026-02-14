import { useSelection } from '../../contexts/SelectionContext'
import { useRelatedChunks } from '../../hooks'
import { useHoverPreview } from '../../hooks/useHoverPreview'
import { HoverPreview } from '../Links/HoverPreview'
import { RailEmptyState } from './EmptyState'
import { VirtualizedRailList } from './VirtualizedRailList'

export function RelatedTab() {
  const { selection, select } = useSelection()
  const { related, isLoading } = useRelatedChunks(
    selection.docId ?? null,
    selection.chunkIndex ?? null
  )
  const {
    state: hoverState,
    onHoverStart,
    onHoverEnd,
    onPreviewEnter,
    onPreviewLeave,
    hide,
  } = useHoverPreview()

  if (!selection.docId)
    return <RailEmptyState message="Select a document to see related passages" />
  if (isLoading) return <div className="ws-rail-loading">Loading related...</div>
  if (!related || related.length === 0)
    return <RailEmptyState message="No related passages found" />

  const hoveredChunk = hoverState.isVisible
    ? related.find((c) => `${c.filePath}-${c.chunkIndex}` === hoverState.targetRef)
    : null

  return (
    <>
      <VirtualizedRailList
        items={related}
        getKey={(chunk) => `${chunk.filePath}-${chunk.chunkIndex}`}
        renderItem={(chunk) => {
          const itemKey = `${chunk.filePath}-${chunk.chunkIndex}`
          return (
            <button
              type="button"
              className="ws-rail-item"
              onClick={() => {
                hide()
                select({
                  docId: chunk.filePath,
                  chunkIndex: chunk.chunkIndex,
                  source: 'backlink',
                })
              }}
              onMouseEnter={(e) => onHoverStart(itemKey, e.currentTarget.getBoundingClientRect())}
              onMouseLeave={onHoverEnd}
            >
              <span className="ws-rail-item-title">{chunk.filePath.split('/').pop()}</span>
              <span className="ws-rail-item-meta">Score: {chunk.score.toFixed(3)}</span>
              <p className="ws-rail-item-excerpt">{chunk.text.slice(0, 120)}...</p>
            </button>
          )
        }}
      />
      {hoveredChunk && (
        <HoverPreview
          docTitle={hoveredChunk.filePath.split('/').pop() ?? hoveredChunk.filePath}
          excerpt={hoveredChunk.text}
          score={hoveredChunk.score}
          position={hoverState.position}
          onNavigate={() => {
            hide()
            select({
              docId: hoveredChunk.filePath,
              chunkIndex: hoveredChunk.chunkIndex,
              source: 'backlink',
            })
          }}
          onMouseEnter={onPreviewEnter}
          onMouseLeave={onPreviewLeave}
        />
      )}
    </>
  )
}
