import { useState } from 'react'
import type { ScannedDatabase } from '../../api/config'
import { Spinner } from '../ui'

interface ScanDatabasesCardProps {
  onScan: (scanPath: string) => void
  onSwitch: (dbPath: string) => void
  isScanning: boolean
  isSwitching: boolean
  scanResults: ScannedDatabase[] | undefined
  error: Error | null
  onReset: () => void
}

export function ScanDatabasesCard({
  onScan,
  onSwitch,
  isScanning,
  isSwitching,
  scanResults,
  error,
  onReset,
}: ScanDatabasesCardProps) {
  const [scanPath, setScanPath] = useState('')
  const [switchingPath, setSwitchingPath] = useState<string | null>(null)

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault()
    if (scanPath.trim()) {
      onScan(scanPath.trim())
    }
  }

  const handleSwitch = (dbPath: string) => {
    setSwitchingPath(dbPath)
    onSwitch(dbPath)
  }

  const handleReset = () => {
    setScanPath('')
    onReset()
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-50 rounded-lg">
          <SearchIcon className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-gray-900">Scan for Databases</h2>
          <p className="text-sm text-gray-500">Find existing RAG databases</p>
        </div>
      </div>

      <form onSubmit={handleScan} className="space-y-4">
        <div>
          <label htmlFor="scanPath" className="block text-sm font-medium text-gray-700 mb-1">
            Directory to Scan
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="scanPath"
              value={scanPath}
              onChange={(e) => setScanPath(e.target.value)}
              placeholder="/path/to/scan"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              disabled={isScanning}
            />
            <button
              type="submit"
              disabled={isScanning || !scanPath.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isScanning ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
                  Scanning...
                </span>
              ) : (
                'Scan'
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Searches the directory and one level of subdirectories
          </p>
        </div>
      </form>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error.message}
        </div>
      )}

      {scanResults && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              Found {scanResults.length} database{scanResults.length !== 1 ? 's' : ''}
            </h3>
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear results
            </button>
          </div>

          {scanResults.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">No databases found in this directory.</p>
          ) : (
            <div className="space-y-2">
              {scanResults.map((db) => (
                <div
                  key={db.path}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{db.name}</p>
                      {db.isKnown && (
                        <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                          Known
                        </span>
                      )}
                    </div>
                    <p
                      className="text-sm text-gray-500 font-mono truncate max-w-xs"
                      title={db.path}
                    >
                      {db.path}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSwitch(db.path)}
                    disabled={isSwitching}
                    className="ml-4 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSwitching && switchingPath === db.path ? (
                      <span className="flex items-center gap-2">
                        <Spinner size="sm" />
                        Switching...
                      </span>
                    ) : (
                      'Use'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  )
}
