import { type InputHTMLAttributes, forwardRef } from 'react'

interface WsInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const WsInput = forwardRef<HTMLInputElement, WsInputProps>(
  ({ error, className = '', ...props }, ref) => (
    <input
      ref={ref}
      data-error={error || undefined}
      className={`ws-input ${className}`}
      {...props}
    />
  ),
)

WsInput.displayName = 'WsInput'
