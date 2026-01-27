import type { SystemStatus } from '../../api/client'

interface StatusDashboardProps {
  status: SystemStatus
}

export function StatusDashboard({ status }: StatusDashboardProps) {
  const metrics = [
    {
      label: 'Documents',
      value: status.documentCount.toString(),
      icon: DocumentIcon,
    },
    {
      label: 'Chunks',
      value: status.chunkCount.toString(),
      icon: ChunkIcon,
    },
    {
      label: 'Memory Usage',
      value: formatBytes(status.memoryUsage * 1024 * 1024), // Convert MB to bytes
      icon: DatabaseIcon,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <metric.icon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{metric.label}</p>
                <p className="text-2xl font-semibold text-gray-900">{metric.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* System Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">System Info</h2>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-gray-500">Search Mode</dt>
            <dd className="text-gray-900 font-mono text-sm">{status.searchMode}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">FTS Index</dt>
            <dd className="text-gray-900 font-mono text-sm">{status.ftsIndexEnabled ? 'Enabled' : 'Disabled'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Uptime</dt>
            <dd className="text-gray-900 font-mono text-sm">{formatUptime(status.uptime)}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}

function ChunkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 10h16M4 14h16M4 18h16"
      />
    </svg>
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
