import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import type { HighlightColor } from '../../contexts/AnnotationsContext'
import { useDocumentAnnotations, type AnnotationSummaryItem } from '../../hooks/useDocumentAnnotations'

// ============================================
// Types
// ============================================

interface AnnotationSummaryPanelProps {
  isOpen: boolean
  onClose: () => void
  filePath: string
  onNavigateToHighlight: (chunkIndex: number, highlightId: string) => void
  onDeleteHighlight: (highlightId: string) => void
  onChangeHighlightColor: (highlightId: string, color: HighlightColor) => void
  onUpdateNote: (highlightId: string, note: string) => void
}

type SortBy = 'chunk' | 'date' | 'color'

// ============================================
// Color definitions
// ============================================

const HIGHLIGHT_COLORS: { value: HighlightColor; label: string; className: string }[] = [
  { value: 'yellow', label: 'Yellow', className: 'bg-yellow-200 dark:bg-yellow-500/40' },
  { value: 'green', label: 'Green', className: 'bg-green-200 dark:bg-green-500/40' },
  { value: 'blue', label: 'Blue', className: 'bg-blue-200 dark:bg-blue-500/40' },
  { value: 'pink', label: 'Pink', className: 'bg-pink-200 dark:bg-pink-500/40' },
  { value: 'purple', label: 'Purple', className: 'bg-purple-200 dark:bg-purple-500/40' },
]

const COLOR_BG_MAP: Record<HighlightColor, string> = {
  yellow: 'bg-yellow-200 dark:bg-yellow-500/40',
  green: 'bg-green-200 dark:bg-green-500/40',
  blue: 'bg-blue-200 dark:bg-blue-500/40',
  pink: 'bg-pink-200 dark:bg-pink-500/40',
  purple: 'bg-purple-200 dark:bg-purple-500/40',
}

// ============================================
// Component
// ============================================

/**
 * Slide-out panel showing all highlights and notes for the current document
 */
