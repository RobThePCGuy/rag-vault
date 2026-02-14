interface RailEmptyStateProps {
  message: string
  icon?: string
}

export function RailEmptyState({ message }: RailEmptyStateProps) {
  return (
    <div className="ws-rail-empty-state">
      <p>{message}</p>
    </div>
  )
}
