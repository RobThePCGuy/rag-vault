import type { HTMLAttributes, ReactNode } from 'react'

interface WsPanelProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode
  footer?: ReactNode
}

export function WsPanel({
  header,
  footer,
  className = '',
  children,
  ...props
}: WsPanelProps) {
  return (
    <div className={`ws-panel ${className}`} {...props}>
      {header && <div className="ws-panel-header">{header}</div>}
      <div className="ws-panel-body">{children}</div>
      {footer && <div className="ws-panel-footer">{footer}</div>}
    </div>
  )
}
