import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TAG_COLORS, TAG_COLOR_CLASSES, type Tag, type TagColor } from '../../contexts/TagsContext'

interface TagPickerProps {
  isOpen: boolean
  onClose: () => void
  appliedTags: Tag[]
  allTags: Tag[]
  suggestions: Tag[]
  onToggleTag: (tagId: string) => void
  onCreateTag: (name: string, color: TagColor) => void
  position?: { x: number; y: number }
}

/**
 * Tag picker popup for applying/removing tags
 * Shows suggestions, allows creating new tags
 */
export function TagPicker({
  isOpen,
  onClose,
  appliedTags,
  allTags,
  suggestions,
  onToggleTag,
  onCreateTag,
  position,
}: TagPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [selectedColor, setSelectedColor] = useState<TagColor>('blue')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setSearchQuery('')
      setIsCreating(false)
      setNewTagName('')
    }
  }, [isOpen])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  // Filter tags by search query
  const filteredTags = searchQuery
    ? allTags.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : suggestions

  // Check if we should show "create new tag" option
  const showCreateOption = searchQuery && !allTags.some(
    (t) => t.name.toLowerCase() === searchQuery.toLowerCase()
  )

  // Handle creating a new tag
  const handleCreateTag = useCallback(() => {
    const name = isCreating ? newTagName.trim() : searchQuery.trim()
    if (name) {
      onCreateTag(name, selectedColor)
      setSearchQuery('')
      setIsCreating(false)
      setNewTagName('')
    }
  }, [isCreating, newTagName, searchQuery, selectedColor, onCreateTag])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isCreating) {
        setIsCreating(false)
      } else {
        onClose()
      }
    } else if (e.key === 'Enter' && showCreateOption && !isCreating) {
      setIsCreating(true)
      setNewTagName(searchQuery)
    }
  }

  const appliedTagIds = new Set(appliedTags.map((t) => t.id))

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-72"
          style={position ? { left: position.x, top: position.y } : { left: '50%', top: '30%', transform: 'translateX(-50%)' }}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <TagIcon className="w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search or create tag..."
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-64 overflow-y-auto p-2">
            {isCreating ? (
              // Create new tag form
              <div className="space-y-3 p-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Tag name
                  </label>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateTag()
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {TAG_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`w-6 h-6 rounded-full ${TAG_COLOR_CLASSES[color].bg} ${
                          selectedColor === color
                            ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800'
                            : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim()}
                    className="flex-1 px-3 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : (
              // Tag list
              <div className="space-y-1">
                {/* Applied tags section */}
                {appliedTags.length > 0 && !searchQuery && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1">
                      Applied
                    </div>
                    {appliedTags.map((tag) => (
                      <TagItem
                        key={tag.id}
                        tag={tag}
                        isApplied={true}
                        onToggle={() => onToggleTag(tag.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Suggestions/filtered tags */}
                {filteredTags.length > 0 && (
                  <div>
                    {!searchQuery && appliedTags.length > 0 && (
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1">
                        Suggestions
                      </div>
                    )}
                    {filteredTags
                      .filter((t) => !appliedTagIds.has(t.id))
                      .map((tag) => (
                        <TagItem
                          key={tag.id}
                          tag={tag}
                          isApplied={false}
                          onToggle={() => onToggleTag(tag.id)}
                        />
                      ))}
                  </div>
                )}

                {/* Create new tag option */}
                {showCreateOption && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(true)
                      setNewTagName(searchQuery)
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Create "{searchQuery}"
                  </button>
                )}

                {/* Empty state */}
                {filteredTags.length === 0 && !showCreateOption && appliedTags.length === 0 && (
                  <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                    No tags yet. Type to create one.
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface TagItemProps {
  tag: Tag
  isApplied: boolean
  onToggle: () => void
}

function TagItem({ tag, isApplied, onToggle }: TagItemProps) {
  const colorClasses = TAG_COLOR_CLASSES[tag.color]

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${colorClasses.bg} ${colorClasses.text}`}
        >
          {tag.name}
        </span>
        {tag.usageCount > 0 && (
          <span className="text-xs text-gray-400">×{tag.usageCount}</span>
        )}
      </div>
      {isApplied ? (
        <CheckIcon className="w-4 h-4 text-green-500" />
      ) : (
        <div className="w-4 h-4" /> // Spacer for alignment
      )}
    </button>
  )
}

// Icons
function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
      />
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}
