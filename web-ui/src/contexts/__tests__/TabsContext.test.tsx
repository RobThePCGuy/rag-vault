import { renderHook, act } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TabsProvider, useTabs, MAX_TABS } from '../TabsContext'
import type { ReactNode } from 'react'

function wrapper({ children }: { children: ReactNode }) {
  return <TabsProvider dbId="test-db">{children}</TabsProvider>
}

afterEach(() => {
  localStorage.clear()
})

describe('TabsContext', () => {
  it('starts with a default search tab', () => {
    const { result } = renderHook(() => useTabs(), { wrapper })

    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.tabs[0]!.kind).toBe('search')
    expect(result.current.activeTabId).toBe(result.current.tabs[0]!.tabId)
  })

  it('opens a doc tab and focuses it', () => {
    const { result } = renderHook(() => useTabs(), { wrapper })

    act(() => {
      result.current.openDoc('doc-123', 'My Document')
    })

    expect(result.current.tabs).toHaveLength(2)

    const docTab = result.current.tabs.find((t) => t.kind === 'doc')
    expect(docTab).toBeDefined()
    expect(docTab!.docId).toBe('doc-123')
    expect(result.current.activeTabId).toBe(docTab!.tabId)
  })

  it('focuses existing tab instead of creating duplicate', () => {
    const { result } = renderHook(() => useTabs(), { wrapper })

    act(() => {
      result.current.openDoc('doc-123', 'My Document')
    })

    act(() => {
      result.current.openDoc('doc-123', 'My Document')
    })

    const docTabs = result.current.tabs.filter((t) => t.kind === 'doc' && t.docId === 'doc-123')
    expect(docTabs).toHaveLength(1)
  })

  it('evicts LRU non-pinned tab when reaching max', () => {
    const { result } = renderHook(() => useTabs(), { wrapper })

    // The default search tab is pinned. Open enough docs to exceed MAX_TABS.
    // We start with 1 pinned tab, so we need to open MAX_TABS docs to trigger eviction.
    for (let i = 0; i < MAX_TABS; i++) {
      act(() => {
        result.current.openDoc(`doc-${i}`, `Doc ${i}`)
      })
    }

    // Total should not exceed MAX_TABS (pinned search + docs, with eviction)
    expect(result.current.tabs.length).toBeLessThanOrEqual(MAX_TABS)
  })

  it('closes a tab', () => {
    const { result } = renderHook(() => useTabs(), { wrapper })

    act(() => {
      result.current.openDoc('doc-to-close', 'Close Me')
    })

    const docTab = result.current.tabs.find((t) => t.docId === 'doc-to-close')
    expect(docTab).toBeDefined()

    act(() => {
      result.current.closeTab(docTab!.tabId)
    })

    const removed = result.current.tabs.find((t) => t.docId === 'doc-to-close')
    expect(removed).toBeUndefined()
  })
})
