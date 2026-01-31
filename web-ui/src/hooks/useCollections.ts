import { useCallback, useMemo } from 'react'
import {
  useCollections as useCollectionsContext,
  type Collection,
  type CollectionColor,
} from '../contexts/CollectionsContext'

// ============================================
// Types
// ============================================

interface UseCollectionsForDocumentOptions {
  filePath: string
}

interface UseCollectionsForDocumentResult {
  // Collections containing this document
  documentCollections: Collection[]

  // Actions
  addToCollection: (collectionId: string) => void
  removeFromCollection: (collectionId: string) => void
  createCollectionWithDocument: (
    name: string,
    color: CollectionColor,
    description?: string
  ) => Collection

  // Queries
  isInCollection: (collectionId: string) => boolean

  // All collections for selection
  allCollections: Collection[]
}

// ============================================
// Hook for document-specific collection operations
// ============================================

export function useCollectionsForDocument({
  filePath,
}: UseCollectionsForDocumentOptions): UseCollectionsForDocumentResult {
  const {
    collections: allCollections,
    createCollection,
    addDocumentToCollection,
    removeDocumentFromCollection,
    getCollectionsForDocument,
    isDocumentInCollection,
  } = useCollectionsContext()

  // Get collections containing this document
  const documentCollections = useMemo(
    () => getCollectionsForDocument(filePath),
    [getCollectionsForDocument, filePath]
  )

  // Add document to a collection
  const addToCollection = useCallback(
    (collectionId: string) => {
      addDocumentToCollection(collectionId, filePath)
    },
    [addDocumentToCollection, filePath]
  )

  // Remove document from a collection
  const removeFromCollection = useCallback(
    (collectionId: string) => {
      removeDocumentFromCollection(collectionId, filePath)
    },
    [removeDocumentFromCollection, filePath]
  )

  // Create a new collection and add this document to it
  const createCollectionWithDocument = useCallback(
    (name: string, color: CollectionColor, description?: string): Collection => {
      const collection = createCollection(name, color, description)
      addDocumentToCollection(collection.id, filePath)
      return collection
    },
    [createCollection, addDocumentToCollection, filePath]
  )

  // Check if document is in a collection
  const isInCollection = useCallback(
    (collectionId: string): boolean => {
      return isDocumentInCollection(collectionId, filePath)
    },
    [isDocumentInCollection, filePath]
  )

  return {
    documentCollections,
    addToCollection,
    removeFromCollection,
    createCollectionWithDocument,
    isInCollection,
    allCollections,
  }
}

// ============================================
// Hook for collection management
// ============================================

interface UseCollectionManagementResult {
  collections: Collection[]
  createCollection: (name: string, color: CollectionColor, description?: string) => Collection
  updateCollection: (
    collectionId: string,
    updates: Partial<Pick<Collection, 'name' | 'color' | 'description'>>
  ) => void
  deleteCollection: (collectionId: string) => void
  getCollection: (collectionId: string) => Collection | undefined
  getDocumentsInCollection: (collectionId: string) => string[]
}

export function useCollectionManagement(): UseCollectionManagementResult {
  const {
    collections,
    createCollection,
    updateCollection,
    deleteCollection,
    getCollection,
    getDocumentsInCollection,
  } = useCollectionsContext()

  return {
    collections,
    createCollection,
    updateCollection,
    deleteCollection,
    getCollection,
    getDocumentsInCollection,
  }
}
