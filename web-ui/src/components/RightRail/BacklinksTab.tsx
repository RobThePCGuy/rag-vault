import { useSelection } from '../../contexts/SelectionContext'
import { useBacklinks } from '../../hooks'
import { useHoverPreview } from '../../hooks/useHoverPreview'
import { HoverPreview } from '../Links/HoverPreview'
import { RailEmptyState } from './EmptyState'
import { VirtualizedRailList } from './VirtualizedRailList'

export function BacklinksTab() {
  const { selection, select } = useSelection()
  const { backlinks, backlinkCount } = useBacklinks(
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

  if (!selection.docId) return <RailEmptyState message="Select a document to see backlinks" />
  if (backlinkCount === 0) return <RailEmptyState message="No backlinks found for this document" />

  const hoveredLink = hoverState.isVisible
    ? backlinks.find((l) => l.id === hoverState.targetRef)
    : null

  return (
    <>
      <VirtualizedRailList
        items={backlinks}
        getKey={(link) => link.id}
        renderItem={(link) => {
          const fileName = link.sourceKey.filePath.split('/').pop() ?? link.sourceKey.filePath
          return (
            <button
              type="button"
              className="ws-rail-item"
              onClick={() => {
                hide()
                select({
                  docId: link.sourceKey.filePath,
                  chunkIndex: link.sourceKey.chunkIndex,
                  source: 'backlink',
                })
              }}
              onMouseEnter={(e) => onHoverStart(link.id, e.currentTarget.getBoundingClientRect())}
              onMouseLeave={onHoverEnd}
            >
              <span className="ws-rail-item-title">{fileName}</span>
              <span className="ws-rail-item-meta">Chunk #{link.sourceKey.chunkIndex}</span>
              {link.label && <span className="ws-rail-item-label">{link.label}</span>}
              <p className="ws-rail-item-excerpt">{link.sourceText.slice(0, 120)}...</p>
            </button>
          )
        }}
      />
      {hoveredLink && (
        <HoverPreview
          docTitle={
            hoveredLink.sourceKey.filePath.split('/').pop() ?? hoveredLink.sourceKey.filePath
          }
          excerpt={hoveredLink.sourceText}
          backlinkCount={backlinkCount}
          position={hoverState.position}
          onNavigate={() => {
            hide()
            select({
              docId: hoveredLink.sourceKey.filePath,
              chunkIndex: hoveredLink.sourceKey.chunkIndex,
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
