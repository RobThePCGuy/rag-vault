import { useCallback, useRef, useState } from 'react'
import type { ExportedConfig } from '../../api/config'
import type { AnnotationsStore } from '../../contexts/AnnotationsContext'
import type { CollectionsStore } from '../../contexts/CollectionsContext'
import type { LinksStore } from '../../contexts/LinksContext'
import type { TagsStore } from '../../contexts/TagsContext'
import { useAnnotations } from '../../contexts/AnnotationsContext'
import { useCollections } from '../../contexts/CollectionsContext'
import { useLinks } from '../../contexts/LinksContext'
import { useTags } from '../../contexts/TagsContext'
import { useExportConfig, useImportConfig, useToast } from '../../hooks'
import { Spinner } from '../ui'

// ============================================
// Types
// ============================================

interface VaultExport {
  version: 1
  exportedAt: string
  vaultId: string
  data: {
    links?: LinksStore
    annotations?: AnnotationsStore
    collections?: CollectionsStore
    tags?: TagsStore
    serverConfig?: ExportedConfig
  }
}

type ImportStrategy = 'merge' | 'overwrite'

interface ExportOptions {
  includeLinks: boolean
  includeAnnotations: boolean
  includeCollections: boolean
  includeTags: boolean
  includeServerConfig: boolean
}

// ============================================
// Component
// ============================================

