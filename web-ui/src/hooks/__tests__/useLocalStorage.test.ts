import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '../useLocalStorage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('should return initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))

    expect(result.current[0]).toBe('default')
  })

  it('should return stored value when localStorage has data', () => {
    window.localStorage.setItem('test-key', JSON.stringify('stored-value'))

    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))

    expect(result.current[0]).toBe('stored-value')
  })

  it('should persist value to localStorage when updated', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    act(() => {
      result.current[1]('updated')
    })

    expect(result.current[0]).toBe('updated')
    expect(JSON.parse(window.localStorage.getItem('test-key')!)).toBe('updated')
  })

  it('should support functional updates', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 0))

    act(() => {
      result.current[1]((prev) => prev + 1)
    })

    expect(result.current[0]).toBe(1)

    act(() => {
      result.current[1]((prev) => prev + 5)
    })

    expect(result.current[0]).toBe(6)
  })

  it('should handle object values', () => {
    const initialObj = { name: 'test', count: 0 }
    const { result } = renderHook(() => useLocalStorage('obj-key', initialObj))

    expect(result.current[0]).toEqual(initialObj)

    act(() => {
      result.current[1]({ name: 'updated', count: 5 })
    })

    expect(result.current[0]).toEqual({ name: 'updated', count: 5 })
    expect(JSON.parse(window.localStorage.getItem('obj-key')!)).toEqual({
      name: 'updated',
      count: 5,
    })
  })

  it('should handle array values', () => {
    const { result } = renderHook(() => useLocalStorage<string[]>('arr-key', []))

    act(() => {
      result.current[1](['item1', 'item2'])
    })

    expect(result.current[0]).toEqual(['item1', 'item2'])
  })

  it('should use same key across multiple hook instances', () => {
    const { result: result1 } = renderHook(() => useLocalStorage('shared-key', 'a'))
    // result2 is rendered to test that multiple instances share the same key
    renderHook(() => useLocalStorage('shared-key', 'b'))

    // result2 should get the value from result1 since it was rendered first
    // and persisted to localStorage
    expect(result1.current[0]).toBe('a')
    // When result1 sets a value, result2 reads from localStorage on initial render
    act(() => {
      result1.current[1]('from-result1')
    })

    // Note: In real apps, the storage event would sync this,
    // but in tests we need to verify the localStorage directly
    expect(JSON.parse(window.localStorage.getItem('shared-key')!)).toBe('from-result1')
  })

  it('should handle invalid JSON in localStorage gracefully', () => {
    window.localStorage.setItem('bad-json', 'not valid json{')

    const { result } = renderHook(() => useLocalStorage('bad-json', 'fallback'))

    expect(result.current[0]).toBe('fallback')
  })

  it('should use different keys independently', () => {
    const { result: result1 } = renderHook(() => useLocalStorage('key1', 'val1'))
    const { result: result2 } = renderHook(() => useLocalStorage('key2', 'val2'))

    act(() => {
      result1.current[1]('updated1')
    })

    expect(result1.current[0]).toBe('updated1')
    expect(result2.current[0]).toBe('val2')
  })
})

describe('useLocalStorage error handling', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should warn when localStorage.setItem fails', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result } = renderHook(() => useLocalStorage('error-test-key', 'initial'))

    // Mock setItem to throw after initial render by overwriting the method
    const originalSetItem = window.localStorage.setItem.bind(window.localStorage)
    window.localStorage.setItem = () => {
      throw new Error('QuotaExceeded')
    }

    act(() => {
      result.current[1]('new-value')
    })

    // Restore immediately
    window.localStorage.setItem = originalSetItem

    // State should still update even if localStorage fails
    expect(result.current[0]).toBe('new-value')
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to persist "error-test-key" to localStorage:',
      expect.any(Error)
    )
  })
})

describe('useLocalStorage storage events', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should ignore storage events for different keys', () => {
    const { result } = renderHook(() => useLocalStorage('my-key', 'initial'))

    act(() => {
      // Simulate storage event for a different key
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'other-key',
          newValue: JSON.stringify('other-value'),
        })
      )
    })

    // Value should remain unchanged
    expect(result.current[0]).toBe('initial')
  })

  it('should ignore storage events with null newValue', () => {
    const { result } = renderHook(() => useLocalStorage('my-key', 'initial'))

    act(() => {
      result.current[1]('updated')
    })

    expect(result.current[0]).toBe('updated')

    act(() => {
      // Simulate storage event with null newValue (item deleted)
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'my-key',
          newValue: null,
        })
      )
    })

    // Value should remain the same when newValue is null
    expect(result.current[0]).toBe('updated')
  })

  it('should handle storage events with invalid JSON gracefully', () => {
    const { result } = renderHook(() => useLocalStorage('my-key', 'initial'))

    act(() => {
      result.current[1]('updated')
    })

    expect(result.current[0]).toBe('updated')

    act(() => {
      // Simulate storage event with invalid JSON
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'my-key',
          newValue: 'not valid json{',
        })
      )
    })

    // Value should remain unchanged when JSON parsing fails
    expect(result.current[0]).toBe('updated')
  })
})
