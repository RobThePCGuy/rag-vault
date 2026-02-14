import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useResizablePanel } from '../useResizablePanel'

const defaultOptions = {
  storageKey: 'test-panel',
  defaultWidth: 220,
  min: 180,
  max: 320,
}

describe('useResizablePanel', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('returns default width and collapsed=false', () => {
    const { result } = renderHook(() => useResizablePanel(defaultOptions))

    expect(result.current.width).toBe(220)
    expect(result.current.collapsed).toBe(false)
  })

  it('clamps width to bounds', () => {
    const { result } = renderHook(() => useResizablePanel(defaultOptions))

    act(() => {
      result.current.setWidth(500)
    })
    expect(result.current.width).toBe(320)

    act(() => {
      result.current.setWidth(50)
    })
    expect(result.current.width).toBe(180)
  })

  it('toggles collapsed state', () => {
    const { result } = renderHook(() => useResizablePanel(defaultOptions))

    act(() => {
      result.current.toggleCollapsed()
    })
    expect(result.current.collapsed).toBe(true)

    act(() => {
      result.current.toggleCollapsed()
    })
    expect(result.current.collapsed).toBe(false)
  })
})
