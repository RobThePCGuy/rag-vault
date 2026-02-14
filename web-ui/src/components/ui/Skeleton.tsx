interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
}

export function Skeleton({ className = '', variant = 'text', width, height }: SkeletonProps) {
  const baseClasses = 'animate-pulse'

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }

  const style: React.CSSProperties = { background: 'var(--ws-surface-2)' }
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  // Default heights for text variant
  if (variant === 'text' && !height) {
    style.height = '1em'
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

interface SkeletonCardProps {
  className?: string
  lines?: number
}

const defaultLineWidths = ['100%', '90%', '80%', '70%', '60%']

export function SkeletonCard({ className = '', lines = 3 }: SkeletonCardProps) {
  const lineWidths = defaultLineWidths.slice(0, lines)

  return (
    <div
      className={`border rounded-lg p-6 ${className}`}
      style={{ background: 'var(--ws-surface-raised)', borderColor: 'var(--ws-border)' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton width="40%" height={18} />
          <Skeleton width="60%" height={14} />
        </div>
      </div>
      <div className="space-y-3">
        {lineWidths.map((width) => (
          <Skeleton key={width} width={width} height={16} />
        ))}
      </div>
    </div>
  )
}
