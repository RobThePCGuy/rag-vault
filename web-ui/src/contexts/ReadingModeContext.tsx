import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

// ============================================
// Types
// ============================================

export type ReadingMode = 'skim' | 'full'

export interface ReadingModeContextValue {
  mode: ReadingMode
  setMode: (mode: ReadingMode) => void
  toggleMode: () => void
  isSkimMode: boolean
  isFullMode: boolean
}

// ============================================
// Context
// ============================================

const ReadingModeContext = createContext<ReadingModeContextValue | null>(null)

interface ReadingModeProviderProps {
  children: ReactNode
  vaultId?: string
}

/**
 * Provider for reading mode preference (skim vs full)
 */
export function ReadingModeProvider({ children, vaultId = 'default' }: ReadingModeProviderProps) {
  const storageKey = `rag-vault-reading-mode-${vaultId}`
  const [mode, setModeRaw] = useLocalStorage<ReadingMode>(storageKey, 'full')

  const setMode = useCallback(
    (newMode: ReadingMode) => {
      setModeRaw(newMode)
    },
    [setModeRaw]
  )

  const toggleMode = useCallback(() => {
    setModeRaw((prev) => (prev === 'skim' ? 'full' : 'skim'))
  }, [setModeRaw])

  const value = useMemo<ReadingModeContextValue>(
    () => ({
      mode,
      setMode,
      toggleMode,
      isSkimMode: mode === 'skim',
      isFullMode: mode === 'full',
    }),
    [mode, setMode, toggleMode]
  )

  return <ReadingModeContext.Provider value={value}>{children}</ReadingModeContext.Provider>
}

export function useReadingMode(): ReadingModeContextValue {
  const context = useContext(ReadingModeContext)
  if (!context) {
    throw new Error('useReadingMode must be used within a ReadingModeProvider')
  }
  return context
}
