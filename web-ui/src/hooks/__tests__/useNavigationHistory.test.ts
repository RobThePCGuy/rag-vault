import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNavigationHistory } from '../useNavigationHistory'

describe('useNavigationHistory', () => {
  it('starts empty with no navigation available', () => {
    const { result } = renderHook(() => useNavigationHistory())

    expect(result.current.current).toBeNull()
    expect(result.current.canGoBack).toBe(false)
    expect(result.current.canGoForward).toBe(false)
    expect(result.current.history).toEqual([])
    expect(result.current.currentIndex).toBe(-1)
  })

  it('push adds entry and updates current', () => {
    const { result } = renderHook(() => useNavigationHistory())

    act(() => {
      result.current.push('doc-1', 0)
    })

    expect(result.current.current).not.toBeNull()
    expect(result.current.current!.docId).toBe('doc-1')
    expect(result.current.current!.chunkIndex).toBe(0)
    expect(result.current.currentIndex).toBe(0)
    expect(result.current.history).toHaveLength(1)
  })

  it('push multiple entries then goBack returns previous', () => {
    const { result } = renderHook(() => useNavigationHistory())

    act(() => {
      result.current.push('doc-1')
    })
    act(() => {
      result.current.push('doc-2')
    })
    act(() => {
      result.current.push('doc-3')
    })

    expect(result.current.currentIndex).toBe(2)
    expect(result.current.current!.docId).toBe('doc-3')

    let entry: ReturnType<typeof result.current.goBack>
    act(() => {
      entry = result.current.goBack()
    })

    expect(entry!).not.toBeNull()
    expect(entry!.docId).toBe('doc-2')
    expect(result.current.current!.docId).toBe('doc-2')
    expect(result.current.currentIndex).toBe(1)
    expect(result.current.canGoBack).toBe(true)
    expect(result.current.canGoForward).toBe(true)
  })

  it('goBack and goForward round-trip', () => {
    const { result } = renderHook(() => useNavigationHistory())

    act(() => {
      result.current.push('doc-a')
    })
    act(() => {
      result.current.push('doc-b')
    })

    // Go back to doc-a
    act(() => {
      result.current.goBack()
    })
    expect(result.current.current!.docId).toBe('doc-a')

    // Go forward to doc-b
    act(() => {
      result.current.goForward()
    })
    expect(result.current.current!.docId).toBe('doc-b')
    expect(result.current.canGoForward).toBe(false)
  })

  it('push after goBack discards forward history', () => {
    const { result } = renderHook(() => useNavigationHistory())

    act(() => {
      result.current.push('doc-1')
    })
    act(() => {
      result.current.push('doc-2')
    })
    act(() => {
      result.current.push('doc-3')
    })

    // Go back to doc-2
    act(() => {
      result.current.goBack()
    })
    expect(result.current.current!.docId).toBe('doc-2')

    // Push a new entry -- doc-3 should be discarded
    act(() => {
      result.current.push('doc-4')
    })

    expect(result.current.history).toHaveLength(3)
    expect(result.current.current!.docId).toBe('doc-4')
    expect(result.current.canGoForward).toBe(false)

    // Going back should reach doc-2, then doc-1
    act(() => {
      result.current.goBack()
    })
    expect(result.current.current!.docId).toBe('doc-2')

    act(() => {
      result.current.goBack()
    })
    expect(result.current.current!.docId).toBe('doc-1')
  })

  it('duplicate consecutive push is ignored', () => {
    const { result } = renderHook(() => useNavigationHistory())

    act(() => {
      result.current.push('doc-1', 0)
    })
    act(() => {
      result.current.push('doc-1', 0)
    })
    act(() => {
      result.current.push('doc-1', 0)
    })

    expect(result.current.history).toHaveLength(1)
    expect(result.current.currentIndex).toBe(0)
  })

  it('allows same docId with different chunkIndex', () => {
    const { result } = renderHook(() => useNavigationHistory())

    act(() => {
      result.current.push('doc-1', 0)
    })
    act(() => {
      result.current.push('doc-1', 1)
    })
    act(() => {
      result.current.push('doc-1', 2)
    })

    expect(result.current.history).toHaveLength(3)
  })

  it('caps history at MAX_HISTORY (100) entries, dropping oldest', () => {
    const { result } = renderHook(() => useNavigationHistory())

    for (let i = 0; i < 105; i++) {
      act(() => {
        result.current.push(`doc-${i}`)
      })
    }

    expect(result.current.history).toHaveLength(100)
    // Oldest entries should have been dropped
    expect(result.current.history[0]!.docId).toBe('doc-5')
    expect(result.current.history[99]!.docId).toBe('doc-104')
    expect(result.current.currentIndex).toBe(99)
    expect(result.current.current!.docId).toBe('doc-104')
  })

  it('goBack when at start returns null', () => {
    const { result } = renderHook(() => useNavigationHistory())

    act(() => {
      result.current.push('doc-1')
    })

    let entry: ReturnType<typeof result.current.goBack>
    act(() => {
      entry = result.current.goBack()
    })

    expect(entry!).toBeNull()
    expect(result.current.current!.docId).toBe('doc-1')
    expect(result.current.currentIndex).toBe(0)
  })

  it('goForward when at end returns null', () => {
    const { result } = renderHook(() => useNavigationHistory())

    act(() => {
      result.current.push('doc-1')
    })

    let entry: ReturnType<typeof result.current.goForward>
    act(() => {
      entry = result.current.goForward()
    })

    expect(entry!).toBeNull()
    expect(result.current.current!.docId).toBe('doc-1')
    expect(result.current.currentIndex).toBe(0)
  })

  it('goBack and goForward on empty history return null', () => {
    const { result } = renderHook(() => useNavigationHistory())

    let backEntry: ReturnType<typeof result.current.goBack>
    let forwardEntry: ReturnType<typeof result.current.goForward>

    act(() => {
      backEntry = result.current.goBack()
    })
    act(() => {
      forwardEntry = result.current.goForward()
    })

    expect(backEntry!).toBeNull()
    expect(forwardEntry!).toBeNull()
  })

  it('push with null chunkIndex is treated as null', () => {
    const { result } = renderHook(() => useNavigationHistory())

    act(() => {
      result.current.push('doc-1', null)
    })

    expect(result.current.current!.chunkIndex).toBeNull()
  })

  it('push with undefined chunkIndex is stored as null', () => {
    const { result } = renderHook(() => useNavigationHistory())

    act(() => {
      result.current.push('doc-1')
    })

    expect(result.current.current!.chunkIndex).toBeNull()
  })
})
