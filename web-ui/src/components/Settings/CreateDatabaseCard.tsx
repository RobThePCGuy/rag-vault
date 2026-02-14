import { useState } from 'react'
import { useAvailableModels } from '../../hooks'
import { Spinner } from '../ui'
import { FolderBrowser } from './FolderBrowser'
import { ModelSelector } from './ModelSelector'

interface CreateDatabaseCardProps {
  onCreate: (dbPath: string, name?: string, modelName?: string) => void
  isLoading: boolean
  error: Error | null
}

export function CreateDatabaseCard({ onCreate, isLoading, error }: CreateDatabaseCardProps) {
  const [dbPath, setDbPath] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [isBrowserOpen, setIsBrowserOpen] = useState(false)
  const { models, isLoading: isLoadingModels } = useAvailableModels()

  const defaultModel = models.find((m) => m.isDefault)?.id || ''

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (dbPath.trim()) {
      onCreate(dbPath.trim(), undefined, selectedModel || defaultModel)
      setDbPath('')
      setSelectedModel('')
      setShowForm(false)
    }
  }

  const handleBrowseSelect = (path: string) => {
    setDbPath(path)
  }

  return (
    <div
      className="border rounded-lg p-6"
      style={{ background: 'var(--ws-surface-raised)', borderColor: 'var(--ws-border)' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
          <PlusIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-medium" style={{ color: 'var(--ws-text)' }}>
            Create Database
          </h2>
          <p className="text-sm" style={{ color: 'var(--ws-text-muted)' }}>
            Create a new RAG database
          </p>
        </div>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="dbPath"
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--ws-text-secondary)' }}
            >
              Database Path
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="dbPath"
                value={dbPath}
                onChange={(e) => setDbPath(e.target.value)}
                placeholder="/path/to/new-database"
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                style={{
                  background: 'var(--ws-surface-raised)',
                  borderColor: 'var(--ws-border)',
                  color: 'var(--ws-text)',
                }}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setIsBrowserOpen(true)}
                disabled={isLoading}
                className="px-3 py-2 text-sm font-medium border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{
                  color: 'var(--ws-text-secondary)',
                  background: 'var(--ws-surface-raised)',
                  borderColor: 'var(--ws-border)',
                }}
                title="Browse folders"
              >
                <FolderIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="mt-1 text-xs" style={{ color: 'var(--ws-text-muted)' }}>
              Enter the full path where you want to create the database
            </p>
          </div>

          <ModelSelector
            models={models}
            value={selectedModel || defaultModel}
            onChange={setSelectedModel}
            isLoading={isLoadingModels}
            disabled={isLoading}
          />

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
              {error.message}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading || !dbPath.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" />
                  Creating...
                </span>
              ) : (
                'Create Database'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setDbPath('')
                setSelectedModel('')
              }}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
              style={{ color: 'var(--ws-text-secondary)', background: 'var(--ws-surface-1)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full px-4 py-3 text-sm font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
        >
          + Create New Database
        </button>
      )}

      <FolderBrowser
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        onSelect={handleBrowseSelect}
        title="Select Database Location"
      />
    </div>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
  )
}
