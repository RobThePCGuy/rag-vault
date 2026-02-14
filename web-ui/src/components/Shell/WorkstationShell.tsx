import { useCallback, useEffect, useRef } from 'react'
import { useSelection } from '../../contexts/SelectionContext'
import { useNavigationHistory } from '../../hooks/useNavigationHistory'
import { useResizablePanel } from '../../hooks/useResizablePanel'
import { useShortcuts } from '../../hooks/useShortcuts'
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

  // Navigation history - tracks doc selections for back/forward
  const { selection, select } = useSelection()
  const navHistory = useNavigationHistory()
  const isNavAction = useRef(false)

  // Push to history when selection changes (but not from back/forward navigation)
  // biome-ignore lint/correctness/useExhaustiveDependencies: navHistory.push excluded to prevent re-render loop
  useEffect(() => {
    if (isNavAction.current) {
      isNavAction.current = false
      return
    }
    if (selection.docId) {
      navHistory.push(selection.docId, selection.chunkIndex)
    }
  }, [selection.docId, selection.chunkIndex])

  const handleNavigateBack = useCallback(() => {
    const entry = navHistory.goBack()
    if (entry) {
      isNavAction.current = true
      select({ docId: entry.docId, chunkIndex: entry.chunkIndex, source: 'backlink' })
    }
  }, [navHistory, select])

  const handleNavigateForward = useCallback(() => {
    const entry = navHistory.goForward()
    if (entry) {
      isNavAction.current = true
      select({ docId: entry.docId, chunkIndex: entry.chunkIndex, source: 'backlink' })
    }
  }, [navHistory, select])

  useShortcuts({
    onToggleLeftRail: leftPanel.toggleCollapsed,
    onToggleRightRail: rightPanel.toggleCollapsed,
    onNavigateBack: handleNavigateBack,
    onNavigateForward: handleNavigateForward,
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
