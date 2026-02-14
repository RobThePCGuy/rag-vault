import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  COLLECTION_COLORS,
  COLLECTION_COLOR_CLASSES,
  type Collection,
  type CollectionColor,
} from '../contexts/CollectionsContext'
import { useCollectionManagement } from '../hooks/useCollections'

export function CollectionsPage() {
  const navigate = useNavigate()
  const {
    collections,
    createCollection,
    updateCollection,
    deleteCollection,
    getDocumentsInCollection,
  } = useCollectionManagement()

  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formColor, setFormColor] = useState<CollectionColor>('blue')

  // Start creating a new collection
  const handleStartCreate = () => {
    setIsCreating(true)
    setEditingId(null)
    setFormName('')
    setFormDescription('')
    setFormColor('blue')
  }

  // Start editing a collection
  const handleStartEdit = (collection: Collection) => {
    setIsCreating(false)
    setEditingId(collection.id)
    setFormName(collection.name)
    setFormDescription(collection.description || '')
    setFormColor(collection.color)
  }

  // Save (create or update)
  const handleSave = () => {
    if (!formName.trim()) return

    if (isCreating) {
      createCollection(formName.trim(), formColor, formDescription.trim() || undefined)
    } else if (editingId) {
      updateCollection(editingId, {
        name: formName.trim(),
        color: formColor,
        description: formDescription.trim() || undefined,
      })
    }

    setIsCreating(false)
    setEditingId(null)
    setFormName('')
    setFormDescription('')
  }

  // Cancel editing/creating
  const handleCancel = () => {
    setIsCreating(false)
    setEditingId(null)
    setFormName('')
    setFormDescription('')
  }

  // Navigate to files page with collection filter
  const handleViewCollection = (collectionId: string) => {
    navigate(`/files?collection=${collectionId}`)
  }

  return (
    <div className="ws-page max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ws-page-title text-2xl font-bold mb-2">Collections</h1>
          <p style={{ color: 'var(--ws-text-secondary)' }}>
            Organize your documents into collections.
          </p>
        </div>
        {!isCreating && !editingId && (
          <button
            type="button"
            onClick={handleStartCreate}
            className="ws-button flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            data-variant="primary"
          >
            <PlusIcon className="w-4 h-4" />
            New Collection
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      <AnimatePresence>
        {(isCreating || editingId) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="ws-surface p-4 space-y-4"
          >
            <h3 className="text-lg font-medium" style={{ color: 'var(--ws-text)' }}>
              {isCreating ? 'Create Collection' : 'Edit Collection'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ws-text-secondary)' }}>
                  Name
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Collection name"
                    className="ws-input mt-1"
                  />
                </label>
              </div>

              <div>
                <span className="block text-sm font-medium mb-1" style={{ color: 'var(--ws-text-secondary)' }}>
                  Color
                </span>
                <div className="flex flex-wrap gap-2">
                  {COLLECTION_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormColor(color)}
                      className={`w-8 h-8 rounded-full ${COLLECTION_COLOR_CLASSES[color].bg} ${
                        formColor === color
                          ? 'ring-2 ring-offset-2'
                          : ''
                      }`}
                      style={formColor === color ? { '--tw-ring-color': 'var(--ws-accent)', '--tw-ring-offset-color': 'var(--ws-surface-2)' } as React.CSSProperties : undefined}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--ws-text-secondary)' }}>
                Description (optional)
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="What's this collection for?"
                  className="ws-input mt-1"
                />
              </label>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="ws-button px-4 py-2 text-sm rounded-lg transition-colors"
                data-variant="default"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!formName.trim()}
                className="ws-button px-4 py-2 text-sm rounded-lg transition-colors"
                data-variant="primary"
              >
                {isCreating ? 'Create' : 'Save'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collections List */}
      {collections.length === 0 ? (
        <div className="ws-surface text-center py-12">
          <FolderIcon className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--ws-text-faint)' }} />
          <h3 className="text-lg font-medium mb-1" style={{ color: 'var(--ws-text)' }}>
            No collections yet
          </h3>
          <p className="mb-4" style={{ color: 'var(--ws-text-muted)' }}>
            Create a collection to organize your documents.
          </p>
          <button
            type="button"
            onClick={handleStartCreate}
            className="ws-button inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            data-variant="primary"
          >
            <PlusIcon className="w-4 h-4" />
            Create your first collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {collections.map((collection) => {
              const documents = getDocumentsInCollection(collection.id)
              const colorClasses = COLLECTION_COLOR_CLASSES[collection.color]

              return (
                <motion.div
                  key={collection.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`rounded-lg p-4 ${colorClasses.border}`}
                  style={{ background: 'var(--ws-surface-2)', border: '1px solid' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full ${colorClasses.bg}`} />
                      <h3 className="text-lg font-medium" style={{ color: 'var(--ws-text)' }}>
                        {collection.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(collection)}
                        className="p-1.5 rounded transition-colors"
                        style={{ color: 'var(--ws-text-faint)' }}
                        title="Edit"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <DeleteButton onDelete={() => deleteCollection(collection.id)} />
                    </div>
                  </div>

                  {collection.description && (
                    <p className="text-sm mb-3" style={{ color: 'var(--ws-text-muted)' }}>
                      {collection.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--ws-text-muted)' }}>
                      {documents.length} document{documents.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleViewCollection(collection.id)}
                      className="text-sm hover:underline"
                      style={{ color: 'var(--ws-accent)' }}
                    >
                      View documents &rarr;
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false)

  if (showConfirm) {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onDelete}
          className="px-2 py-1 text-xs font-medium rounded transition-colors"
          style={{ color: 'var(--ws-danger)', background: 'var(--ws-danger-muted)' }}
        >
          Delete
        </button>
        <button
          type="button"
          onClick={() => setShowConfirm(false)}
          className="px-2 py-1 text-xs font-medium rounded transition-colors"
          style={{ color: 'var(--ws-text-muted)' }}
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setShowConfirm(true)}
      className="p-1.5 rounded transition-colors"
      style={{ color: 'var(--ws-text-faint)' }}
      title="Delete"
    >
      <TrashIcon className="w-4 h-4" />
    </button>
  )
}

// Icons
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

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
