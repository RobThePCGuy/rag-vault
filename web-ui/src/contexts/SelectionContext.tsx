import { createContext, type ReactNode, useCallback, useContext, useState } from 'react'

export type SelectionSource = 'search' | 'reader' | 'files' | 'graph' | 'backlink' | 'command-palette'

export interface AppSelection {
  docId: string | null
  chunkIndex: number | null
  chunkRef: string | null
  source: SelectionSource | null
}

interface SelectionInput {
  docId: string
  chunkIndex?: number | null
  chunkRef?: string | null
  source: SelectionSource
}

interface SelectionContextValue {
  selection: AppSelection
  select: (input: SelectionInput) => void
  clearSelection: () => void
}

const emptySelection: AppSelection = {
  docId: null,
  chunkIndex: null,
  chunkRef: null,
  source: null,
}

const SelectionContext = createContext<SelectionContextValue | null>(null)

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<AppSelection>(emptySelection)

  const select = useCallback((input: SelectionInput) => {
    setSelection({
      docId: input.docId,
      chunkIndex: input.chunkIndex ?? null,
      chunkRef: input.chunkRef ?? null,
      source: input.source,
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelection(emptySelection)
  }, [])

  return (
    <SelectionContext.Provider value={{ selection, select, clearSelection }}>
      {children}
    </SelectionContext.Provider>
  )
}

export function useSelection() {
  const context = useContext(SelectionContext)
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider')
  }
  return context
}
