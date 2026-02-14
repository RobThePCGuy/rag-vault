import { type SelectHTMLAttributes, forwardRef } from 'react'

interface WsSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

export const WsSelect = forwardRef<HTMLSelectElement, WsSelectProps>(
  ({ error, className = '', children, ...props }, ref) => (
    <select
      ref={ref}
      data-error={error || undefined}
      className={`ws-select ${className}`}
      {...props}
    >
      {children}
    </select>
  ),
)

WsSelect.displayName = 'WsSelect'
