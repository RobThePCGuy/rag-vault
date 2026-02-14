import { useEffect, useRef } from 'react'
import { useCommandPalette, type CommandAction } from '../../hooks/useCommandPalette'

function categoryLabel(category: CommandAction['category']): string {
  switch (category) {
    case 'document':
      return 'Documents'
    case 'navigation':
      return 'Navigation'
    case 'action':
      return 'Actions'
  }
}

export function CommandPalette() {
  const {
    isOpen,
    close,
    query,
    setQuery,
    results,
    selectedIndex,
    setSelectedIndex,
    executeSelected,
  } = useCommandPalette()

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Auto-focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      // Use a small delay so the DOM is painted before focusing
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
      return () => cancelAnimationFrame(id)
    }
  }, [isOpen])

  // Scroll selected item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return
    const selected = listRef.current.querySelector('[data-selected="true"]')
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex, isOpen])

  // Keyboard navigation within the palette
  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(Math.min(selectedIndex + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(Math.max(selectedIndex - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        executeSelected()
        break
      case 'Escape':
        e.preventDefault()
        close()
        break
    }
  }

  if (!isOpen) return null

  // Group results by category, preserving order
  const grouped: { category: CommandAction['category']; items: { action: CommandAction; globalIndex: number }[] }[] = []
  const seenCategories = new Set<string>()

  for (let i = 0; i < results.length; i++) {
    const action = results[i]
    if (!seenCategories.has(action.category)) {
      seenCategories.add(action.category)
      grouped.push({ category: action.category, items: [] })
    }
    const group = grouped.find((g) => g.category === action.category)
    group?.items.push({ action, globalIndex: i })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="ws-command-palette-backdrop"
        onClick={close}
        onKeyDown={(e) => {
          if (e.key === 'Escape') close()
        }}
      />

      {/* Dialog */}
      <div
        className="ws-command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={handleKeyDown}
      >
        <input
          ref={inputRef}
          className="ws-command-palette-input ws-input"
          type="text"
          placeholder="Search documents, pages, actions..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Command palette search"
          aria-controls="command-palette-results"
          aria-activedescendant={
            results[selectedIndex] ? `command-palette-item-${results[selectedIndex].id}` : undefined
          }
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
        />

        <div
          ref={listRef}
          id="command-palette-results"
          className="ws-command-palette-results"
          role="listbox"
          aria-label="Command palette results"
        >
          {results.length === 0 && (
            <div className="ws-command-palette-empty">No results found</div>
          )}

          {grouped.map((group) => (
            <div key={group.category} className="ws-command-palette-group">
              <div className="ws-command-palette-category">{categoryLabel(group.category)}</div>
              {group.items.map(({ action, globalIndex }) => (
                <button
                  key={action.id}
                  id={`command-palette-item-${action.id}`}
                  className={`ws-command-palette-item ${globalIndex === selectedIndex ? 'ws-command-palette-item--selected' : ''}`}
                  role="option"
                  aria-selected={globalIndex === selectedIndex}
                  data-selected={globalIndex === selectedIndex}
                  onClick={() => {
                    setSelectedIndex(globalIndex)
                    action.onSelect()
                    close()
                  }}
                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                  type="button"
                >
                  <span className="ws-command-palette-item-icon">{action.icon}</span>
                  <span className="ws-command-palette-item-content">
                    <span className="ws-command-palette-item-label">{action.label}</span>
                    {action.description && (
                      <span className="ws-command-palette-item-description">{action.description}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="ws-command-palette-footer">
          <span className="ws-command-palette-hint">
            <kbd>↑↓</kbd> navigate
          </span>
          <span className="ws-command-palette-hint">
            <kbd>Enter</kbd> select
          </span>
          <span className="ws-command-palette-hint">
            <kbd>Esc</kbd> close
          </span>
        </div>
      </div>
    </>
  )
}
