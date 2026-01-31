import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileList } from '../components/Files'
import { Spinner } from '../components/ui'
import { useCollections } from '../contexts/CollectionsContext'
import { useTags, TAG_COLOR_CLASSES } from '../contexts/TagsContext'
import { useFiles } from '../hooks'

export function FilesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { files, isLoading, error, deleteFile, isDeleting } = useFiles()
  const { collections } = useCollections()
  const { tags, getTagsForTarget } = useTags()

  // Filter state from URL
  const selectedCollectionId = searchParams.get('collection') || ''
  const selectedTagId = searchParams.get('tag') || ''

  // Get selected collection and tag objects
  const selectedCollection = collections.find((c) => c.id === selectedCollectionId)
  const selectedTag = tags.find((t) => t.id === selectedTagId)

  // Filter files based on collection and tag
  const filteredFiles = useMemo(() => {
    let result = files

    // Filter by collection
    if (selectedCollectionId && selectedCollection) {
      const collectionFiles = new Set(selectedCollection.documents)
      result = result.filter((f) => collectionFiles.has(f.filePath))
    }

    // Filter by tag (documents tagged with this tag)
    if (selectedTagId) {
      result = result.filter((f) => {
        const fileTags = getTagsForTarget('document', f.filePath)
        return fileTags.some((t) => t.id === selectedTagId)
      })
    }

    return result
  }, [files, selectedCollectionId, selectedCollection, selectedTagId, getTagsForTarget])

  // Update URL params
  const handleCollectionChange = (collectionId: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (collectionId) {
      newParams.set('collection', collectionId)
    } else {
      newParams.delete('collection')
    }
    setSearchParams(newParams)
  }

  const handleTagChange = (tagId: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (tagId) {
      newParams.set('tag', tagId)
    } else {
      newParams.delete('tag')
    }
    setSearchParams(newParams)
  }

  const clearFilters = () => {
    setSearchParams({})
  }

  const hasFilters = selectedCollectionId || selectedTagId

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Ingested Files
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your knowledge base content.</p>
        </div>
        {files.length > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredFiles.length === files.length
              ? `${files.length} file${files.length !== 1 ? 's' : ''}`
              : `${filteredFiles.length} of ${files.length} files`}
          </span>
        )}
      </div>

      {/* Filters */}
      {(collections.length > 0 || tags.length > 0) && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Filter by:</span>

          {/* Collection filter */}
          {collections.length > 0 && (
            <select
              value={selectedCollectionId}
              onChange={(e) => handleCollectionChange(e.target.value)}
              className="text-sm px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All collections</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.documents.length})
                </option>
              ))}
            </select>
          )}

          {/* Tag filter */}
          {tags.length > 0 && (
            <select
              value={selectedTagId}
              onChange={(e) => handleTagChange(e.target.value)}
              className="text-sm px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          {/* Clear filters */}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Active filter badges */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {selectedCollection && (
            <FilterBadge
              label={selectedCollection.name}
              type="collection"
              onRemove={() => handleCollectionChange('')}
            />
          )}
          {selectedTag && (
            <FilterBadge
              label={selectedTag.name}
              type="tag"
              color={selectedTag.color}
              onRemove={() => handleTagChange('')}
            />
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="text-gray-400" />
          <span className="ml-3 text-gray-500 dark:text-gray-400">Loading files...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          <p className="font-medium">Error loading files</p>
          <p className="text-sm">{error.message}</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <FilterIcon className="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            {hasFilters ? 'No files match the selected filters.' : 'No files ingested yet.'}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <FileList files={filteredFiles} onDelete={deleteFile} isDeleting={isDeleting} />
      )}
    </div>
  )
}

interface FilterBadgeProps {
  label: string
  type: 'collection' | 'tag'
  color?: string
  onRemove: () => void
}

function FilterBadge({ label, type, color, onRemove }: FilterBadgeProps) {
  const bgColor =
    type === 'tag' && color
      ? TAG_COLOR_CLASSES[color as keyof typeof TAG_COLOR_CLASSES]?.bg
      : 'bg-gray-100 dark:bg-gray-700'

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-sm rounded-full ${bgColor}`}>
      {type === 'collection' ? (
        <FolderIcon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
      ) : (
        <TagIcon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
      )}
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
      >
        <CloseIcon className="w-3 h-3 text-gray-500 dark:text-gray-400" />
      </button>
    </span>
  )
}

// Icons
function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  )
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  )
}

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
