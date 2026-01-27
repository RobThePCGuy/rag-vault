import { useState } from 'react'
import type { DatabaseEntry } from '../../api/config'
import { Spinner } from '../ui'

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
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-50 rounded-lg">
            <SwitchIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-gray-900">Recent Databases</h2>
            <p className="text-sm text-gray-500">Switch between databases</p>
          </div>
        </div>
        <p className="text-gray-500 text-sm">
          No other databases available. Create a new database or scan for existing ones.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-50 rounded-lg">
          <SwitchIcon className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-gray-900">Recent Databases</h2>
          <p className="text-sm text-gray-500">Switch between databases</p>
        </div>
      </div>

      <div className="space-y-2">
        {otherDatabases.map((db) => (
          <div
            key={db.path}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{db.name}</p>
              <p className="text-sm text-gray-500 font-mono truncate max-w-xs" title={db.path}>
                {db.path}
              </p>
              <p className="text-xs text-gray-400">Last used: {formatDate(db.lastAccessed)}</p>
            </div>
            <button
              type="button"
              onClick={() => handleSwitch(db.path)}
              disabled={isLoading}
              className="ml-4 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // Less than 1 minute
  if (diff < 60000) {
    return 'Just now'
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }

  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  // Format as date
  return date.toLocaleDateString()
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
