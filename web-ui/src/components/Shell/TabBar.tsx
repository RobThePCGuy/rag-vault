import { useTabs } from '../../contexts/TabsContext'
import { WsTabs, type WsTabItem } from '../ws'

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useTabs()

  const tabItems: WsTabItem[] = tabs.map((t) => ({
    id: t.tabId,
    label: t.title,
    closeable: !t.pinned,
    pinned: t.pinned,
  }))

  return (
    <div className="ws-tab-bar">
      <WsTabs
        tabs={tabItems}
        activeId={activeTabId}
        onSelect={setActiveTab}
        onClose={closeTab}
        variant="pill"
      />
    </div>
  )
}
