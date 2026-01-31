import type { CurrentDatabaseConfig } from '../../api/config'
import { usePreferences } from '../../contexts/PreferencesContext'
import type { StatsRefreshInterval } from '../../contexts/PreferencesContext'
import { Spinner } from '../ui'

interface CurrentDatabaseCardProps {
  config: CurrentDatabaseConfig
  onRefresh?: () => void
  isFetching?: boolean
}

const refreshIntervals: { value: StatsRefreshInterval; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '1m' },
  { value: 300000, label: '5m' },
]

export function CurrentDatabaseCard({ config, onRefresh, isFetching }: CurrentDatabaseCardProps) {
  const { preferences, setStatsRefreshInterval } = usePreferences()

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <DatabaseIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Current Database</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Active RAG database</p>
          </div>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh stats"
          >
            {isFetching ? <Spinner size="sm" /> : <RefreshIcon className="w-5 h-5" />}
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400">Name</span>
          <span className="font-medium text-gray-900 dark:text-white">{config.name}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400">Path</span>
          <span
            className="font-mono text-sm text-gray-900 dark:text-gray-200 max-w-xs truncate"
            title={config.dbPath}
          >
            {config.dbPath}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400">Model</span>
          <span className="font-mono text-sm text-gray-900 dark:text-gray-200">
            {config.modelName}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400">Documents</span>
          <span className="font-medium text-gray-900 dark:text-white">{config.documentCount}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400">Chunks</span>
          <span className="font-medium text-gray-900 dark:text-white">{config.chunkCount}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-500 dark:text-gray-400">Auto-refresh</span>
          <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
            {refreshIntervals.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatsRefreshInterval(value)}
                className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                  preferences.statsRefreshInterval === value
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
      />
    </svg>
  )
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  )
}
