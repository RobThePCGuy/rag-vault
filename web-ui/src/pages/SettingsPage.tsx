import {
  CreateDatabaseCard,
  CurrentDatabaseCard,
  DatabaseSwitcher,
  ScanDatabasesCard,
} from '../components/Settings'
import { Spinner } from '../components/ui'
import {
  useCreateDatabase,
  useCurrentConfig,
  useRecentDatabases,
  useScanDatabases,
  useSwitchDatabase,
} from '../hooks'

export function SettingsPage() {
  const { config, isLoading: isLoadingConfig, error: configError, refetch } = useCurrentConfig()
  const { databases, isLoading: isLoadingDatabases } = useRecentDatabases()
  const { switchDatabase, isLoading: isSwitching } = useSwitchDatabase()
  const { createDatabase, isLoading: isCreating, error: createError } = useCreateDatabase()
  const {
    scan,
    isLoading: isScanning,
    data: scanResults,
    error: scanError,
    reset: resetScan,
  } = useScanDatabases()

  const handleSwitch = (dbPath: string) => {
    switchDatabase(dbPath)
  }

  const handleCreate = (dbPath: string) => {
    createDatabase({ dbPath })
  }

  const handleScan = (scanPath: string) => {
    scan(scanPath)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your RAG database configuration.</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoadingConfig}
          className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {isLoadingConfig ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {isLoadingConfig && !config ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="text-gray-400" />
          <span className="ml-3 text-gray-500">Loading configuration...</span>
        </div>
      ) : configError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading configuration</p>
          <p className="text-sm">{configError.message}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current Database */}
          {config && <CurrentDatabaseCard config={config} />}

          {/* Recent Databases / Switcher */}
          {!isLoadingDatabases && (
            <DatabaseSwitcher
              databases={databases}
              currentDbPath={config?.dbPath}
              onSwitch={handleSwitch}
              isLoading={isSwitching}
            />
          )}

          {/* Create New Database */}
          <CreateDatabaseCard onCreate={handleCreate} isLoading={isCreating} error={createError} />

          {/* Scan for Databases */}
          <ScanDatabasesCard
            onScan={handleScan}
            onSwitch={handleSwitch}
            isScanning={isScanning}
            isSwitching={isSwitching}
            scanResults={scanResults}
            error={scanError}
            onReset={resetScan}
          />
        </div>
      )}
    </div>
  )
}
