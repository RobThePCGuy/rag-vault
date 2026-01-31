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
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <h3
          className="font-medium text-gray-900 dark:text-gray-100 truncate"
          title={file.source || file.filePath}
        >
          {displayName}
        </h3>
        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
          <span>{file.chunkCount} chunks</span>
          {isRawData && <span className="text-blue-600 dark:text-blue-400">Ingested content</span>}
        </div>
        {file.source && (
          <p
            className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1"
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
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleRead}
              className="px-3 py-1.5 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
            >
              Read
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  )
}
