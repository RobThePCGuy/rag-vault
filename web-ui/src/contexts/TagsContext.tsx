import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

// ============================================
// Types
// ============================================

export type TagColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'gray'

export interface Tag {
  id: string
  name: string
  color: TagColor
  usageCount: number
  lastUsedAt: string
  createdAt: string
}

export interface TaggedItem {
  id: string
  tagId: string
  targetType: 'chunk' | 'highlight' | 'document'
  targetKey: string // For chunk: "filePath::chunkIndex", for highlight: highlightId, for document: filePath
  createdAt: string
}

export interface TagsStore {
  version: 1
  vaultId: string
  updatedAt: string
  tags: Tag[]
  taggedItems: TaggedItem[]
}

export interface TagsContextValue {
  // Tags
  tags: Tag[]
  createTag: (name: string, color: TagColor) => Tag
  updateTag: (tagId: string, updates: Partial<Pick<Tag, 'name' | 'color'>>) => void
  deleteTag: (tagId: string) => void
  getTag: (tagId: string) => Tag | undefined

  // Tagged Items
  taggedItems: TaggedItem[]
  addTag: (tagId: string, targetType: TaggedItem['targetType'], targetKey: string) => TaggedItem
  removeTag: (taggedItemId: string) => void
  removeTagFromTarget: (tagId: string, targetType: TaggedItem['targetType'], targetKey: string) => void
  getTagsForTarget: (targetType: TaggedItem['targetType'], targetKey: string) => Tag[]
  getTargetsForTag: (tagId: string) => TaggedItem[]
  isTagged: (tagId: string, targetType: TaggedItem['targetType'], targetKey: string) => boolean

  // Suggestions (ordered by usefulness)
  getTagSuggestions: (limit?: number) => Tag[]

  // Export/Import
  exportTags: () => string
  importTags: (json: string) => { imported: number; errors: string[] }
}

// ============================================
// Utilities
// ============================================

function generateId(): string {
  return crypto.randomUUID()
}

const DEFAULT_STORE: TagsStore = {
  version: 1,
  vaultId: '',
  updatedAt: new Date().toISOString(),
  tags: [],
  taggedItems: [],
}

export const TAG_COLORS: TagColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray']

export const TAG_COLOR_CLASSES: Record<TagColor, { bg: string; text: string; border: string }> = {
  red: {
    bg: 'bg-red-100 dark:bg-red-900/40',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/40',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/40',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/40',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
  },
  pink: {
    bg: 'bg-pink-100 dark:bg-pink-900/40',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-800',
  },
  gray: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-600',
  },
}

// ============================================
// Context
// ============================================

const TagsContext = createContext<TagsContextValue | null>(null)

interface TagsProviderProps {
  children: ReactNode
  vaultId?: string
}

