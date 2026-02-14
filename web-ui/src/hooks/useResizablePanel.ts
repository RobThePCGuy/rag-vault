import { useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'

interface PanelState {
  width: number
  collapsed: boolean
}

interface UseResizablePanelOptions {
  storageKey: string
  defaultWidth: number
  min: number
  max: number
}

export function useResizablePanel(options: UseResizablePanelOptions) {
  const { storageKey, defaultWidth, min, max } = options

  const [state, setState] = useLocalStorage<PanelState>(`ws-panel-${storageKey}`, {
    width: defaultWidth,
    collapsed: false,
  })

  const setWidth = useCallback(
    (w: number) => {
      const clamped = Math.max(min, Math.min(max, w))
      setState((prev) => ({ ...prev, width: clamped }))
    },
    [min, max, setState]
  )

  const toggleCollapsed = useCallback(() => {
    setState((prev) => ({ ...prev, collapsed: !prev.collapsed }))
  }, [setState])

  const setCollapsed = useCallback(
    (collapsed: boolean) => {
      setState((prev) => ({ ...prev, collapsed }))
    },
    [setState]
  )

  return {
    width: state.width,
    collapsed: state.collapsed,
    setWidth,
    toggleCollapsed,
    setCollapsed,
  }
}
