import { useCallback, useMemo } from 'react'
import { useLinks, type Bookmark, type ChunkKey } from '../contexts/LinksContext'

// ============================================
// Types
// ============================================

interface UseBookmarksOptions {
  filePath?: string
}

interface UseBookmarksResult {
  // All bookmarks (optionally filtered by document)
  bookmarks: Bookmark[]

  // Actions
  toggleBookmark: (chunkKey: ChunkKey) => boolean
  addBookmark: (chunkKey: ChunkKey, note?: string) => Bookmark
  removeBookmark: (bookmarkId: string) => void
  updateNote: (bookmarkId: string, note: string) => void

  // Queries
  isBookmarked: (chunkKey: ChunkKey) => boolean
  isChunkBookmarked: (chunkIndex: number) => boolean
  getBookmarkForChunk: (chunkKey: ChunkKey) => Bookmark | undefined
}

// ============================================
// Hook
// ============================================

/**
 * Hook for managing bookmarks in a document
 * If filePath is provided, filters bookmarks to that document
 */
export function useBookmarks({ filePath }: UseBookmarksOptions = {}): UseBookmarksResult {
  const {
    bookmarks: allBookmarks,
    createBookmark,
    deleteBookmark,
    updateBookmarkNote,
    getBookmarksForDocument,
    isBookmarked: checkIsBookmarked,
    toggleBookmark: contextToggleBookmark,
  } = useLinks()

  // Filter bookmarks for current document if filePath provided
  const bookmarks = useMemo(() => {
    if (!filePath) return allBookmarks
    return getBookmarksForDocument(filePath)
  }, [allBookmarks, filePath, getBookmarksForDocument])

  // Toggle bookmark on a chunk
  const toggleBookmark = useCallback(
    (chunkKey: ChunkKey): boolean => {
      return contextToggleBookmark(chunkKey)
    },
    [contextToggleBookmark]
  )

  // Add a new bookmark
  const addBookmark = useCallback(
    (chunkKey: ChunkKey, note?: string): Bookmark => {
      return createBookmark(chunkKey, note)
    },
    [createBookmark]
  )

  // Remove a bookmark
  const removeBookmark = useCallback(
    (bookmarkId: string) => {
      deleteBookmark(bookmarkId)
    },
    [deleteBookmark]
  )

  // Update bookmark note
  const updateNote = useCallback(
    (bookmarkId: string, note: string) => {
      updateBookmarkNote(bookmarkId, note)
    },
    [updateBookmarkNote]
  )

  // Check if a chunk is bookmarked
  const isBookmarked = useCallback(
    (chunkKey: ChunkKey): boolean => {
      return checkIsBookmarked(chunkKey)
    },
    [checkIsBookmarked]
  )

  // Check if a chunk index is bookmarked (for current document)
  const isChunkBookmarked = useCallback(
    (chunkIndex: number): boolean => {
      if (!filePath) return false
      return checkIsBookmarked({ filePath, chunkIndex })
    },
    [filePath, checkIsBookmarked]
  )

  // Get bookmark for a specific chunk
  const getBookmarkForChunk = useCallback(
    (chunkKey: ChunkKey): Bookmark | undefined => {
      return allBookmarks.find(
        (b) =>
          b.chunkKey.filePath === chunkKey.filePath && b.chunkKey.chunkIndex === chunkKey.chunkIndex
      )
    },
    [allBookmarks]
  )

  return {
    bookmarks,
    toggleBookmark,
    addBookmark,
    removeBookmark,
    updateNote,
    isBookmarked,
    isChunkBookmarked,
    getBookmarkForChunk,
  }
}
