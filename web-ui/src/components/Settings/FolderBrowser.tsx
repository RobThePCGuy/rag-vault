import { useEffect, useState } from 'react'
import type { DirectoryEntry } from '../../api/config'
import { usePreferences } from '../../contexts/PreferencesContext'
import { useBrowseDirectory } from '../../hooks'
import { Spinner } from '../ui'

interface FolderBrowserProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (path: string) => void
  initialPath?: string
  title?: string
}

export function FolderBrowser({
  isOpen,
  onClose,
  onSelect,
  initialPath,
  title = 'Select Folder',
}: FolderBrowserProps) {
  const { preferences, setLastBrowsedPath, setShowHiddenFiles } = usePreferences()
  const [currentPath, setCurrentPath] = useState(initialPath || preferences.lastBrowsedPath || '/')
  const { browse, isLoading, data, error } = useBrowseDirectory()

  useEffect(() => {
    if (isOpen) {
      const startPath = initialPath || preferences.lastBrowsedPath || '/'
      setCurrentPath(startPath)
      browse(startPath, preferences.showHiddenFiles)
    }
  }, [isOpen, initialPath, preferences.lastBrowsedPath, preferences.showHiddenFiles, browse])

  const handleNavigate = (path: string) => {
    setCurrentPath(path)
    setLastBrowsedPath(path)
    browse(path, preferences.showHiddenFiles)
  }

  const handleGoUp = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/'
    handleNavigate(parentPath)
  }

  const handleSelect = () => {
    setLastBrowsedPath(currentPath)
    onSelect(currentPath)
    onClose()
  }

  const handleToggleHidden = () => {
    const newValue = !preferences.showHiddenFiles
    setShowHiddenFiles(newValue)
    browse(currentPath, newValue)
  }

  if (!isOpen) return null

  const pathParts = currentPath.split('/').filter(Boolean)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleNavigate('/')}
            className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            /
          </button>
          {pathParts.map((part, index) => {
            const partPath = `/${pathParts.slice(0, index + 1).join('/')}`
            return (
              <span key={partPath} className="flex items-center">
                <span className="text-gray-400">/</span>
                <button
                  type="button"
                  onClick={() => handleNavigate(partPath)}
                  className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded truncate max-w-32"
                >
                  {part}
                </button>
              </span>
            )
          })}
        </div>

        {/* Current path display with hidden toggle */}
        <div className="flex items-center justify-between px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/30">
          <span className="text-sm text-amber-800 dark:text-amber-200 font-mono truncate flex-1">
            {currentPath}
          </span>
          <label className="flex items-center gap-2 ml-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={preferences.showHiddenFiles}
              onChange={handleToggleHidden}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-amber-600 focus:ring-amber-500 dark:bg-gray-700"
            />
            <span className="text-xs text-amber-700 dark:text-amber-300 whitespace-nowrap">
              Show hidden
            </span>
          </label>
        </div>

        {/* Directory listing */}
        <div className="flex-1 overflow-auto p-2 min-h-[300px] bg-white dark:bg-gray-800">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="text-gray-400" />
              <span className="ml-3 text-gray-500 dark:text-gray-400">Loading...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error.message}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Go up button */}
              {currentPath !== '/' && (
                <button
                  type="button"
                  onClick={handleGoUp}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <FolderUpIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">..</span>
                </button>
              )}

              {/* Directory entries */}
              {data?.entries.map((entry) => (
                <DirectoryEntryRow
                  key={entry.path}
                  entry={entry}
                  onNavigate={handleNavigate}
                />
              ))}

              {data?.entries.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  This directory is empty
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSelect}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Select This Folder
          </button>
        </div>
      </div>
    </div>
  )
}

function DirectoryEntryRow({
  entry,
  onNavigate,
}: {
  entry: DirectoryEntry
  onNavigate: (path: string) => void
}) {
  const isHidden = entry.name.startsWith('.')

  if (!entry.isDirectory) {
    return (
      <div className={`flex items-center gap-3 px-3 py-2 ${isHidden ? 'opacity-50' : ''} text-gray-400 dark:text-gray-500`}>
        <FileIcon className="w-5 h-5" />
        <span className="truncate">{entry.name}</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onNavigate(entry.path)}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${isHidden ? 'opacity-60' : ''}`}
    >
      <FolderIcon className="w-5 h-5 text-amber-500" />
      <span className="text-gray-900 dark:text-white truncate">{entry.name}</span>
    </button>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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

function FolderUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2zM12 11v6m0-6l-3 3m3-3l3 3"
      />
    </svg>
  )
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  )
}
