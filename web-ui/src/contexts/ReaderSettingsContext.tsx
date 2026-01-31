import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

// ============================================
// Types
// ============================================

export type FontSize = 'sm' | 'base' | 'lg' | 'xl'
export type LineHeight = 'tight' | 'normal' | 'relaxed'
export type FontFamily = 'sans' | 'serif' | 'mono'

export interface ReaderSettings {
  fontSize: FontSize
  lineHeight: LineHeight
  fontFamily: FontFamily
  showChunkNumbers: boolean
  /** Semantic heatmap: show connected terms (off by default) */
  showHeatmap: boolean
}

export interface ReaderSettingsContextValue {
  settings: ReaderSettings
  setFontSize: (size: FontSize) => void
  setLineHeight: (height: LineHeight) => void
  setFontFamily: (family: FontFamily) => void
  setShowChunkNumbers: (show: boolean) => void
  setShowHeatmap: (show: boolean) => void
  resetSettings: () => void
  cssVariables: Record<string, string>
}

// ============================================
// Constants
// ============================================

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 'base',
  lineHeight: 'normal',
  fontFamily: 'sans',
  showChunkNumbers: true,
  showHeatmap: false, // Off by default (cognitive load)
}

const FONT_SIZE_MAP: Record<FontSize, string> = {
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
}

const LINE_HEIGHT_MAP: Record<LineHeight, string> = {
  tight: '1.4',
  normal: '1.6',
  relaxed: '1.8',
}

const FONT_FAMILY_MAP: Record<FontFamily, string> = {
  sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
}

// ============================================
// Context
// ============================================

const ReaderSettingsContext = createContext<ReaderSettingsContextValue | null>(null)

interface ReaderSettingsProviderProps {
  children: ReactNode
  vaultId?: string
}

export function ReaderSettingsProvider({
  children,
  vaultId = 'default',
}: ReaderSettingsProviderProps) {
  const storageKey = `rag-vault-reader-settings-${vaultId}`
  const [settings, setSettings] = useLocalStorage<ReaderSettings>(storageKey, DEFAULT_SETTINGS)

  const setFontSize = useCallback(
    (fontSize: FontSize) => {
      setSettings((prev) => ({ ...prev, fontSize }))
    },
    [setSettings]
  )

  const setLineHeight = useCallback(
    (lineHeight: LineHeight) => {
      setSettings((prev) => ({ ...prev, lineHeight }))
    },
    [setSettings]
  )

  const setFontFamily = useCallback(
    (fontFamily: FontFamily) => {
      setSettings((prev) => ({ ...prev, fontFamily }))
    },
    [setSettings]
  )

  const setShowChunkNumbers = useCallback(
    (showChunkNumbers: boolean) => {
      setSettings((prev) => ({ ...prev, showChunkNumbers }))
    },
    [setSettings]
  )

  const setShowHeatmap = useCallback(
    (showHeatmap: boolean) => {
      setSettings((prev) => ({ ...prev, showHeatmap }))
    },
    [setSettings]
  )

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [setSettings])

  const cssVariables = useMemo(
    () => ({
      '--reader-font-size': FONT_SIZE_MAP[settings.fontSize],
      '--reader-line-height': LINE_HEIGHT_MAP[settings.lineHeight],
      '--reader-font-family': FONT_FAMILY_MAP[settings.fontFamily],
    }),
    [settings.fontSize, settings.lineHeight, settings.fontFamily]
  )

  const value = useMemo<ReaderSettingsContextValue>(
    () => ({
      settings,
      setFontSize,
      setLineHeight,
      setFontFamily,
      setShowChunkNumbers,
      setShowHeatmap,
      resetSettings,
      cssVariables,
    }),
    [
      settings,
      setFontSize,
      setLineHeight,
      setFontFamily,
      setShowChunkNumbers,
      setShowHeatmap,
      resetSettings,
      cssVariables,
    ]
  )

  return <ReaderSettingsContext.Provider value={value}>{children}</ReaderSettingsContext.Provider>
}

export function useReaderSettings(): ReaderSettingsContextValue {
  const context = useContext(ReaderSettingsContext)
  if (!context) {
    throw new Error('useReaderSettings must be used within a ReaderSettingsProvider')
  }
  return context
}