export function TagsProvider({ children, vaultId = 'default' }: TagsProviderProps) {
  const storageKey = `rag-vault-tags-v1-${vaultId}`
  const [store, setStore] = useLocalStorage<TagsStore>(storageKey, {
    ...DEFAULT_STORE,
    vaultId,
  })

  // ============================================
  // Tag Operations
  // ============================================

  const createTag = useCallback(
    (name: string, color: TagColor): Tag => {
      const tag: Tag = {
        id: generateId(),
        name: name.trim(),
        color,
        usageCount: 0,
        lastUsedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }

      setStore((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        tags: [...prev.tags, tag],
      }))

      return tag
    },
    [setStore]
  )

  const updateTag = useCallback(
    (tagId: string, updates: Partial<Pick<Tag, 'name' | 'color'>>) => {
      setStore((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        tags: prev.tags.map((t) => {
          if (t.id !== tagId) return t
          // Normalize name - trim like createTag does
          const normalizedUpdates: Partial<Pick<Tag, 'name' | 'color'>> = { ...updates }
          if (normalizedUpdates.name !== undefined) {
            normalizedUpdates.name = normalizedUpdates.name.trim()
          }
          return { ...t, ...normalizedUpdates }
        }),
      }))
    },
    [setStore]
  )

  const deleteTag = useCallback(
    (tagId: string) => {
      setStore((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        tags: prev.tags.filter((t) => t.id !== tagId),
        taggedItems: prev.taggedItems.filter((ti) => ti.tagId !== tagId),
      }))
    },
    [setStore]
  )

  const getTag = useCallback(
    (tagId: string): Tag | undefined => {
      return store.tags.find((t) => t.id === tagId)
    },
    [store.tags]
  )

  // ============================================
  // Tagged Item Operations
  // ============================================

  const addTag = useCallback(
    (tagId: string, targetType: TaggedItem['targetType'], targetKey: string): TaggedItem => {
      const taggedItem: TaggedItem = {
        id: generateId(),
        tagId,
        targetType,
        targetKey,
        createdAt: new Date().toISOString(),
      }

      setStore((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        taggedItems: [...prev.taggedItems, taggedItem],
        // Update tag usage stats
        tags: prev.tags.map((t) =>
          t.id === tagId
            ? { ...t, usageCount: t.usageCount + 1, lastUsedAt: new Date().toISOString() }
            : t
        ),
      }))

      return taggedItem
    },
    [setStore]
  )

  const removeTag = useCallback(
    (taggedItemId: string) => {
      setStore((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        taggedItems: prev.taggedItems.filter((ti) => ti.id !== taggedItemId),
      }))
    },
    [setStore]
  )

  const removeTagFromTarget = useCallback(
    (tagId: string, targetType: TaggedItem['targetType'], targetKey: string) => {
      setStore((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        taggedItems: prev.taggedItems.filter(
          (ti) => !(ti.tagId === tagId && ti.targetType === targetType && ti.targetKey === targetKey)
        ),
      }))
    },
    [setStore]
  )

  const getTagsForTarget = useCallback(
    (targetType: TaggedItem['targetType'], targetKey: string): Tag[] => {
      const tagIds = store.taggedItems
        .filter((ti) => ti.targetType === targetType && ti.targetKey === targetKey)
        .map((ti) => ti.tagId)

      return store.tags.filter((t) => tagIds.includes(t.id))
    },
    [store.tags, store.taggedItems]
  )

  const getTargetsForTag = useCallback(
    (tagId: string): TaggedItem[] => {
      return store.taggedItems.filter((ti) => ti.tagId === tagId)
    },
    [store.taggedItems]
  )

  const isTagged = useCallback(
    (tagId: string, targetType: TaggedItem['targetType'], targetKey: string): boolean => {
      return store.taggedItems.some(
        (ti) => ti.tagId === tagId && ti.targetType === targetType && ti.targetKey === targetKey
      )
    },
    [store.taggedItems]
  )

  // ============================================
  // Suggestions
  // ============================================

  const getTagSuggestions = useCallback(
    (limit = 10): Tag[] => {
      // Sort by: most-used first, then by most recently used
      return [...store.tags]
        .sort((a, b) => {
          // Primary: usage count (descending)
          if (b.usageCount !== a.usageCount) {
            return b.usageCount - a.usageCount
          }
          // Secondary: last used (descending)
          return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
        })
        .slice(0, limit)
    },
    [store.tags]
  )

  // ============================================
  // Export/Import
  // ============================================

  const exportTags = useCallback((): string => {
    return JSON.stringify(store, null, 2)
  }, [store])

  const importTags = useCallback(
    (json: string): { imported: number; errors: string[] } => {
      const errors: string[] = []
      let imported = 0

      try {
        const data = JSON.parse(json) as TagsStore

        if (data.version !== 1) {
          errors.push(`Unsupported version: ${data.version}`)
          return { imported, errors }
        }

        // Import tags
        if (Array.isArray(data.tags)) {
          for (const tag of data.tags) {
            if (tag.id && tag.name && !store.tags.some((t) => t.id === tag.id)) {
              setStore((prev) => ({
                ...prev,
                updatedAt: new Date().toISOString(),
                tags: [...prev.tags, tag],
              }))
              imported++
            }
          }
        }

        // Import tagged items
        if (Array.isArray(data.taggedItems)) {
          for (const ti of data.taggedItems) {
            if (
              ti.id &&
              ti.tagId &&
              ti.targetKey &&
              !store.taggedItems.some((existing) => existing.id === ti.id)
            ) {
              setStore((prev) => ({
                ...prev,
                updatedAt: new Date().toISOString(),
                taggedItems: [...prev.taggedItems, ti],
              }))
              imported++
            }
          }
        }
      } catch (e) {
        errors.push(`Invalid JSON: ${(e as Error).message}`)
      }

      return { imported, errors }
    },
    [store, setStore]
  )

  // ============================================
  // Context Value
  // ============================================

  const value = useMemo<TagsContextValue>(
    () => ({
      tags: store.tags,
      createTag,
      updateTag,
      deleteTag,
      getTag,
      taggedItems: store.taggedItems,
      addTag,
      removeTag,
      removeTagFromTarget,
      getTagsForTarget,
      getTargetsForTag,
      isTagged,
      getTagSuggestions,
      exportTags,
      importTags,
    }),
    [
      store.tags,
      store.taggedItems,
      createTag,
      updateTag,
      deleteTag,
      getTag,
      addTag,
      removeTag,
      removeTagFromTarget,
      getTagsForTarget,
      getTargetsForTag,
      isTagged,
      getTagSuggestions,
      exportTags,
      importTags,
    ]
  )

  return <TagsContext.Provider value={value}>{children}</TagsContext.Provider>
}

export function useTags(): TagsContextValue {
  const context = useContext(TagsContext)
  if (!context) {
    throw new Error('useTags must be used within a TagsProvider')
  }
  return context
}
