import { useState } from 'react'
import type { AllowedRootsResponse } from '../../api/config'
import { Spinner } from '../ui'
import { FolderBrowser } from './FolderBrowser'

interface AllowedRootsCardProps {
  data: AllowedRootsResponse | undefined
  isLoading: boolean
  onAdd: (path: string) => void
  onRemove: (path: string) => void
  isAdding: boolean
  isRemoving: boolean
}

export function AllowedRootsCard({
  data,
  isLoading,
  onAdd,
  onRemove,
  isAdding,
  isRemoving,
}: AllowedRootsCardProps) {
  const [isBrowserOpen, setIsBrowserOpen] = useState(false)
  const [removingPath, setRemovingPath] = useState<string | null>(null)

  const handleRemove = (path: string) => {
    setRemovingPath(path)
    onRemove(path)
  }

  const handleAdd = (path: string) => {
    onAdd(path)
  }

  const isUserRoot = (root: string) => data?.userRoots.includes(root) ?? false
  const isEnvRoot = (root: string) => data?.envRoots.includes(root) ?? false
  const isBaseDir = (root: string) => root === data?.baseDir

  const getRootType = (root: string): string => {
    if (isBaseDir(root)) return 'Base Dir'
    if (isEnvRoot(root)) return 'Env'
    if (isUserRoot(root)) return 'Custom'
    return ''
  }

  const getRootTypeColor = (root: string): string => {
    if (isBaseDir(root)) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    if (isEnvRoot(root)) return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
    if (isUserRoot(root))
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
    return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
            <ShieldIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Allowed Scan Roots
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Directories where database scanning is permitted
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsBrowserOpen(true)}
          disabled={isAdding}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isAdding ? (
            <>
              <Spinner size="sm" />
              Adding...
            </>
          ) : (
            <>
              <PlusIcon className="w-4 h-4" />
              Add Root
            </>
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner className="text-gray-400" />
          <span className="ml-3 text-gray-500 dark:text-gray-400">Loading allowed roots...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.roots.map((root) => (
            <div
              key={root}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <FolderIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span
                  className="font-mono text-sm text-gray-700 dark:text-gray-300 truncate"
                  title={root}
                >
                  {root}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${getRootTypeColor(root)}`}
                >
                  {getRootType(root)}
                </span>
              </div>
              {isUserRoot(root) && (
                <button
                  type="button"
                  onClick={() => handleRemove(root)}
                  disabled={isRemoving}
                  className="ml-4 p-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Remove this root"
                >
                  {isRemoving && removingPath === root ? (
                    <Spinner size="sm" />
                  ) : (
                    <TrashIcon className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          ))}

          {data?.roots.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              No allowed roots configured
            </p>
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>
          <strong className="text-gray-700 dark:text-gray-300">Base Dir:</strong> Current database
          directory (always allowed)
        </p>
        <p>
          <strong className="text-gray-700 dark:text-gray-300">Env:</strong> Set via
          ALLOWED_SCAN_ROOTS environment variable
        </p>
        <p>
          <strong className="text-gray-700 dark:text-gray-300">Custom:</strong> User-added roots
          (can be removed)
        </p>
      </div>

      <FolderBrowser
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        onSelect={handleAdd}
        title="Add Allowed Root"
      />
    </div>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}