export function AnnotationSummaryPanel({
  isOpen,
  onClose,
  filePath,
  onNavigateToHighlight,
  onDeleteHighlight,
  onChangeHighlightColor,
  onUpdateNote,
}: AnnotationSummaryPanelProps) {
  const [sortBy, setSortBy] = useState<SortBy>('chunk')
  const [filterColor, setFilterColor] = useState<HighlightColor | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { items, groupedByChunk, totalCount, filteredCount, availableColors } =
    useDocumentAnnotations({
      filePath,
      sortBy,
      filterColor,
    })

  // Apply search filter
  const searchedItems = searchQuery
    ? items.filter((item) => {
        const query = searchQuery.toLowerCase()
        return (
          item.highlight.text.toLowerCase().includes(query) ||
          item.annotation?.note.toLowerCase().includes(query)
        )
      })
    : items

  const displayItems = sortBy === 'chunk' ? groupedByChunk : null

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
            className="fixed right-0 top-0 h-full w-96 max-w-full bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <HighlightIcon className="w-5 h-5 text-yellow-500" />
                Annotations
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({filteredCount}/{totalCount})
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

            {/* Controls */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 space-y-3">
              {/* Search */}
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filter and Sort */}
              <div className="flex items-center gap-3">
                {/* Color filter */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFilterColor(null)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      filterColor === null
                        ? 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    All
                  </button>
                  {HIGHLIGHT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFilterColor(filterColor === color.value ? null : color.value)}
                      disabled={!availableColors.includes(color.value)}
                      className={`w-5 h-5 rounded border-2 transition-colors ${color.className} ${
                        filterColor === color.value
                          ? 'border-gray-800 dark:border-gray-200'
                          : 'border-transparent'
                      } ${
                        !availableColors.includes(color.value)
                          ? 'opacity-30 cursor-not-allowed'
                          : 'hover:border-gray-400'
                      }`}
                      title={color.label}
                    />
                  ))}
                </div>

                {/* Sort selector */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="ml-auto text-xs px-2 py-1 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="chunk">By Chunk</option>
                  <option value="date">By Date</option>
                  <option value="color">By Color</option>
                </select>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {searchedItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <HighlightOutlineIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">
                    {totalCount === 0 ? 'No highlights yet' : 'No matching highlights'}
                  </p>
                  <p className="text-xs mt-1">
                    Select text while reading to create highlights
                  </p>
                </div>
              ) : displayItems && sortBy === 'chunk' ? (
                /* Grouped by chunk display */
                <div className="space-y-4">
                  {displayItems
                    .filter((group) =>
                      searchQuery
                        ? group.items.some((item) =>
                            searchedItems.some((si) => si.highlight.id === item.highlight.id)
                          )
                        : true
                    )
                    .map((group) => (
                      <div key={group.chunkIndex}>
                        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                          <ChunkIcon className="w-3.5 h-3.5" />
                          Chunk #{group.chunkIndex}
                          <span className="font-normal">({group.items.length})</span>
                        </h3>
                        <div className="space-y-2">
                          <AnimatePresence mode="popLayout">
                            {group.items
                              .filter((item) =>
                                searchQuery
                                  ? searchedItems.some((si) => si.highlight.id === item.highlight.id)
                                  : true
                              )
                              .map((item) => (
                                <AnnotationItem
                                  key={item.highlight.id}
                                  item={item}
                                  onNavigate={() =>
                                    onNavigateToHighlight(
                                      item.highlight.chunkKey.chunkIndex,
                                      item.highlight.id
                                    )
                                  }
                                  onDelete={() => onDeleteHighlight(item.highlight.id)}
                                  onChangeColor={(color) =>
                                    onChangeHighlightColor(item.highlight.id, color)
                                  }
                                  onUpdateNote={(note) => onUpdateNote(item.highlight.id, note)}
                                />
                              ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                /* Flat list display */
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {searchedItems.map((item) => (
                      <AnnotationItem
                        key={item.highlight.id}
                        item={item}
                        showChunkNumber
                        onNavigate={() =>
                          onNavigateToHighlight(
                            item.highlight.chunkKey.chunkIndex,
                            item.highlight.id
                          )
                        }
                        onDelete={() => onDeleteHighlight(item.highlight.id)}
                        onChangeColor={(color) =>
                          onChangeHighlightColor(item.highlight.id, color)
                        }
                        onUpdateNote={(note) => onUpdateNote(item.highlight.id, note)}
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

// ============================================
// Annotation Item
// ============================================

interface AnnotationItemProps {
  item: AnnotationSummaryItem
  showChunkNumber?: boolean
  onNavigate: () => void
  onDelete: () => void
  onChangeColor: (color: HighlightColor) => void
  onUpdateNote: (note: string) => void
}

function AnnotationItem({
  item,
  showChunkNumber,
  onNavigate,
  onDelete,
  onChangeColor,
  onUpdateNote,
}: AnnotationItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [noteValue, setNoteValue] = useState(item.annotation?.note || '')
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)

  const handleSaveNote = () => {
    onUpdateNote(noteValue)
    setIsEditing(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-gray-50 dark:bg-gray-750 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
    >
      {/* Header with color indicator */}
      <div className="flex items-start gap-2 mb-2">
        {/* Color indicator and picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={`w-4 h-4 rounded flex-shrink-0 mt-0.5 ${COLOR_BG_MAP[item.highlight.color]} hover:ring-2 ring-gray-300 transition-all`}
            title="Change color"
          />
          {showColorPicker && (
            <div className="absolute left-0 top-6 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 flex gap-1">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => {
                    onChangeColor(color.value)
                    setShowColorPicker(false)
                  }}
                  className={`w-6 h-6 rounded ${color.className} ${
                    item.highlight.color === color.value
                      ? 'ring-2 ring-gray-800 dark:ring-gray-200'
                      : 'hover:ring-2 ring-gray-400'
                  }`}
                  title={color.label}
                />
              ))}
            </div>
          )}
        </div>

        {/* Highlighted text */}
        <button
          type="button"
          onClick={onNavigate}
          className="flex-1 text-left min-w-0"
        >
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400">
            "{item.highlight.text}"
          </p>
          {showChunkNumber && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Chunk #{item.highlight.chunkKey.chunkIndex}
            </span>
          )}
        </button>

        {/* Actions */}
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
              title="Delete highlight"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Note */}
      {isEditing ? (
        <div className="space-y-2 mt-2">
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
                setNoteValue(item.annotation?.note || '')
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setNoteValue(item.annotation?.note || '')
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
      ) : item.annotation?.note ? (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-wrap pl-6">
          {item.annotation.note}
        </p>
      ) : null}

      {/* Timestamp */}
      <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 pl-6">
        {new Date(item.highlight.createdAt).toLocaleDateString()}
      </div>
    </motion.div>
  )
}

// ============================================
// Icons
// ============================================

function HighlightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M15.243 4.515l-6.738 6.737-.707 2.121-1.04 1.041 2.828 2.829 1.04-1.041 2.122-.707 6.737-6.738-4.242-4.242zm6.364 3.536a1 1 0 010 1.414l-7.778 7.778-2.122.707-1.414 1.414a1 1 0 01-1.414 0l-4.243-4.243a1 1 0 010-1.414l1.414-1.414.707-2.121 7.778-7.778a1 1 0 011.414 0l5.658 5.657z" />
    </svg>
  )
}

function HighlightOutlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.243 4.515l-6.738 6.737-.707 2.121-1.04 1.041 2.828 2.829 1.04-1.041 2.122-.707 6.737-6.738-4.242-4.242z" />
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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function ChunkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
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
