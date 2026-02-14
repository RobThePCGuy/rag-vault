import { StatusDashboard } from '../components/Status'
import { Spinner } from '../components/ui'
import { useStatus } from '../hooks'

export function StatusPage() {
  const { status, isLoading, error, refetch } = useStatus()

  return (
    <div className="ws-page max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ws-page-title text-2xl font-bold mb-2">System Status</h1>
          <p style={{ color: 'var(--ws-text-secondary)' }}>
            Monitor your RAG system metrics and configuration.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading}
          className="ws-button px-4 py-2 text-sm rounded-lg transition-colors"
          data-variant="default"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {isLoading && !status ? (
        <div className="flex items-center justify-center py-12">
          <span style={{ color: 'var(--ws-text-faint)' }}>
            <Spinner />
          </span>
          <span className="ml-3" style={{ color: 'var(--ws-text-muted)' }}>
            Loading status...
          </span>
        </div>
      ) : error ? (
        <div className="ws-error-box rounded-lg">
          <p className="font-medium">Error loading status</p>
          <p className="text-sm">{error.message}</p>
        </div>
      ) : status ? (
        <StatusDashboard status={status} />
      ) : null}
    </div>
  )
}
