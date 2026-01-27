import { useEffect } from 'react'

export interface ToastData {
  id: string
  type: 'success' | 'error' | 'info'
  title: string
  message?: string
}

interface ToastProps {
  toast: ToastData
  onDismiss: (id: string) => void
}

const typeStyles = {
  success: {
    container: 'bg-green-50 border-green-200',
    icon: 'text-green-500',
    title: 'text-green-800',
    message: 'text-green-700',
  },
  error: {
    container: 'bg-red-50 border-red-200',
    icon: 'text-red-500',
    title: 'text-red-800',
    message: 'text-red-700',
  },
  info: {
    container: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-500',
    title: 'text-blue-800',
    message: 'text-blue-700',
  },
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const styles = typeStyles[toast.type]

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id)
    }, 5000)

    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div
      className={`flex items-start gap-3 p-4 border rounded-lg shadow-lg ${styles.container}`}
      role="alert"
      aria-live="polite"
    >
      <div className={`flex-shrink-0 ${styles.icon}`}>
        {toast.type === 'success' && <CheckIcon />}
        {toast.type === 'error' && <ErrorIcon />}
        {toast.type === 'info' && <InfoIcon />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${styles.title}`}>{toast.title}</p>
        {toast.message && <p className={`mt-1 text-sm ${styles.message}`}>{toast.message}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss"
      >
        <CloseIcon />
      </button>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
