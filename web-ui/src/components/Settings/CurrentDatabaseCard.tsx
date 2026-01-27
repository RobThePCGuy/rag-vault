import type { CurrentDatabaseConfig } from '../../api/config'

interface CurrentDatabaseCardProps {
  config: CurrentDatabaseConfig
}

export function CurrentDatabaseCard({ config }: CurrentDatabaseCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-green-50 rounded-lg">
          <DatabaseIcon className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-gray-900">Current Database</h2>
          <p className="text-sm text-gray-500">Active RAG database</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-gray-500">Name</span>
          <span className="font-medium text-gray-900">{config.name}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-gray-500">Path</span>
          <span className="font-mono text-sm text-gray-900 max-w-xs truncate" title={config.dbPath}>
            {config.dbPath}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-gray-500">Model</span>
          <span className="font-mono text-sm text-gray-900">{config.modelName}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-gray-500">Documents</span>
          <span className="font-medium text-gray-900">{config.documentCount}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-500">Chunks</span>
          <span className="font-medium text-gray-900">{config.chunkCount}</span>
        </div>
      </div>
    </div>
  )
}

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
      />
    </svg>
  )
}
