import { useEffect, useRef } from 'react'

interface ShortcutHandlers {
  onToggleLeftRail?: () => void
  onToggleRightRail?: () => void
  onNavigateBack?: () => void
  onNavigateForward?: () => void
}

/**
 * Global keyboard shortcuts for the workstation shell.
 *
 * Registers a single keydown listener on the document and dispatches to the
 * provided handlers. Handlers are stored in a ref so the listener is only
 * registered once (on mount) and torn down once (on unmount).
 *
 * Handled shortcuts (Mod = Ctrl on Windows/Linux, Cmd on macOS):
 *   Mod+[          Toggle left rail
 *   Mod+]          Toggle right rail
 *   Mod+ArrowLeft  Navigate back
 *   Mod+ArrowRight Navigate forward
 *
 * Deliberately NOT handled here:
 *   Mod+K   - Command palette registers its own listener
 *   Escape  - Individual components manage their own escape handling
 */
export function useShortcuts(handlers: ShortcutHandlers): void {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      switch (e.key) {
        case '[':
          e.preventDefault()
          handlersRef.current.onToggleLeftRail?.()
          break

        case ']':
          e.preventDefault()
          handlersRef.current.onToggleRightRail?.()
          break

        case 'ArrowLeft':
          e.preventDefault()
          handlersRef.current.onNavigateBack?.()
          break

        case 'ArrowRight':
          e.preventDefault()
          handlersRef.current.onNavigateForward?.()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
}
