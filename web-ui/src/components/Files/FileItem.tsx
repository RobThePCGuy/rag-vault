import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { FileInfo } from '../../api/client'

interface FileItemProps {
  file: FileInfo
  onDelete: (options: { filePath?: string; source?: string }) => void
  isDeleting: boolean
}

export function FileItem({ file, onDelete, isDeleting }: FileItemProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const navigate = useNavigate()

  const displayName = file.source || file.filePath.split(/[/\\]/).pop() || file.filePath
  const isRawData = file.filePath.includes('raw-data')

  const handleDelete = () => {
    if (file.source) {
      onDelete({ source: file.source })
    } else {
      onDelete({ filePath: file.filePath })
    }
    setShowConfirm(false)
  }

  const handleRead = () => {
    const params = new URLSearchParams({ path: file.filePath })
    navigate(`/read?${params.toString()}`)
  }

  return (
    <div
      className="rounded-lg p-4 flex items-center justify-between gap-4"
      style={{ background: 'var(--ws-surface-raised)', border: '1px solid var(--ws-border)' }}
    >
      <div className="flex-1 min-w-0">
        <h3
          className="font-medium truncate"
          style={{ color: 'var(--ws-text)' }}
          title={file.source || file.filePath}
        >
          {displayName}
        </h3>
        <div
          className="flex items-center gap-4 mt-1 text-sm"
          style={{ color: 'var(--ws-text-muted)' }}
        >
          <span>{file.chunkCount} chunks</span>
          {isRawData && <span style={{ color: 'var(--ws-accent)' }}>Ingested content</span>}
        </div>
        {file.source && (
          <p
            className="text-xs truncate mt-1"
            style={{ color: 'var(--ws-text-muted)' }}
            title={file.filePath}
          >
            {file.filePath}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showConfirm ? (
          <>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              disabled={isDeleting}
              className="px-3 py-1.5 text-sm rounded-lg transition-colors"
              style={{ color: 'var(--ws-text-secondary)', background: 'var(--ws-surface-1)' }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleRead}
              className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            >
              Read
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  )
}
