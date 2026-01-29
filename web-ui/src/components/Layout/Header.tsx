import { Link } from 'react-router-dom'
import { useCurrentConfig } from '../../hooks'
import { ThemeToggle } from '../Settings/ThemeToggle'

export function Header() {
  const { config } = useCurrentConfig()

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 transition-colors">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">MCP Local RAG</h1>
        <div className="flex items-center gap-4">
          {config && (
            <Link
              to="/settings"
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              title={config.dbPath}
            >
              <DatabaseIcon className="w-4 h-4 text-green-500 dark:text-green-400" />
              <span className="font-medium">{config.name}</span>
              <span className="text-gray-400 dark:text-gray-500">|</span>
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
