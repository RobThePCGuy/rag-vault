import { useState } from 'react'
import { Spinner } from '../ui'

interface CreateDatabaseCardProps {
  onCreate: (dbPath: string, name?: string) => void
  isLoading: boolean
  error: Error | null
}

export function CreateDatabaseCard({ onCreate, isLoading, error }: CreateDatabaseCardProps) {
  const [dbPath, setDbPath] = useState('')
  const [showForm, setShowForm] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (dbPath.trim()) {
      onCreate(dbPath.trim())
      setDbPath('')
      setShowForm(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-50 rounded-lg">
          <PlusIcon className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-gray-900">Create Database</h2>
          <p className="text-sm text-gray-500">Create a new RAG database</p>
        </div>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="dbPath" className="block text-sm font-medium text-gray-700 mb-1">
              Database Path
            </label>
            <input
              type="text"
              id="dbPath"
              value={dbPath}
              onChange={(e) => setDbPath(e.target.value)}
              placeholder="/path/to/new-database"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter the full path where you want to create the database
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
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
              }}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full px-4 py-3 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
        >
          + Create New Database
        </button>
      )}
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
