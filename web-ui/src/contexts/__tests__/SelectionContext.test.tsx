import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { SelectionProvider, useSelection } from '../SelectionContext'

function wrapper({ children }: { children: ReactNode }) {
  return <SelectionProvider>{children}</SelectionProvider>
}

describe('SelectionContext', () => {
  it('starts with null selection', () => {
    const { result } = renderHook(() => useSelection(), { wrapper })
    expect(result.current.selection.docId).toBeNull()
  })

  it('updates selection via select()', () => {
    const { result } = renderHook(() => useSelection(), { wrapper })

    act(() => {
      result.current.select({
        docId: 'doc-1',
        chunkIndex: 3,
        source: 'search',
      })
    })

    expect(result.current.selection.docId).toBe('doc-1')
    expect(result.current.selection.chunkIndex).toBe(3)
    expect(result.current.selection.source).toBe('search')
  })

  it('clears selection via clearSelection()', () => {
    const { result } = renderHook(() => useSelection(), { wrapper })

    act(() => {
      result.current.select({
        docId: 'doc-1',
        chunkIndex: 3,
        source: 'reader',
      })
    })

    expect(result.current.selection.docId).toBe('doc-1')

    act(() => {
      result.current.clearSelection()
    })

    expect(result.current.selection.docId).toBeNull()
  })
})
