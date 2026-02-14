import { useState, useEffect, useRef } from 'react'
import type { SearchResult } from '../../api/client'
import { Modal } from '../ui'

interface DocumentPreviewProps {
  result: SearchResult
  isOpen: boolean
  onClose: () => void
}

export function DocumentPreview({ result, isOpen, onClose }: DocumentPreviewProps) {
  const [copied, setCopied] = useState(false)
  const displaySource = result.source || result.filePath
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timeout on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.text)
      setCopied(true)
      // Clear any existing timeout before setting a new one
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Document Preview">
      <div className="space-y-4">
        {/* Metadata */}
        <div
          className="grid grid-cols-2 gap-4 p-4 rounded-lg text-sm"
          style={{ background: 'var(--ws-surface-1)' }}
        >
          <div>
            <span style={{ color: 'var(--ws-text-muted)' }}>Source:</span>
            <p className="font-medium break-all" style={{ color: 'var(--ws-text)' }}>
              {displaySource}
            </p>
          </div>
          <div>
            <span style={{ color: 'var(--ws-text-muted)' }}>Chunk:</span>
            <p className="font-medium" style={{ color: 'var(--ws-text)' }}>
              #{result.chunkIndex}
            </p>
          </div>
          <div>
            <span style={{ color: 'var(--ws-text-muted)' }}>Score:</span>
            <p className="font-medium" style={{ color: 'var(--ws-text)' }}>
              {result.score.toFixed(4)}
            </p>
          </div>
          <div>
            <span style={{ color: 'var(--ws-text-muted)' }}>File Path:</span>
            <p
              className="font-medium break-all truncate"
              style={{ color: 'var(--ws-text)' }}
              title={result.filePath}
            >
              {result.filePath}
            </p>
          </div>
        </div>

        {/* Content */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium" style={{ color: 'var(--ws-text-secondary)' }}>
              Content
            </h3>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors"
              style={{ color: 'var(--ws-text-secondary)', background: 'var(--ws-surface-1)' }}
            >
              {copied ? (
                <>
                  <CheckIcon />
                  Copied
                </>
              ) : (
                <>
                  <CopyIcon />
                  Copy
                </>
              )}
            </button>
          </div>
          <div
            className="p-4 rounded-lg"
            style={{ background: 'var(--ws-surface-raised)', border: '1px solid var(--ws-border)' }}
          >
            <p
              className="text-sm whitespace-pre-wrap"
              style={{ color: 'var(--ws-text-secondary)' }}
            >
              {result.text}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function CopyIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}
