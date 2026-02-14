import { Link } from 'react-router-dom'
import { useCurrentConfig } from '../../hooks'
import { ThemeToggle } from '../Settings/ThemeToggle'

export function Header() {
  const { config } = useCurrentConfig()

  return (
    <header
      className="px-6 py-4 transition-colors"
      style={{ background: 'var(--ws-surface-raised)', borderBottom: '1px solid var(--ws-border)' }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--ws-text)' }}>
          MCP Local RAG
        </h1>
        <div className="flex items-center gap-4">
          {config && (
            <Link
              to="/settings"
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors"
              style={{ color: 'var(--ws-text-secondary)', background: 'var(--ws-surface-1)' }}
              title={config.dbPath}
            >
              <DatabaseIcon className="w-4 h-4 text-green-500" />
              <span className="font-medium">{config.name}</span>
              <span style={{ color: 'var(--ws-text-muted)' }}>|</span>
              <span>{config.documentCount} docs</span>
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
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
