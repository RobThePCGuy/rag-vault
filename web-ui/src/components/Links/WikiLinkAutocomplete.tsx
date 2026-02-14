import { useState, useRef, useEffect } from 'react'

interface WikiLinkSuggestion {
  docTitle: string
  filePath: string
  matchScore: number
}

interface WikiLinkAutocompleteProps {
  suggestions: WikiLinkSuggestion[]
  isVisible: boolean
  position: { x: number; y: number }
  onSelect: (suggestion: WikiLinkSuggestion) => void
  onDismiss: () => void
}

export function WikiLinkAutocomplete({
  suggestions,
  isVisible,
  position,
  onSelect,
  onDismiss,
}: WikiLinkAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset selection when suggestions change
  // biome-ignore lint/correctness/useExhaustiveDependencies: suggestions triggers reset
  useEffect(() => {
    setSelectedIndex(0)
  }, [suggestions])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const selected = suggestions[selectedIndex]
        if (selected) onSelect(selected)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onDismiss()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, suggestions, selectedIndex, onSelect, onDismiss])

  if (!isVisible || suggestions.length === 0) return null

  return (
    <div
      ref={listRef}
      className="ws-autocomplete"
      style={{ left: position.x, top: position.y }}
      role="listbox"
    >
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion.filePath}
          type="button"
          role="option"
          aria-selected={index === selectedIndex}
          className={`ws-autocomplete-item ${index === selectedIndex ? 'ws-autocomplete-item--selected' : ''}`}
          onClick={() => onSelect(suggestion)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <span className="ws-autocomplete-title">{suggestion.docTitle}</span>
          <span className="ws-autocomplete-path">{suggestion.filePath.split('/').pop()}</span>
        </button>
      ))}
    </div>
  )
}
