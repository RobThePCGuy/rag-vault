import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCommandPalette } from '../useCommandPalette'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// Mock useFiles
vi.mock('../useFiles', () => ({
  useFiles: () => ({
    files: [
      { filePath: 'notes/architecture.md', chunkCount: 5 },
      { filePath: 'notes/design-patterns.md', chunkCount: 3 },
      { filePath: 'journal/2024-01-15.md', chunkCount: 2 },
    ],
    isLoading: false,
    error: null,
  }),
}))

// Mock useSelection
const mockSelect = vi.fn()
vi.mock('../../contexts/SelectionContext', () => ({
  useSelection: () => ({
    selection: { docId: null, chunkIndex: null, chunkRef: null, source: null },
    select: mockSelect,
    clearSelection: vi.fn(),
  }),
}))

describe('useCommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts closed with empty query', () => {
    const { result } = renderHook(() => useCommandPalette())

    expect(result.current.isOpen).toBe(false)
    expect(result.current.query).toBe('')
    expect(result.current.selectedIndex).toBe(0)
  })

  it('opens on Ctrl+K', () => {
    const { result } = renderHook(() => useCommandPalette())

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
    })

    expect(result.current.isOpen).toBe(true)
  })

  it('opens on Meta+K (Cmd+K)', () => {
    const { result } = renderHook(() => useCommandPalette())

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
    })

    expect(result.current.isOpen).toBe(true)
  })

  it('closes on second Ctrl+K (toggle)', () => {
    const { result } = renderHook(() => useCommandPalette())

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
    })
    expect(result.current.isOpen).toBe(true)

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
    })
    expect(result.current.isOpen).toBe(false)
  })

  it('closes via close()', () => {
    const { result } = renderHook(() => useCommandPalette())

    act(() => result.current.open())
    expect(result.current.isOpen).toBe(true)

    act(() => result.current.close())
    expect(result.current.isOpen).toBe(false)
  })

  it('resets query and selectedIndex when opened', () => {
    const { result } = renderHook(() => useCommandPalette())

    // Open, set a query, change selection
    act(() => result.current.open())
    act(() => result.current.setQuery('arch'))
    act(() => result.current.setSelectedIndex(2))

    // Close and re-open
    act(() => result.current.close())
    act(() => result.current.open())

    expect(result.current.query).toBe('')
    expect(result.current.selectedIndex).toBe(0)
  })

  it('includes document actions from files', () => {
    const { result } = renderHook(() => useCommandPalette())

    const docActions = result.current.results.filter((a) => a.category === 'document')
    expect(docActions).toHaveLength(3)
    expect(docActions[0]!.label).toBe('architecture.md')
    expect(docActions[1]!.label).toBe('design-patterns.md')
    expect(docActions[2]!.label).toBe('2024-01-15.md')
  })

  it('includes navigation actions', () => {
    const { result } = renderHook(() => useCommandPalette())

    const navActions = result.current.results.filter((a) => a.category === 'navigation')
    expect(navActions.length).toBeGreaterThanOrEqual(6)

    const labels = navActions.map((a) => a.label)
    expect(labels).toContain('Search')
    expect(labels).toContain('Upload')
    expect(labels).toContain('Files')
    expect(labels).toContain('Settings')
  })

  it('includes utility actions', () => {
    const { result } = renderHook(() => useCommandPalette())

    const actionItems = result.current.results.filter((a) => a.category === 'action')
    expect(actionItems.length).toBeGreaterThanOrEqual(2)

    const labels = actionItems.map((a) => a.label)
    expect(labels).toContain('Toggle left rail')
    expect(labels).toContain('Toggle right rail')
  })

  it('filters results by query (fuzzy match on label)', () => {
    const { result } = renderHook(() => useCommandPalette())

    act(() => result.current.setQuery('arch'))

    // Should match "architecture.md" (label contains "arch") and "Search" (label contains "arch")
    const labels = result.current.results.map((a) => a.label)
    expect(labels).toContain('architecture.md')
    expect(labels).toContain('Search')
    // Should not include things like "Upload" or "Files"
    expect(labels).not.toContain('Upload')
    expect(labels).not.toContain('Files')
  })

  it('filters results by query (fuzzy match on description)', () => {
    const { result } = renderHook(() => useCommandPalette())

    act(() => result.current.setQuery('settings'))

    const labels = result.current.results.map((a) => a.label)
    expect(labels).toContain('Settings')
  })

  it('returns empty results for non-matching query', () => {
    const { result } = renderHook(() => useCommandPalette())

    act(() => result.current.setQuery('zzzznotfound'))

    expect(result.current.results).toHaveLength(0)
  })

  it('arrow down increases selectedIndex', () => {
    const { result } = renderHook(() => useCommandPalette())

    expect(result.current.selectedIndex).toBe(0)

    act(() => result.current.setSelectedIndex(1))
    expect(result.current.selectedIndex).toBe(1)

    act(() => result.current.setSelectedIndex(2))
    expect(result.current.selectedIndex).toBe(2)
  })

  it('executeSelected calls onSelect for the selected action and closes', () => {
    const { result } = renderHook(() => useCommandPalette())

    act(() => result.current.open())

    // Find the index of a navigation action (e.g., "Search")
    const searchIdx = result.current.results.findIndex((a) => a.id === 'nav:search')
    expect(searchIdx).toBeGreaterThanOrEqual(0)

    act(() => result.current.setSelectedIndex(searchIdx))
    act(() => result.current.executeSelected())

    expect(mockNavigate).toHaveBeenCalledWith('/')
    expect(result.current.isOpen).toBe(false)
  })

  it('executeSelected on a document action selects doc and navigates', () => {
    const { result } = renderHook(() => useCommandPalette())

    act(() => result.current.open())

    // First result should be a document
    const docIdx = result.current.results.findIndex((a) => a.id === 'doc:notes/architecture.md')
    expect(docIdx).toBeGreaterThanOrEqual(0)

    act(() => result.current.setSelectedIndex(docIdx))
    act(() => result.current.executeSelected())

    expect(mockSelect).toHaveBeenCalledWith({
      docId: 'notes/architecture.md',
      source: 'command-palette',
    })
    expect(mockNavigate).toHaveBeenCalledWith('/reader?doc=notes%2Farchitecture.md')
    expect(result.current.isOpen).toBe(false)
  })

  it('clamps selectedIndex when results shrink', () => {
    const { result } = renderHook(() => useCommandPalette())

    // Start with all results, select a high index
    const totalResults = result.current.results.length
    act(() => result.current.setSelectedIndex(totalResults - 1))
    expect(result.current.selectedIndex).toBe(totalResults - 1)

    // Filter to a smaller set
    act(() => result.current.setQuery('zzzznotfound'))
    expect(result.current.results).toHaveLength(0)
    expect(result.current.selectedIndex).toBe(0)
  })
})
