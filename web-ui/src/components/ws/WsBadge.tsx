import type { HTMLAttributes } from 'react'

export type WsBadgeVariant =
  | 'default'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'link-explicit'
  | 'link-semantic'
  | 'link-backlink'
  | 'link-unresolved'

interface WsBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: WsBadgeVariant
  count?: number
}

export function WsBadge({
  variant = 'default',
  count,
  children,
  className = '',
  ...props
}: WsBadgeProps) {
  return (
    <span data-variant={variant} className={`ws-badge ${className}`} {...props}>
      {children}
      {count !== undefined && <span className="ws-badge-count">{count}</span>}
    </span>
  )
}
