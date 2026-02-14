import { useResizablePanel } from '../../hooks/useResizablePanel'
import { CommandPalette } from '../CommandPalette'
import { CenterPane } from './CenterPane'
import { LeftRail } from './LeftRail'
import { ResizeHandle } from './ResizeHandle'
import { RightRail } from './RightRail'

export function WorkstationShell() {
  const leftPanel = useResizablePanel({
    storageKey: 'left-rail',
    defaultWidth: 220,
    min: 180,
    max: 320,
  })

  const rightPanel = useResizablePanel({
    storageKey: 'right-rail',
    defaultWidth: 300,
    min: 240,
    max: 420,
  })

  return (
    <div className="ws-shell">
      <CommandPalette />
      <LeftRail
        collapsed={leftPanel.collapsed}
        onToggle={leftPanel.toggleCollapsed}
        width={leftPanel.width}
      />
      {!leftPanel.collapsed && (
        <ResizeHandle
          direction="left"
          onResize={(delta) => leftPanel.setWidth(leftPanel.width + delta)}
        />
      )}
      <CenterPane />
      {!rightPanel.collapsed && (
        <ResizeHandle
          direction="right"
          onResize={(delta) => rightPanel.setWidth(rightPanel.width + delta)}
        />
      )}
      <RightRail
        collapsed={rightPanel.collapsed}
        onToggle={rightPanel.toggleCollapsed}
        width={rightPanel.width}
      />
    </div>
  )
}
