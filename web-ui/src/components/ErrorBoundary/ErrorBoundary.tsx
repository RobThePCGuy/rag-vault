import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary component to catch React rendering errors
 * Prevents the entire app from crashing due to component errors
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          className="min-h-screen flex items-center justify-center p-4"
          style={{ background: 'var(--ws-surface-1)' }}
        >
          <div
            className="max-w-md w-full rounded-lg shadow-lg p-6 text-center"
            style={{ background: 'var(--ws-surface-raised)' }}
          >
            <div className="text-red-500 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--ws-text)' }}>
              Something went wrong
            </h1>
            <p className="mb-4" style={{ color: 'var(--ws-text-secondary)' }}>
              An unexpected error occurred. Please try again.
            </p>
            {this.state.error && (
              <pre
                className="text-left text-sm p-3 rounded mb-4 overflow-auto max-h-32"
                style={{ background: 'var(--ws-surface-1)', color: 'var(--ws-text-secondary)' }}
              >
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-4 py-2 text-white rounded-lg transition-colors"
                style={{ background: 'var(--ws-accent)' }}
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{ background: 'var(--ws-surface-2)', color: 'var(--ws-text-secondary)' }}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
