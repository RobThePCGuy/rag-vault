import { StatusDashboard } from '../components/Status'
import { Spinner } from '../components/ui'
import { useStatus } from '../hooks'

export function StatusPage() {
  const { status, isLoading, error, refetch } = useStatus()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">System Status</h1>
          <p className="text-gray-600">Monitor your RAG system metrics and configuration.</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading}
          className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {isLoading && !status ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="text-gray-400" />
          <span className="ml-3 text-gray-500">Loading status...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading status</p>
          <p className="text-sm">{error.message}</p>
        </div>
      ) : status ? (
        <StatusDashboard status={status} />
      ) : null}
    </div>
  )
}
