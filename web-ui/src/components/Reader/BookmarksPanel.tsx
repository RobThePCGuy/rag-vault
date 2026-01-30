import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { Bookmark } from '../../contexts/LinksContext'

interface BookmarksPanelProps {
  isOpen: boolean
  onClose: () => void
  bookmarks: Bookmark[]
  onNavigateToBookmark: (filePath: string, chunkIndex: number) => void
  onUpdateNote: (bookmarkId: string, note: string) => void
  onDeleteBookmark: (bookmarkId: string) => void
}

/**
 * Slide-out panel showing all bookmarks for the current document
 */
export function BookmarksPanel({
  isOpen,
  onClose,
  bookmarks,
  onNavigateToBookmark,
  onUpdateNote,
  onDeleteBookmark,
}: BookmarksPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-80 max-w-full bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <BookmarkIcon className="w-5 h-5 text-blue-500" />
                Bookmarks
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({bookmarks.length})
                </span>
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {bookmarks.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <BookmarkOutlineIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No bookmarks yet</p>
                  <p className="text-xs mt-1">Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">b</kbd> on a chunk to bookmark it</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {bookmarks.map((bookmark) => (
                      <BookmarkItem
                        key={bookmark.id}
                        bookmark={bookmark}
                        onNavigate={() =>
                          onNavigateToBookmark(
                            bookmark.chunkKey.filePath,
                            bookmark.chunkKey.chunkIndex
                          )
                        }
                        onUpdateNote={(note) => onUpdateNote(bookmark.id, note)}
                        onDelete={() => onDeleteBookmark(bookmark.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

interface BookmarkItemProps {
  bookmark: Bookmark
  onNavigate: () => void
  onUpdateNote: (note: string) => void
  onDelete: () => void
}

function BookmarkItem({ bookmark, onNavigate, onUpdateNote, onDelete }: BookmarkItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [noteValue, setNoteValue] = useState(bookmark.note || '')
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  // Track previous bookmark id to reset state when bookmark changes
  const prevBookmarkIdRef = useRef(bookmark.id)
  useEffect(() => {
    if (prevBookmarkIdRef.current !== bookmark.id) {
      // Bookmark changed - reset editing state
      setIsEditing(false)
      setNoteValue(bookmark.note || '')
      setShowConfirmDelete(false)
      prevBookmarkIdRef.current = bookmark.id
    }
  }, [bookmark.id, bookmark.note])

  const handleSaveNote = () => {
    onUpdateNote(noteValue)
    setIsEditing(false)
  }

  const displayPath = formatPath(bookmark.chunkKey.filePath)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-gray-50 dark:bg-gray-750 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <button
          type="button"
          onClick={onNavigate}
          className="text-left flex-1 min-w-0"
        >
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate hover:text-blue-600 dark:hover:text-blue-400">
            {displayPath}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Chunk #{bookmark.chunkKey.chunkIndex}
          </div>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
            title="Edit note"
          >
            <EditIcon className="w-4 h-4" />
          </button>
          {showConfirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onDelete}
                className="px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
              title="Delete bookmark"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Note */}
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            placeholder="Add a note..."
            className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSaveNote()
              }
              if (e.key === 'Escape') {
                setIsEditing(false)
                setNoteValue(bookmark.note || '')
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setNoteValue(bookmark.note || '')
              }}
              className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveNote}
              className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      ) : bookmark.note ? (
        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
          {bookmark.note}
        </p>
      ) : null}

      {/* Timestamp */}
      <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
        {new Date(bookmark.createdAt).toLocaleDateString()}
      </div>
    </motion.div>
  )
}

function formatPath(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

// Icons
function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
    </svg>
  )
}

function BookmarkOutlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}
