import { useState } from 'react'
import type { DatabaseEntry } from '../../api/config'
import { Spinner } from '../ui'
import { formatDate } from '../../utils/format'

interface DatabaseSwitcherProps {
  databases: DatabaseEntry[]
  currentDbPath?: string
  onSwitch: (dbPath: string) => void
  onDelete: (dbPath: string, deleteFiles: boolean) => Promise<void>
  isLoading: boolean
}

export function DatabaseSwitcher({
  databases,
  currentDbPath,
  onSwitch,
  onDelete,
  isLoading,
}: DatabaseSwitcherProps) {
  const [switchingPath, setSwitchingPath] = useState<string | null>(null)
  const [deletingPath, setDeletingPath] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ path: string; name: string } | null>(null)

  const handleSwitch = (dbPath: string) => {
    setSwitchingPath(dbPath)
    onSwitch(dbPath)
  }

  const handleDeleteClick = (db: DatabaseEntry) => {
    setConfirmDelete({ path: db.path, name: db.name })
  }

  const handleDeleteConfirm = async (deleteFiles: boolean) => {
    if (!confirmDelete) return
    setDeletingPath(confirmDelete.path)
    try {
      await onDelete(confirmDelete.path, deleteFiles)
    } finally {
      setDeletingPath(null)
      setConfirmDelete(null)
    }
  }

  // Filter out current database from the list
  const otherDatabases = databases.filter((db) => db.path !== currentDbPath)

  if (otherDatabases.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <SwitchIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Databases</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Switch between databases</p>
          </div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No other databases available. Create a new database or scan for existing ones.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <SwitchIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Databases</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Switch between databases</p>
        </div>
      </div>

      <div className="space-y-2">
        {otherDatabases.map((db) => (
          <div
            key={db.path}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white">{db.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate max-w-xs" title={db.path}>
                {db.path}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                <span>Last used: {formatDate(db.lastAccessed)}</span>
                {db.modelName && (
                  <>
                    <span>·</span>
                    <span className="font-mono">{db.modelName.split('/').pop()}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                type="button"
                onClick={() => handleSwitch(db.path)}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading && switchingPath === db.path ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" />
                    Switching...
                  </span>
                ) : (
                  'Switch'
                )}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteClick(db)}
                disabled={isLoading || deletingPath === db.path}
                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Remove database"
              >
                {deletingPath === db.path ? <Spinner size="sm" /> : <TrashIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Remove Database
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Remove <span className="font-medium">{confirmDelete.name}</span> from your recent databases?
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleDeleteConfirm(false)}
                disabled={isLoading}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                Remove from list only
              </button>
              <button
                type="button"
                onClick={() => handleDeleteConfirm(true)}
                disabled={isLoading}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                Delete files permanently
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={isLoading}
                className="w-full px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SwitchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
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
