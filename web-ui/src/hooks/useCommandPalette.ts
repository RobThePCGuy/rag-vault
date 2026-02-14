import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFiles } from './useFiles'
import { useSelection } from '../contexts/SelectionContext'

export interface CommandAction {
  id: string
  label: string
  description?: string
  icon?: string
  category: 'document' | 'navigation' | 'action'
  onSelect: () => void
}

export interface UseCommandPaletteReturn {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  query: string
  setQuery: (q: string) => void
  results: CommandAction[]
  selectedIndex: number
  setSelectedIndex: (i: number) => void
  executeSelected: () => void
}

function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  return lower.includes(q)
}

export function useCommandPalette(): UseCommandPaletteReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const { files } = useFiles()
  const { select } = useSelection()
  const navigate = useNavigate()

  const open = useCallback(() => {
    setIsOpen(true)
    setQuery('')
    setSelectedIndex(0)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) {
        setQuery('')
        setSelectedIndex(0)
      }
      return !prev
    })
  }, [])

  // Build all possible actions
  const allActions = useMemo((): CommandAction[] => {
    const docActions: CommandAction[] = files.map((file) => {
      const name = file.filePath.split('/').pop() || file.filePath
      return {
        id: `doc:${file.filePath}`,
        label: name,
        description: file.filePath,
        icon: 'D',
        category: 'document' as const,
        onSelect: () => {
          select({ docId: file.filePath, source: 'command-palette' })
          navigate(`/reader?doc=${encodeURIComponent(file.filePath)}`)
        },
      }
    })

    const navActions: CommandAction[] = [
      {
        id: 'nav:search',
        label: 'Search',
        description: 'Go to search page',
        icon: 'S',
        category: 'navigation' as const,
        onSelect: () => navigate('/'),
      },
      {
        id: 'nav:upload',
        label: 'Upload',
        description: 'Go to upload page',
        icon: 'U',
        category: 'navigation' as const,
        onSelect: () => navigate('/upload'),
      },
      {
        id: 'nav:files',
        label: 'Files',
        description: 'Go to files page',
        icon: 'F',
        category: 'navigation' as const,
        onSelect: () => navigate('/files'),
      },
      {
        id: 'nav:collections',
        label: 'Collections',
        description: 'Go to collections page',
        icon: 'C',
        category: 'navigation' as const,
        onSelect: () => navigate('/collections'),
      },
      {
        id: 'nav:status',
        label: 'Status',
        description: 'Go to status page',
        icon: 'T',
        category: 'navigation' as const,
        onSelect: () => navigate('/status'),
      },
      {
        id: 'nav:settings',
        label: 'Settings',
        description: 'Go to settings page',
        icon: 'G',
        category: 'navigation' as const,
        onSelect: () => navigate('/settings'),
      },
    ]

    const utilActions: CommandAction[] = [
      {
        id: 'action:toggle-left-rail',
        label: 'Toggle left rail',
        description: 'Show or hide the left sidebar',
        icon: 'L',
        category: 'action' as const,
        onSelect: () => {
          // Dispatch a custom event that the shell can listen for
          window.dispatchEvent(new CustomEvent('ws:toggle-left-rail'))
        },
      },
      {
        id: 'action:toggle-right-rail',
        label: 'Toggle right rail',
        description: 'Show or hide the right sidebar',
        icon: 'R',
        category: 'action' as const,
        onSelect: () => {
          window.dispatchEvent(new CustomEvent('ws:toggle-right-rail'))
        },
      },
    ]

    return [...docActions, ...navActions, ...utilActions]
  }, [files, select, navigate])

  // Filter actions by query
  const results = useMemo(() => {
    if (!query) return allActions
    return allActions.filter(
      (action) =>
        fuzzyMatch(action.label, query) ||
        (action.description && fuzzyMatch(action.description, query))
    )
  }, [allActions, query])

  // Clamp selectedIndex when results change
  useEffect(() => {
    setSelectedIndex((prev) => {
      if (results.length === 0) return 0
      return Math.min(prev, results.length - 1)
    })
  }, [results.length])

  const executeSelected = useCallback(() => {
    const action = results[selectedIndex]
    if (action) {
      action.onSelect()
      close()
    }
  }, [results, selectedIndex, close])

  // Global keyboard listener for Mod+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  return {
    isOpen,
    open,
    close,
    toggle,
    query,
    setQuery,
    results,
    selectedIndex,
    setSelectedIndex,
    executeSelected,
  }
}
