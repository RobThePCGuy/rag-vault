import { createContext, type ReactNode, useCallback, useContext, useEffect } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

export type Theme = 'light' | 'dark' | 'system'
export type StatsRefreshInterval = 0 | 30000 | 60000 | 300000 // 0 = off, 30s, 1m, 5m

interface Preferences {
  theme: Theme
  lastBrowsedPath: string
  showHiddenFiles: boolean
  statsRefreshInterval: StatsRefreshInterval
}

const defaultPreferences: Preferences = {
  theme: 'system',
  lastBrowsedPath: '/',
  showHiddenFiles: false,
  statsRefreshInterval: 0,
}

interface PreferencesContextValue {
  preferences: Preferences
  setTheme: (theme: Theme) => void
  setLastBrowsedPath: (path: string) => void
  setShowHiddenFiles: (show: boolean) => void
  setStatsRefreshInterval: (interval: StatsRefreshInterval) => void
  effectiveTheme: 'light' | 'dark'
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useLocalStorage<Preferences>(
    'rag-vault-preferences',
    defaultPreferences
  )

  // Calculate effective theme (resolve 'system' to actual value)
  const effectiveTheme = preferences.theme === 'system' ? getSystemTheme() : preferences.theme

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    if (effectiveTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [effectiveTheme])

  // Listen for system theme changes
  useEffect(() => {
    if (preferences.theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const root = document.documentElement
      if (mediaQuery.matches) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [preferences.theme])

  const setTheme = useCallback(
    (theme: Theme) => {
      setPreferences((prev) => ({ ...prev, theme }))
    },
    [setPreferences]
  )

  const setLastBrowsedPath = useCallback(
    (lastBrowsedPath: string) => {
      setPreferences((prev) => ({ ...prev, lastBrowsedPath }))
    },
    [setPreferences]
  )

  const setShowHiddenFiles = useCallback(
    (showHiddenFiles: boolean) => {
      setPreferences((prev) => ({ ...prev, showHiddenFiles }))
    },
    [setPreferences]
  )

  const setStatsRefreshInterval = useCallback(
    (statsRefreshInterval: StatsRefreshInterval) => {
      setPreferences((prev) => ({ ...prev, statsRefreshInterval }))
    },
    [setPreferences]
  )

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        setTheme,
        setLastBrowsedPath,
        setShowHiddenFiles,
        setStatsRefreshInterval,
        effectiveTheme,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider')
  }
  return context
}
