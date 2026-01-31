import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

// ============================================
// Types
// ============================================

export type CollectionColor =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'gray'

export interface Collection {
  id: string
  name: string
  description?: string
  color: CollectionColor
  documents: string[] // filePaths
  createdAt: string
  updatedAt: string
}

export interface CollectionsStore {
  version: 1
  vaultId: string
  updatedAt: string
  collections: Collection[]
}

export interface CollectionsContextValue {
  // Collections
  collections: Collection[]
  createCollection: (name: string, color: CollectionColor, description?: string) => Collection
  updateCollection: (
    collectionId: string,
    updates: Partial<Pick<Collection, 'name' | 'color' | 'description'>>
  ) => void
  deleteCollection: (collectionId: string) => void
  getCollection: (collectionId: string) => Collection | undefined

  // Document membership
  addDocumentToCollection: (collectionId: string, filePath: string) => void
  removeDocumentFromCollection: (collectionId: string, filePath: string) => void
  getCollectionsForDocument: (filePath: string) => Collection[]
  getDocumentsInCollection: (collectionId: string) => string[]
  isDocumentInCollection: (collectionId: string, filePath: string) => boolean

  // Export/Import
  exportCollections: () => string
  importCollections: (json: string) => { imported: number; errors: string[] }
}

// ============================================
// Utilities
// ============================================

function generateId(): string {
  return crypto.randomUUID()
}

const DEFAULT_STORE: CollectionsStore = {
  version: 1,
  vaultId: '',
  updatedAt: new Date().toISOString(),
  collections: [],
}

export const COLLECTION_COLORS: CollectionColor[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'gray',
]

export const COLLECTION_COLOR_CLASSES: Record<
  CollectionColor,
  { bg: string; text: string; border: string }
> = {
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

const CollectionsContext = createContext<CollectionsContextValue | null>(null)

interface CollectionsProviderProps {
  children: ReactNode
  vaultId?: string
}

export function CollectionsProvider({ children, vaultId = 'default' }: CollectionsProviderProps) {
  const storageKey = `rag-vault-collections-v1-${vaultId}`
  const [store, setStore] = useLocalStorage<CollectionsStore>(storageKey, {
    ...DEFAULT_STORE,
    vaultId,
  })

  // ============================================
  // Collection Operations
  // ============================================

  const createCollection = useCallback(
    (name: string, color: CollectionColor, description?: string): Collection => {
      const collection: Collection = {
        id: generateId(),
        name: name.trim(),
        description: description?.trim(),
        color,
        documents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setStore((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        collections: [...prev.collections, collection],
      }))

      return collection
    },
    [setStore]
  )

  const updateCollection = useCallback(
    (
      collectionId: string,
      updates: Partial<Pick<Collection, 'name' | 'color' | 'description'>>
    ) => {
      setStore((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        collections: prev.collections.map((c) =>
          c.id === collectionId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
        ),
      }))
    },
    [setStore]
  )

  const deleteCollection = useCallback(
    (collectionId: string) => {
      setStore((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        collections: prev.collections.filter((c) => c.id !== collectionId),
      }))
    },
    [setStore]
  )

  const getCollection = useCallback(
    (collectionId: string): Collection | undefined => {
      return store.collections.find((c) => c.id === collectionId)
    },
    [store.collections]
  )

  // ============================================
  // Document Membership
  // ============================================

  const addDocumentToCollection = useCallback(
    (collectionId: string, filePath: string) => {
      setStore((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        collections: prev.collections.map((c) => {
          if (c.id !== collectionId) return c
          if (c.documents.includes(filePath)) return c
          return {
            ...c,
            documents: [...c.documents, filePath],
            updatedAt: new Date().toISOString(),
          }
        }),
      }))
    },
    [setStore]
  )

  const removeDocumentFromCollection = useCallback(
    (collectionId: string, filePath: string) => {
      setStore((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        collections: prev.collections.map((c) => {
          if (c.id !== collectionId) return c
          return {
            ...c,
            documents: c.documents.filter((d) => d !== filePath),
            updatedAt: new Date().toISOString(),
          }
        }),
      }))
    },
    [setStore]
  )

  const getCollectionsForDocument = useCallback(
    (filePath: string): Collection[] => {
      return store.collections.filter((c) => c.documents.includes(filePath))
    },
    [store.collections]
  )

  const getDocumentsInCollection = useCallback(
    (collectionId: string): string[] => {
      const collection = store.collections.find((c) => c.id === collectionId)
      return collection?.documents ?? []
    },
    [store.collections]
  )

  const isDocumentInCollection = useCallback(
    (collectionId: string, filePath: string): boolean => {
      const collection = store.collections.find((c) => c.id === collectionId)
      return collection?.documents.includes(filePath) ?? false
    },
    [store.collections]
  )

  // ============================================
  // Export/Import
  // ============================================

  const exportCollections = useCallback((): string => {
    return JSON.stringify(store, null, 2)
  }, [store])

  const importCollections = useCallback(
    (json: string): { imported: number; errors: string[] } => {
      const errors: string[] = []
      let imported = 0

      try {
        const data = JSON.parse(json) as CollectionsStore

        if (data.version !== 1) {
          errors.push(`Unsupported version: ${data.version}`)
          return { imported, errors }
        }

        // Import collections
        if (Array.isArray(data.collections)) {
          for (const collection of data.collections) {
            if (
              collection.id &&
              collection.name &&
              !store.collections.some((c) => c.id === collection.id)
            ) {
              setStore((prev) => ({
                ...prev,
                updatedAt: new Date().toISOString(),
                collections: [...prev.collections, collection],
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

  const value = useMemo<CollectionsContextValue>(
    () => ({
      collections: store.collections,
      createCollection,
      updateCollection,
      deleteCollection,
      getCollection,
      addDocumentToCollection,
      removeDocumentFromCollection,
      getCollectionsForDocument,
      getDocumentsInCollection,
      isDocumentInCollection,
      exportCollections,
      importCollections,
    }),
    [
      store.collections,
      createCollection,
      updateCollection,
      deleteCollection,
      getCollection,
      addDocumentToCollection,
      removeDocumentFromCollection,
      getCollectionsForDocument,
      getDocumentsInCollection,
      isDocumentInCollection,
      exportCollections,
      importCollections,
    ]
  )

  return <CollectionsContext.Provider value={value}>{children}</CollectionsContext.Provider>
}

export function useCollections(): CollectionsContextValue {
  const context = useContext(CollectionsContext)
  if (!context) {
    throw new Error('useCollections must be used within a CollectionsProvider')
  }
  return context
}
