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
    <div
      className="border rounded-lg p-6"
      style={{ background: 'var(--ws-surface-raised)', borderColor: 'var(--ws-border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <DatabaseIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium" style={{ color: 'var(--ws-text)' }}>
              Current Database
            </h2>
            <p className="text-sm" style={{ color: 'var(--ws-text-muted)' }}>
              Active RAG database
            </p>
          </div>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            className="p-2 rounded-lg transition-colors disabled:opacity-50"
            style={{ color: 'var(--ws-text-muted)' }}
            title="Refresh stats"
          >
            {isFetching ? <Spinner size="sm" /> : <RefreshIcon className="w-5 h-5" />}
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div
          className="flex justify-between items-center py-2 border-b"
          style={{ borderColor: 'var(--ws-border-subtle)' }}
        >
          <span style={{ color: 'var(--ws-text-muted)' }}>Name</span>
          <span className="font-medium" style={{ color: 'var(--ws-text)' }}>
            {config.name}
          </span>
        </div>
        <div
          className="flex justify-between items-center py-2 border-b"
          style={{ borderColor: 'var(--ws-border-subtle)' }}
        >
          <span style={{ color: 'var(--ws-text-muted)' }}>Path</span>
          <span
            className="font-mono text-sm max-w-xs truncate"
            style={{ color: 'var(--ws-text)' }}
            title={config.dbPath}
          >
            {config.dbPath}
          </span>
        </div>
        <div
          className="flex justify-between items-center py-2 border-b"
          style={{ borderColor: 'var(--ws-border-subtle)' }}
        >
          <span style={{ color: 'var(--ws-text-muted)' }}>Model</span>
          <span className="font-mono text-sm" style={{ color: 'var(--ws-text)' }}>
            {config.modelName}
          </span>
        </div>
        <div
          className="flex justify-between items-center py-2 border-b"
          style={{ borderColor: 'var(--ws-border-subtle)' }}
        >
          <span style={{ color: 'var(--ws-text-muted)' }}>Documents</span>
          <span className="font-medium" style={{ color: 'var(--ws-text)' }}>
            {config.documentCount}
          </span>
        </div>
        <div
          className="flex justify-between items-center py-2 border-b"
          style={{ borderColor: 'var(--ws-border-subtle)' }}
        >
          <span style={{ color: 'var(--ws-text-muted)' }}>Chunks</span>
          <span className="font-medium" style={{ color: 'var(--ws-text)' }}>
            {config.chunkCount}
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span style={{ color: 'var(--ws-text-muted)' }}>Auto-refresh</span>
          <div
            className="flex items-center gap-1 p-0.5 rounded-lg"
            style={{ background: 'var(--ws-surface-1)' }}
          >
            {refreshIntervals.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatsRefreshInterval(value)}
                className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                  preferences.statsRefreshInterval === value ? 'shadow-sm' : ''
                }`}
                style={
                  preferences.statsRefreshInterval === value
                    ? { background: 'var(--ws-surface-raised)', color: 'var(--ws-text)' }
                    : { color: 'var(--ws-text-muted)' }
                }
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
