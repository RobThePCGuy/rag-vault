import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <div className="mb-4" style={{ color: 'var(--ws-text-muted)' }}>
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium" style={{ color: 'var(--ws-text)' }}>
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-sm max-w-sm" style={{ color: 'var(--ws-text-muted)' }}>
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
          style={{ color: 'var(--ws-accent)', background: 'var(--ws-accent-subtle)' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
