import type { HTMLAttributes, ReactNode } from 'react'

interface WsCardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  actions?: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function WsCard({
  title,
  subtitle,
  actions,
  padding = 'md',
  className = '',
  children,
  ...props
}: WsCardProps) {
  return (
    <div data-padding={padding} className={`ws-card ${className}`} {...props}>
      {(title || actions) && (
        <div className="ws-card-header">
          <div>
            {title && <div className="ws-card-title">{title}</div>}
            {subtitle && <div className="ws-card-subtitle">{subtitle}</div>}
          </div>
          {actions && <div className="ws-card-actions">{actions}</div>}
        </div>
      )}
      <div className="ws-card-body">{children}</div>
    </div>
  )
}
