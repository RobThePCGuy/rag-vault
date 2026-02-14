import type { SystemStatus } from '../../api/client'
import { formatBytes, formatUptime } from '../../utils/format'

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
          <div
            key={metric.label}
            className="border rounded-lg p-6"
            style={{ background: 'var(--ws-surface-raised)', borderColor: 'var(--ws-border)' }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: 'var(--ws-accent-subtle)' }}>
                <metric.icon className="w-6 h-6" style={{ color: 'var(--ws-accent)' }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: 'var(--ws-text-muted)' }}>
                  {metric.label}
                </p>
                <p className="text-2xl font-semibold" style={{ color: 'var(--ws-text)' }}>
                  {metric.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* System Info */}
      <div
        className="border rounded-lg p-6"
        style={{ background: 'var(--ws-surface-raised)', borderColor: 'var(--ws-border)' }}
      >
        <h2 className="text-lg font-medium mb-4" style={{ color: 'var(--ws-text)' }}>
          System Info
        </h2>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt style={{ color: 'var(--ws-text-muted)' }}>Search Mode</dt>
            <dd className="font-mono text-sm" style={{ color: 'var(--ws-text)' }}>
              {status.searchMode}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt style={{ color: 'var(--ws-text-muted)' }}>FTS Index</dt>
            <dd className="font-mono text-sm" style={{ color: 'var(--ws-text)' }}>
              {status.ftsIndexEnabled ? 'Enabled' : 'Disabled'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt style={{ color: 'var(--ws-text-muted)' }}>Uptime</dt>
            <dd className="font-mono text-sm" style={{ color: 'var(--ws-text)' }}>
              {formatUptime(status.uptime)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

function DocumentIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}

function ChunkIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 10h16M4 14h16M4 18h16"
      />
    </svg>
  )
}

function DatabaseIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
      />
    </svg>
  )
}
