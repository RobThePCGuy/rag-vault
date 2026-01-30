import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'

/**
 * Reference to a chunk with fingerprint for resilient linking
 */
export interface ChunkRef {
  filePath: string
  chunkIndex: number
  fingerprint?: string
}

/**
 * Item types in the synthesis outline
 */
export type OutlineItemType = 'heading' | 'chunk-ref' | 'note'

/**
 * Single item in the synthesis outline
 */
export interface OutlineItem {
  id: string
  type: OutlineItemType
  content: string
  /** Source reference for chunk-ref items */
  sourceRef?: ChunkRef
  /** Preview text from source (for display) */
  sourcePreview?: string
  /** Indent level for nesting (0 = top level) */
  indentLevel: number
}

/**
 * Complete synthesis draft
 */
export interface SynthesisDraft {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  items: OutlineItem[]
}

/**
 * Store for synthesis drafts
 */
interface SynthesisStore {
  version: 1
  drafts: SynthesisDraft[]
  currentDraftId: string | null
}

const DEFAULT_STORE: SynthesisStore = {
  version: 1,
  drafts: [],
  currentDraftId: null,
}

function generateId(): string {
  return crypto.randomUUID()
}

export interface UseSynthesisResult {
  /** Current draft being edited */
  currentDraft: SynthesisDraft | null
  /** All saved drafts */
  drafts: SynthesisDraft[]
  /** Create a new draft */
  createDraft: (title?: string) => SynthesisDraft
  /** Load an existing draft */
  loadDraft: (draftId: string) => void
  /** Delete a draft */
  deleteDraft: (draftId: string) => void
  /** Update current draft title */
  setTitle: (title: string) => void
  /** Add an item to the current draft */
  addItem: (item: Omit<OutlineItem, 'id'>) => void
  /** Remove an item from the current draft */
  removeItem: (itemId: string) => void
  /** Update an item's content */
  updateItem: (itemId: string, updates: Partial<Omit<OutlineItem, 'id'>>) => void
  /** Move an item up */
  moveItemUp: (itemId: string) => void
  /** Move an item down */
  moveItemDown: (itemId: string) => void
  /** Increase item indent */
  indentItem: (itemId: string) => void
  /** Decrease item indent */
  outdentItem: (itemId: string) => void
  /** Send a chunk to the draft */
  sendToDraft: (ref: ChunkRef, text: string, type?: OutlineItemType) => void
  /** Export current draft to markdown */
  exportToMarkdown: () => string
  /** Export current draft to JSON */
  exportToJSON: () => string
  /** Close current draft */
  closeDraft: () => void
}

/**
 * Hook for synthesis drafting board functionality
 */