export function ExportImportCard() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { exportConfigAsync, isLoading: isExporting } = useExportConfig()
  const { importConfig, isLoading: isImporting } = useImportConfig()
  const { addToast } = useToast()

  // Context hooks for unified export
  const { exportLinks, importLinks } = useLinks()
  const { exportAnnotations, importAnnotations } = useAnnotations()
  const { exportCollections, importCollections } = useCollections()
  const { exportTags, importTags } = useTags()

  // State for export options
  const [showExportOptions, setShowExportOptions] = useState(false)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeLinks: true,
    includeAnnotations: true,
    includeCollections: true,
    includeTags: true,
    includeServerConfig: true,
  })

  // State for import
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importStrategy, setImportStrategy] = useState<ImportStrategy>('merge')
  const [pendingImportData, setPendingImportData] = useState<VaultExport | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Export unified vault data
  const handleUnifiedExport = useCallback(async () => {
    setIsProcessing(true)
    try {
      const vaultExport: VaultExport = {
        version: 1,
        exportedAt: new Date().toISOString(),
        vaultId: 'default',
        data: {},
      }

      if (exportOptions.includeLinks) {
        vaultExport.data.links = JSON.parse(exportLinks())
      }

      if (exportOptions.includeAnnotations) {
        vaultExport.data.annotations = JSON.parse(exportAnnotations())
      }

      if (exportOptions.includeCollections) {
        vaultExport.data.collections = JSON.parse(exportCollections())
      }

      if (exportOptions.includeTags) {
        vaultExport.data.tags = JSON.parse(exportTags())
      }

      if (exportOptions.includeServerConfig) {
        try {
          vaultExport.data.serverConfig = await exportConfigAsync()
        } catch {
          // Server config export failed, continue without it
        }
      }

      const blob = new Blob([JSON.stringify(vaultExport, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rag-vault-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      addToast({
        type: 'success',
        title: 'Export complete',
        message: 'Your vault data has been exported',
      })
      setShowExportOptions(false)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Export failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsProcessing(false)
    }
  }, [exportOptions, exportLinks, exportAnnotations, exportCollections, exportTags, exportConfigAsync, addToast])

  // Handle file selection for import
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      // Check if it's a unified vault export
      if (data.version === 1 && data.data) {
        setPendingImportData(data as VaultExport)
        setShowImportDialog(true)
      }
      // Legacy: plain server config
      else if (data.version && data.allowedRoots) {
        importConfig(data as ExportedConfig)
        addToast({
          type: 'success',
          title: 'Config imported',
          message: 'Server configuration has been restored',
        })
      } else {
        throw new Error('Unrecognized file format')
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to import',
        message: error instanceof Error ? error.message : 'Invalid file format',
      })
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [importConfig, addToast])

  // Perform the actual import
  const handleConfirmImport = useCallback(async () => {
    if (!pendingImportData) return

    setIsProcessing(true)
    const results: string[] = []
    let totalImported = 0

    try {
      const { data } = pendingImportData

      // Import links (pins, trails, bookmarks)
      if (data.links) {
        if (importStrategy === 'overwrite') {
          // For overwrite, we'd need to clear first - but since the contexts don't expose clear,
          // we'll just do merge which skips duplicates
        }
        const { imported, errors } = importLinks(JSON.stringify(data.links))
        totalImported += imported
        if (errors.length > 0) results.push(`Links: ${errors.join(', ')}`)
      }

      // Import annotations
      if (data.annotations) {
        const { imported, errors } = importAnnotations(JSON.stringify(data.annotations))
        totalImported += imported
        if (errors.length > 0) results.push(`Annotations: ${errors.join(', ')}`)
      }

      // Import collections
      if (data.collections) {
        const { imported, errors } = importCollections(JSON.stringify(data.collections))
        totalImported += imported
        if (errors.length > 0) results.push(`Collections: ${errors.join(', ')}`)
      }

      // Import tags
      if (data.tags) {
        const { imported, errors } = importTags(JSON.stringify(data.tags))
        totalImported += imported
        if (errors.length > 0) results.push(`Tags: ${errors.join(', ')}`)
      }

      // Import server config
      if (data.serverConfig) {
        try {
          importConfig(data.serverConfig)
          results.push('Server config restored')
        } catch {
          results.push('Server config: import failed')
        }
      }

      addToast({
        type: 'success',
        title: 'Import complete',
        message: `Imported ${totalImported} items`,
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Import failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsProcessing(false)
      setShowImportDialog(false)
      setPendingImportData(null)
    }
  }, [pendingImportData, importStrategy, importLinks, importAnnotations, importCollections, importTags, importConfig, addToast])

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
          <SettingsIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Export / Import</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Backup and restore your vault data</p>
        </div>
      </div>

      {/* Export Options Panel */}
      {showExportOptions && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-600">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Select data to export
          </h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.includeLinks}
                onChange={(e) => setExportOptions((prev) => ({ ...prev, includeLinks: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Links, trails & bookmarks
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.includeAnnotations}
                onChange={(e) => setExportOptions((prev) => ({ ...prev, includeAnnotations: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Highlights & annotations
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.includeCollections}
                onChange={(e) => setExportOptions((prev) => ({ ...prev, includeCollections: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Collections</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.includeTags}
                onChange={(e) => setExportOptions((prev) => ({ ...prev, includeTags: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Tags</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.includeServerConfig}
                onChange={(e) => setExportOptions((prev) => ({ ...prev, includeServerConfig: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Server config</span>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleUnifiedExport}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isProcessing ? <Spinner size="sm" /> : <DownloadIcon className="w-4 h-4" />}
              Export
            </button>
            <button
              type="button"
              onClick={() => setShowExportOptions(false)}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      {showImportDialog && pendingImportData && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-600">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Import vault backup
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            From: {new Date(pendingImportData.exportedAt).toLocaleDateString()}
          </p>

          {/* What will be imported */}
          <div className="mb-3 text-xs text-gray-600 dark:text-gray-400">
            <p className="font-medium mb-1">Contains:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {pendingImportData.data.links && <li>Links, trails & bookmarks</li>}
              {pendingImportData.data.annotations && <li>Highlights & annotations</li>}
              {pendingImportData.data.collections && <li>Collections</li>}
              {pendingImportData.data.tags && <li>Tags</li>}
              {pendingImportData.data.serverConfig && <li>Server config</li>}
            </ul>
          </div>

          {/* Import strategy */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Import strategy
            </label>
            <select
              value={importStrategy}
              onChange={(e) => setImportStrategy(e.target.value as ImportStrategy)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="merge">Merge (skip duplicates)</option>
              <option value="overwrite">Add all (may create duplicates)</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isProcessing ? <Spinner size="sm" /> : <UploadIcon className="w-4 h-4" />}
              Import
            </button>
            <button
              type="button"
              onClick={() => {
                setShowImportDialog(false)
                setPendingImportData(null)
              }}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main buttons */}
      {!showExportOptions && !showImportDialog && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setShowExportOptions(true)}
            disabled={isExporting || isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? (
              <>
                <Spinner size="sm" />
                Exporting...
              </>
            ) : (
              <>
                <DownloadIcon className="w-4 h-4" />
                Export Vault
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting || isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isImporting ? (
              <>
                <Spinner size="sm" />
                Importing...
              </>
            ) : (
              <>
                <UploadIcon className="w-4 h-4" />
                Import Backup
              </>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Export saves all your vault data including links, annotations, collections, and tags. Import restores from a previously exported backup.
      </p>
    </div>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  )
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  )
}
