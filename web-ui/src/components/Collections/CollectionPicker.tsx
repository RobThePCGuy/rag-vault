import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  COLLECTION_COLORS,
  COLLECTION_COLOR_CLASSES,
  type Collection,
  type CollectionColor,
} from '../../contexts/CollectionsContext'

interface CollectionPickerProps {
  isOpen: boolean
  onClose: () => void
  collections: Collection[]
  documentCollections: Collection[]
  onAddToCollection: (collectionId: string) => void
  onRemoveFromCollection: (collectionId: string) => void
  onCreateCollection: (name: string, color: CollectionColor, description?: string) => void
  position?: { x: number; y: number }
}

/**
 * Collection picker popup for adding/removing documents from collections
 */
export function CollectionPicker({
  isOpen,
  onClose,
  collections,
  documentCollections,
  onAddToCollection,
  onRemoveFromCollection,
  onCreateCollection,
  position,
}: CollectionPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [selectedColor, setSelectedColor] = useState<CollectionColor>('blue')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setSearchQuery('')
      setIsCreating(false)
      setNewName('')
      setNewDescription('')
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

  // Filter collections by search query
  const filteredCollections = searchQuery
    ? collections.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : collections

  // Check if we should show "create new collection" option
  const showCreateOption =
    searchQuery && !collections.some((c) => c.name.toLowerCase() === searchQuery.toLowerCase())

  // Handle creating a new collection
  const handleCreate = useCallback(() => {
    const name = isCreating ? newName.trim() : searchQuery.trim()
    if (name) {
      onCreateCollection(name, selectedColor, newDescription.trim() || undefined)
      setSearchQuery('')
      setIsCreating(false)
      setNewName('')
      setNewDescription('')
    }
  }, [isCreating, newName, searchQuery, selectedColor, newDescription, onCreateCollection])

  // Handle toggling collection membership
  const handleToggle = useCallback(
    (collectionId: string) => {
      const isInCollection = documentCollections.some((c) => c.id === collectionId)
      if (isInCollection) {
        onRemoveFromCollection(collectionId)
      } else {
        onAddToCollection(collectionId)
      }
    },
    [documentCollections, onAddToCollection, onRemoveFromCollection]
  )

  const documentCollectionIds = new Set(documentCollections.map((c) => c.id))

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="fixed z-50 rounded-lg shadow-xl w-80"
          style={
            position
              ? {
                  background: 'var(--ws-surface-raised)',
                  border: '1px solid var(--ws-border)',
                  left: position.x,
                  top: position.y,
                }
              : {
                  background: 'var(--ws-surface-raised)',
                  border: '1px solid var(--ws-border)',
                  left: '50%',
                  top: '30%',
                  transform: 'translateX(-50%)',
                }
          }
        >
          {/* Header */}
          <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--ws-border)' }}>
            <div className="flex items-center gap-2">
              <FolderIcon className="w-4 h-4" style={{ color: 'var(--ws-text-muted)' }} />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    if (isCreating) {
                      setIsCreating(false)
                    } else {
                      onClose()
                    }
                  }
                }}
                placeholder="Search or create collection..."
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: 'var(--ws-text)' }}
              />
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded"
                style={{ color: 'var(--ws-text-muted)' }}
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-72 overflow-y-auto p-2">
            {isCreating ? (
              // Create new collection form
              <div className="space-y-3 p-2">
                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--ws-text-muted)' }}
                  >
                    Name
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 text-sm rounded focus:outline-none focus:ring-2"
                      style={{
                        background: 'var(--ws-surface-1)',
                        border: '1px solid var(--ws-border)',
                        color: 'var(--ws-text)',
                      }}
                    />
                  </label>
                </div>

                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--ws-text-muted)' }}
                  >
                    Description (optional)
                    <input
                      type="text"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 text-sm rounded focus:outline-none focus:ring-2"
                      style={{
                        background: 'var(--ws-surface-1)',
                        border: '1px solid var(--ws-border)',
                        color: 'var(--ws-text)',
                      }}
                      placeholder="What's this collection for?"
                    />
                  </label>
                </div>

                <div>
                  <span
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--ws-text-muted)' }}
                  >
                    Color
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {COLLECTION_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`w-6 h-6 rounded-full ${COLLECTION_COLOR_CLASSES[color].bg} ${
                          selectedColor === color ? 'ring-2 ring-offset-2' : ''
                        }`}
                        style={
                          selectedColor === color
                            ? ({
                                '--tw-ring-color': 'var(--ws-accent)',
                                '--tw-ring-offset-color': 'var(--ws-surface-raised)',
                              } as React.CSSProperties)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 px-3 py-1.5 text-sm rounded transition-colors"
                    style={{ color: 'var(--ws-text-secondary)', background: 'var(--ws-surface-1)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!newName.trim()}
                    className="flex-1 px-3 py-1.5 text-sm text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    style={{ background: 'var(--ws-accent)' }}
                  >
                    Create & Add
                  </button>
                </div>
              </div>
            ) : (
              // Collection list
              <div className="space-y-1">
                {/* Current collections section */}
                {documentCollections.length > 0 && !searchQuery && (
                  <div className="mb-2">
                    <div
                      className="text-xs font-medium px-2 py-1"
                      style={{ color: 'var(--ws-text-muted)' }}
                    >
                      In collections
                    </div>
                    {documentCollections.map((collection) => (
                      <CollectionItem
                        key={collection.id}
                        collection={collection}
                        isSelected={true}
                        onToggle={() => handleToggle(collection.id)}
                      />
                    ))}
                  </div>
                )}

                {/* All/filtered collections */}
                {filteredCollections.length > 0 && (
                  <div>
                    {!searchQuery && documentCollections.length > 0 && (
                      <div
                        className="text-xs font-medium px-2 py-1"
                        style={{ color: 'var(--ws-text-muted)' }}
                      >
                        All collections
                      </div>
                    )}
                    {filteredCollections
                      .filter((c) => !documentCollectionIds.has(c.id))
                      .map((collection) => (
                        <CollectionItem
                          key={collection.id}
                          collection={collection}
                          isSelected={false}
                          onToggle={() => handleToggle(collection.id)}
                        />
                      ))}
                  </div>
                )}

                {/* Create new collection option */}
                {showCreateOption && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(true)
                      setNewName(searchQuery)
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded transition-colors"
                    style={{ color: 'var(--ws-accent)' }}
                  >
                    <PlusIcon className="w-4 h-4" />
                    Create "{searchQuery}"
                  </button>
                )}

                {/* Empty state */}
                {filteredCollections.length === 0 &&
                  !showCreateOption &&
                  documentCollections.length === 0 && (
                    <div
                      className="text-center py-4 text-sm"
                      style={{ color: 'var(--ws-text-muted)' }}
                    >
                      No collections yet. Type to create one.
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

interface CollectionItemProps {
  collection: Collection
  isSelected: boolean
  onToggle: () => void
}

function CollectionItem({ collection, isSelected, onToggle }: CollectionItemProps) {
  const colorClasses = COLLECTION_COLOR_CLASSES[collection.color]

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${colorClasses.bg}`} />
        <span className="text-sm truncate" style={{ color: 'var(--ws-text-secondary)' }}>
          {collection.name}
        </span>
        <span className="text-xs" style={{ color: 'var(--ws-text-muted)' }}>
          {collection.documents.length}
        </span>
      </div>
      {isSelected ? (
        <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
      ) : (
        <div className="w-4 h-4" />
      )}
    </button>
  )
}

// Icons
function FolderIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
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
