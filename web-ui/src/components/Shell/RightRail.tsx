import { useLocalStorage } from '../../hooks/useLocalStorage'
import {
  BacklinksTab,
  RelatedTab,
  OutlineTab,
  OutgoingTab,
  MentionsTab,
  GraphTab,
} from '../RightRail'
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

type RightRailTabId = 'backlinks' | 'outgoing' | 'related' | 'mentions' | 'outline' | 'graph'

const tabPanels: Record<RightRailTabId, () => JSX.Element> = {
  backlinks: BacklinksTab,
  outgoing: OutgoingTab,
  related: RelatedTab,
  mentions: MentionsTab,
  outline: OutlineTab,
  graph: GraphTab,
}

export function RightRail({ collapsed, onToggle, width }: RightRailProps) {
  const [activeTab, setActiveTab] = useLocalStorage<RightRailTabId>(
    'ws-right-rail-tab',
    'backlinks'
  )

  if (collapsed) {
    return (
      <aside className="ws-right-rail ws-right-rail--collapsed">
        <button type="button" className="ws-rail-toggle" onClick={onToggle} aria-label="Toggle right rail">
          {'\u2039'}
        </button>
      </aside>
    )
  }

  const ActivePanel = tabPanels[activeTab] ?? BacklinksTab

  return (
    <aside className="ws-right-rail" style={{ width }}>
      <div className="ws-right-rail-header">
        <WsTabs
          tabs={rightRailTabs}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as RightRailTabId)}
          variant="pill"
          className="ws-right-rail-tabs"
        />
        <button type="button" className="ws-rail-toggle" onClick={onToggle} aria-label="Toggle right rail">
          {'\u203A'}
        </button>
      </div>
      <div className="ws-right-rail-content">
        <ActivePanel />
      </div>
    </aside>
  )
}
