import { useState } from 'react'
import type { DatabaseEntry } from '../../api/config'
import { Spinner } from '../ui'
import { formatDate } from '../../utils/format'

interface DatabaseSwitcherProps {
  databases: DatabaseEntry[]
  currentDbPath?: string
  onSwitch: (dbPath: string) => void
  isLoading: boolean
}

export function DatabaseSwitcher({
  databases,
  currentDbPath,
  onSwitch,
  isLoading,
}: DatabaseSwitcherProps) {
  const [switchingPath, setSwitchingPath] = useState<string | null>(null)

  const handleSwitch = (dbPath: string) => {
    setSwitchingPath(dbPath)
    onSwitch(dbPath)
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
              <p className="text-xs text-gray-400 dark:text-gray-500">Last used: {formatDate(db.lastAccessed)}</p>
            </div>
            <button
              type="button"
              onClick={() => handleSwitch(db.path)}
              disabled={isLoading}
              className="ml-4 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          </div>
        ))}
      </div>
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
