import { type ButtonHTMLAttributes, forwardRef } from 'react'

export type WsButtonVariant = 'default' | 'primary' | 'ghost' | 'danger'
export type WsButtonSize = 'sm' | 'md' | 'lg'

interface WsButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: WsButtonVariant
  size?: WsButtonSize
}

export const WsButton = forwardRef<HTMLButtonElement, WsButtonProps>(
  ({ variant = 'default', size = 'md', className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      data-variant={variant}
      data-size={size}
      className={`ws-button ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
)

WsButton.displayName = 'WsButton'
