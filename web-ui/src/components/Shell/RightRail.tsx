import { useSelection } from '../../contexts/SelectionContext'
import { WsTabs } from '../ws'

interface RightRailProps {
  collapsed: boolean
  onToggle: () => void
  width: number
}

const rightRailTabs = [
  { id: 'backlinks', label: 'Backlinks' },
  { id: 'outgoing', label: 'Outgoing' },
  { id: 'related', label: 'Related' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'outline', label: 'Outline' },
  { id: 'graph', label: 'Graph' },
]

export function RightRail({ collapsed, onToggle, width }: RightRailProps) {
  const { selection } = useSelection()

  if (collapsed) {
    return (
      <aside className="ws-right-rail ws-right-rail--collapsed">
        <button type="button" className="ws-rail-toggle" onClick={onToggle} aria-label="Toggle right rail">
          {'\u2039'}
        </button>
      </aside>
    )
  }

  return (
    <aside className="ws-right-rail" style={{ width }}>
      <div className="ws-right-rail-header">
        <WsTabs
          tabs={rightRailTabs}
          activeId="backlinks"
          onSelect={() => {}}
          variant="pill"
          className="ws-right-rail-tabs"
        />
        <button type="button" className="ws-rail-toggle" onClick={onToggle} aria-label="Toggle right rail">
          {'\u203A'}
        </button>
      </div>
      <div className="ws-right-rail-content">
        {selection.docId ? (
          <div style={{ padding: 'var(--ws-space-4)', color: 'var(--ws-text-muted)', fontSize: 'var(--ws-text-sm)' }}>
            Context for: {selection.docId}
          </div>
        ) : (
          <div style={{ padding: 'var(--ws-space-4)', color: 'var(--ws-text-faint)', fontSize: 'var(--ws-text-sm)' }}>
            Select a document to see backlinks, related passages, and more.
          </div>
        )}
      </div>
    </aside>
  )
}
