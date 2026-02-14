import { useEffect, useRef, useState } from 'react'

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
    container: 'ws-toast--success',
    icon: 'ws-toast-icon--success',
  },
  error: {
    container: 'ws-toast--error',
    icon: 'ws-toast-icon--error',
  },
  info: {
    container: 'ws-toast--info',
    icon: 'ws-toast-icon--info',
  },
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const styles = typeStyles[toast.type]
  const [exiting, setExiting] = useState(false)

  // Use ref to avoid unstable onDismiss dependency causing timer recreation
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
      // Wait for exit animation before removing
      setTimeout(() => onDismissRef.current(toast.id), 200)
    }, 5000)

    return () => clearTimeout(timer)
  }, [toast.id])

  const handleDismiss = () => {
    setExiting(true)
    setTimeout(() => onDismiss(toast.id), 200)
  }

  return (
    <div
      className={`ws-toast ${styles.container} ${exiting ? 'ws-toast--exiting' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <div className={`ws-toast-icon ${styles.icon}`}>
        {toast.type === 'success' && <CheckIcon />}
        {toast.type === 'error' && <ErrorIcon />}
        {toast.type === 'info' && <InfoIcon />}
      </div>
      <div className="ws-toast-content">
        <p className="ws-toast-title">{toast.title}</p>
        {toast.message && <p className="ws-toast-message">{toast.message}</p>}
      </div>
      <button type="button" onClick={handleDismiss} className="ws-toast-close" aria-label="Dismiss">
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
