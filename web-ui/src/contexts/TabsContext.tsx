import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

// ============================================
// Types
// ============================================

export type TabKind = 'doc' | 'search' | 'files' | 'settings' | 'collections' | 'status' | 'upload'

export interface PaneTab {
  tabId: string
  kind: TabKind
  docId?: string
  chunkRef?: string
  title: string
  scrollTop: number
  lastActiveAt: number
  pinned: boolean
}

interface TabsState {
  tabs: PaneTab[]
  activeTabId: string
}

interface TabsContextValue {
  tabs: PaneTab[]
  activeTabId: string
  activeTab: PaneTab | undefined
  openDoc: (docId: string, title: string, chunkRef?: string) => void
  openPage: (kind: Exclude<TabKind, 'doc'>, title: string) => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateTabScroll: (tabId: string, scrollTop: number) => void
  pinTab: (tabId: string, pinned: boolean) => void
}

// ============================================
// Constants
// ============================================

export const MAX_TABS = 8

// ============================================
// Utilities
// ============================================

function makeDefaultState(): TabsState {
  const tabId = crypto.randomUUID()
  return {
    tabs: [
      {
        tabId,
        kind: 'search',
        title: 'Search',
        scrollTop: 0,
        lastActiveAt: Date.now(),
        pinned: true,
      },
    ],
    activeTabId: tabId,
  }
}

/**
 * Evict the least recently used non-pinned tab from the array.
 * Excludes the tab with `excludeTabId` from eviction consideration.
 */
function evictLRU(tabs: PaneTab[], excludeTabId: string): PaneTab[] {
  const evictable = tabs.filter((t) => !t.pinned && t.tabId !== excludeTabId)
  if (evictable.length === 0) return tabs

  // Find tab with lowest lastActiveAt
  let lru = evictable[0]!
  for (const t of evictable) {
    if (t.lastActiveAt < lru.lastActiveAt) {
      lru = t
    }
  }

  return tabs.filter((t) => t.tabId !== lru.tabId)
}

// ============================================
// Context
// ============================================

const TabsContext = createContext<TabsContextValue | null>(null)

interface TabsProviderProps {
  dbId: string
  children: ReactNode
}

export function TabsProvider({ dbId, children }: TabsProviderProps) {
  const storageKey = `rag-vault-tabs-v1-${dbId}`
  const [state, setState] = useLocalStorage<TabsState>(storageKey, makeDefaultState())

  // ============================================
  // Actions
  // ============================================

  const openDoc = useCallback(
    (docId: string, title: string, chunkRef?: string) => {
      setState((prev) => {
        // Check if doc already has a tab
        const existing = prev.tabs.find((t) => t.kind === 'doc' && t.docId === docId)
        if (existing) {
          return {
            ...prev,
            activeTabId: existing.tabId,
            tabs: prev.tabs.map((t) =>
              t.tabId === existing.tabId ? { ...t, lastActiveAt: Date.now() } : t
            ),
          }
        }

        // Create new tab
        const newTab: PaneTab = {
          tabId: crypto.randomUUID(),
          kind: 'doc',
          docId,
          chunkRef,
          title,
          scrollTop: 0,
          lastActiveAt: Date.now(),
          pinned: false,
        }

        let tabs = [...prev.tabs, newTab]

        // Evict if over limit
        if (tabs.length > MAX_TABS) {
          tabs = evictLRU(tabs, newTab.tabId)
        }

        return {
          tabs,
          activeTabId: newTab.tabId,
        }
      })
    },
    [setState]
  )

  const openPage = useCallback(
    (kind: Exclude<TabKind, 'doc'>, title: string) => {
      setState((prev) => {
        // Check if page kind already has a tab
        const existing = prev.tabs.find((t) => t.kind === kind)
        if (existing) {
          return {
            ...prev,
            activeTabId: existing.tabId,
            tabs: prev.tabs.map((t) =>
              t.tabId === existing.tabId ? { ...t, lastActiveAt: Date.now() } : t
            ),
          }
        }

        // Create new tab
        const newTab: PaneTab = {
          tabId: crypto.randomUUID(),
          kind,
          title,
          scrollTop: 0,
          lastActiveAt: Date.now(),
          pinned: false,
        }

        let tabs = [...prev.tabs, newTab]

        // Evict if over limit
        if (tabs.length > MAX_TABS) {
          tabs = evictLRU(tabs, newTab.tabId)
        }

        return {
          tabs,
          activeTabId: newTab.tabId,
        }
      })
    },
    [setState]
  )

  const closeTab = useCallback(
    (tabId: string) => {
      setState((prev) => {
        const idx = prev.tabs.findIndex((t) => t.tabId === tabId)
        if (idx === -1) return prev

        const remaining = prev.tabs.filter((t) => t.tabId !== tabId)

        // If no tabs remain, reset to default
        if (remaining.length === 0) {
          return makeDefaultState()
        }

        // If closed tab was active, activate nearest
        let nextActiveId = prev.activeTabId
        if (prev.activeTabId === tabId) {
          // Try same index, or last tab
          const nextIdx = Math.min(idx, remaining.length - 1)
          nextActiveId = remaining[nextIdx]!.tabId
        }

        return {
          tabs: remaining,
          activeTabId: nextActiveId,
        }
      })
    },
    [setState]
  )

  const setActiveTab = useCallback(
    (tabId: string) => {
      setState((prev) => ({
        ...prev,
        activeTabId: tabId,
        tabs: prev.tabs.map((t) => (t.tabId === tabId ? { ...t, lastActiveAt: Date.now() } : t)),
      }))
    },
    [setState]
  )

  const updateTabScroll = useCallback(
    (tabId: string, scrollTop: number) => {
      setState((prev) => ({
        ...prev,
        tabs: prev.tabs.map((t) => (t.tabId === tabId ? { ...t, scrollTop } : t)),
      }))
    },
    [setState]
  )

  const pinTab = useCallback(
    (tabId: string, pinned: boolean) => {
      setState((prev) => ({
        ...prev,
        tabs: prev.tabs.map((t) => (t.tabId === tabId ? { ...t, pinned } : t)),
      }))
    },
    [setState]
  )

  // ============================================
  // Context Value
  // ============================================

  const activeTab = useMemo(
    () => state.tabs.find((t) => t.tabId === state.activeTabId),
    [state.tabs, state.activeTabId]
  )

  const value = useMemo<TabsContextValue>(
    () => ({
      tabs: state.tabs,
      activeTabId: state.activeTabId,
      activeTab,
      openDoc,
      openPage,
      closeTab,
      setActiveTab,
      updateTabScroll,
      pinTab,
    }),
    [
      state.tabs,
      state.activeTabId,
      activeTab,
      openDoc,
      openPage,
      closeTab,
      setActiveTab,
      updateTabScroll,
      pinTab,
    ]
  )

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>
}

export function useTabs(): TabsContextValue {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('useTabs must be used within a TabsProvider')
  }
  return context
}