export function useSynthesis(vaultId = 'default'): UseSynthesisResult {
  const storageKey = `rag-vault-synthesis-v1-${vaultId}`
  const [store, setStore] = useLocalStorage<SynthesisStore>(storageKey, DEFAULT_STORE)

  const currentDraft = useMemo(() => {
    if (!store.currentDraftId) return null
    return store.drafts.find((d) => d.id === store.currentDraftId) || null
  }, [store.currentDraftId, store.drafts])

  const createDraft = useCallback(
    (title = 'Untitled Draft'): SynthesisDraft => {
      const draft: SynthesisDraft = {
        id: generateId(),
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: [],
      }

      setStore((prev) => ({
        ...prev,
        drafts: [...prev.drafts, draft],
        currentDraftId: draft.id,
      }))

      return draft
    },
    [setStore]
  )

  const loadDraft = useCallback(
    (draftId: string) => {
      setStore((prev) => ({
        ...prev,
        currentDraftId: draftId,
      }))
    },
    [setStore]
  )

  const deleteDraft = useCallback(
    (draftId: string) => {
      setStore((prev) => ({
        ...prev,
        drafts: prev.drafts.filter((d) => d.id !== draftId),
        currentDraftId: prev.currentDraftId === draftId ? null : prev.currentDraftId,
      }))
    },
    [setStore]
  )

  const closeDraft = useCallback(() => {
    setStore((prev) => ({
      ...prev,
      currentDraftId: null,
    }))
  }, [setStore])

  const setTitle = useCallback(
    (title: string) => {
      setStore((prev) => ({
        ...prev,
        drafts: prev.drafts.map((d) =>
          d.id === prev.currentDraftId
            ? { ...d, title, updatedAt: new Date().toISOString() }
            : d
        ),
      }))
    },
    [setStore]
  )

  const addItem = useCallback(
    (item: Omit<OutlineItem, 'id'>) => {
      const newItem: OutlineItem = {
        ...item,
        id: generateId(),
      }

      setStore((prev) => ({
        ...prev,
        drafts: prev.drafts.map((d) =>
          d.id === prev.currentDraftId
            ? { ...d, items: [...d.items, newItem], updatedAt: new Date().toISOString() }
            : d
        ),
      }))
    },
    [setStore]
  )

  const removeItem = useCallback(
    (itemId: string) => {
      setStore((prev) => ({
        ...prev,
        drafts: prev.drafts.map((d) =>
          d.id === prev.currentDraftId
            ? {
                ...d,
                items: d.items.filter((i) => i.id !== itemId),
                updatedAt: new Date().toISOString(),
              }
            : d
        ),
      }))
    },
    [setStore]
  )

  const updateItem = useCallback(
    (itemId: string, updates: Partial<Omit<OutlineItem, 'id'>>) => {
      setStore((prev) => ({
        ...prev,
        drafts: prev.drafts.map((d) =>
          d.id === prev.currentDraftId
            ? {
                ...d,
                items: d.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
                updatedAt: new Date().toISOString(),
              }
            : d
        ),
      }))
    },
    [setStore]
  )

  const moveItemUp = useCallback(
    (itemId: string) => {
      setStore((prev) => {
        const draft = prev.drafts.find((d) => d.id === prev.currentDraftId)
        if (!draft) return prev

        const index = draft.items.findIndex((i) => i.id === itemId)
        if (index <= 0) return prev

        const newItems = [...draft.items]
        const item = newItems[index]
        const prevItem = newItems[index - 1]
        if (item && prevItem) {
          newItems[index] = prevItem
          newItems[index - 1] = item
        }

        return {
          ...prev,
          drafts: prev.drafts.map((d) =>
            d.id === prev.currentDraftId
              ? { ...d, items: newItems, updatedAt: new Date().toISOString() }
              : d
          ),
        }
      })
    },
    [setStore]
  )

  const moveItemDown = useCallback(
    (itemId: string) => {
      setStore((prev) => {
        const draft = prev.drafts.find((d) => d.id === prev.currentDraftId)
        if (!draft) return prev

        const index = draft.items.findIndex((i) => i.id === itemId)
        if (index < 0 || index >= draft.items.length - 1) return prev

        const newItems = [...draft.items]
        const item = newItems[index]
        const nextItem = newItems[index + 1]
        if (item && nextItem) {
          newItems[index] = nextItem
          newItems[index + 1] = item
        }

        return {
          ...prev,
          drafts: prev.drafts.map((d) =>
            d.id === prev.currentDraftId
              ? { ...d, items: newItems, updatedAt: new Date().toISOString() }
              : d
          ),
        }
      })
    },
    [setStore]
  )

  const indentItem = useCallback(
    (itemId: string) => {
      // Move calculation into setStore callback for atomic operation
      setStore((prev) => {
        const draft = prev.drafts.find((d) => d.id === prev.currentDraftId)
        if (!draft) return prev

        const item = draft.items.find((i) => i.id === itemId)
        if (!item) return prev

        const newIndentLevel = Math.min(item.indentLevel + 1, 3)
        if (newIndentLevel === item.indentLevel) return prev

        return {
          ...prev,
          drafts: prev.drafts.map((d) =>
            d.id === prev.currentDraftId
              ? {
                  ...d,
                  items: d.items.map((i) =>
                    i.id === itemId ? { ...i, indentLevel: newIndentLevel } : i
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : d
          ),
        }
      })
    },
    [setStore]
  )

  const outdentItem = useCallback(
    (itemId: string) => {
      // Move calculation into setStore callback for atomic operation
      setStore((prev) => {
        const draft = prev.drafts.find((d) => d.id === prev.currentDraftId)
        if (!draft) return prev

        const item = draft.items.find((i) => i.id === itemId)
        if (!item) return prev

        const newIndentLevel = Math.max(item.indentLevel - 1, 0)
        if (newIndentLevel === item.indentLevel) return prev

        return {
          ...prev,
          drafts: prev.drafts.map((d) =>
            d.id === prev.currentDraftId
              ? {
                  ...d,
                  items: d.items.map((i) =>
                    i.id === itemId ? { ...i, indentLevel: newIndentLevel } : i
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : d
          ),
        }
      })
    },
    [setStore]
  )

  const sendToDraft = useCallback(
    (ref: ChunkRef, text: string, type: OutlineItemType = 'chunk-ref') => {
      // Ensure we have a draft - use returned draft ID to avoid stale closure
      let targetDraftId = currentDraft?.id
      if (!targetDraftId) {
        const newDraft = createDraft()
        targetDraftId = newDraft.id
      }

      // Use setStore directly with the known draft ID to avoid stale state
      const newItem: OutlineItem = {
        id: generateId(),
        type,
        content: type === 'chunk-ref' ? '' : text,
        sourceRef: type === 'chunk-ref' ? ref : undefined,
        sourcePreview: type === 'chunk-ref' ? text.slice(0, 200) : undefined,
        indentLevel: 0,
      }

      setStore((prev) => ({
        ...prev,
        drafts: prev.drafts.map((d) =>
          d.id === targetDraftId
            ? { ...d, items: [...d.items, newItem], updatedAt: new Date().toISOString() }
            : d
        ),
      }))
    },
    [currentDraft, createDraft, setStore]
  )

  const exportToMarkdown = useCallback((): string => {
    if (!currentDraft) return ''

    let md = `# ${currentDraft.title}\n\n`

    for (const item of currentDraft.items) {
      const indent = '  '.repeat(item.indentLevel)

      switch (item.type) {
        case 'heading':
          md += `${indent}## ${item.content}\n\n`
          break
        case 'chunk-ref':
          if (item.sourceRef) {
            const citation = `/read?path=${encodeURIComponent(item.sourceRef.filePath)}&chunk=${item.sourceRef.chunkIndex}`
            md += `${indent}> ${item.sourcePreview?.slice(0, 100)}...\n`
            md += `${indent}> \n`
            md += `${indent}> [Source](${citation})\n\n`
          }
          break
        case 'note':
          md += `${indent}${item.content}\n\n`
          break
      }
    }

    return md
  }, [currentDraft])

  const exportToJSON = useCallback((): string => {
    if (!currentDraft) return '{}'
    return JSON.stringify(currentDraft, null, 2)
  }, [currentDraft])

  return {
    currentDraft,
    drafts: store.drafts,
    createDraft,
    loadDraft,
    deleteDraft,
    setTitle,
    addItem,
    removeItem,
    updateItem,
    moveItemUp,
    moveItemDown,
    indentItem,
    outdentItem,
    sendToDraft,
    exportToMarkdown,
    exportToJSON,
    closeDraft,
  }
}
