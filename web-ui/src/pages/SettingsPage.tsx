import { motion } from 'framer-motion'
import {
  AllowedRootsCard,
  CreateDatabaseCard,
  CurrentDatabaseCard,
  DatabaseSwitcher,
  ExportImportCard,
  HybridWeightCard,
  ScanDatabasesCard,
} from '../components/Settings'
import { Spinner } from '../components/ui'
import { usePreferences } from '../contexts/PreferencesContext'
import {
  useAddAllowedRoot,
  useAllowedRoots,
  useCreateDatabase,
  useCurrentConfig,
  useRecentDatabases,
  useRemoveAllowedRoot,
  useScanDatabases,
  useSwitchDatabase,
} from '../hooks'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
}

export function SettingsPage() {
  const { preferences } = usePreferences()
  const { config, isLoading: isLoadingConfig, error: configError, refetch, isFetching } = useCurrentConfig(
    preferences.statsRefreshInterval
  )
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
  const { data: allowedRootsData, isLoading: isLoadingRoots } = useAllowedRoots()
  const { addRoot, isLoading: isAddingRoot } = useAddAllowedRoot()
  const { removeRoot, isLoading: isRemovingRoot } = useRemoveAllowedRoot()

  const handleSwitch = (dbPath: string) => {
    switchDatabase(dbPath)
  }

  const handleCreate = (dbPath: string, _name?: string, modelName?: string) => {
    createDatabase({ dbPath, modelName })
  }

  const handleScan = (scanPath: string) => {
    scan(scanPath)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your RAG database configuration.</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoadingConfig || isFetching}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {isLoadingConfig || isFetching ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {isLoadingConfig && !config ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="text-gray-400" />
          <span className="ml-3 text-gray-500 dark:text-gray-400">Loading configuration...</span>
        </div>
      ) : configError ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
          <p className="font-medium">Error loading configuration</p>
          <p className="text-sm">{configError.message}</p>
        </div>
      ) : (
        <motion.div
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Current Database */}
          {config && (
            <motion.div variants={itemVariants}>
              <CurrentDatabaseCard
                config={config}
                onRefresh={() => refetch()}
                isFetching={isFetching}
              />
            </motion.div>
          )}

          {/* Recent Databases / Switcher */}
          {!isLoadingDatabases && (
            <motion.div variants={itemVariants}>
              <DatabaseSwitcher
                databases={databases}
                currentDbPath={config?.dbPath}
                onSwitch={handleSwitch}
                isLoading={isSwitching}
              />
            </motion.div>
          )}

          {/* Create New Database */}
          <motion.div variants={itemVariants}>
            <CreateDatabaseCard onCreate={handleCreate} isLoading={isCreating} error={createError} />
          </motion.div>

          {/* Scan for Databases */}
          <motion.div variants={itemVariants}>
            <ScanDatabasesCard
              onScan={handleScan}
              onSwitch={handleSwitch}
              isScanning={isScanning}
              isSwitching={isSwitching}
              scanResults={scanResults}
              error={scanError}
              onReset={resetScan}
            />
          </motion.div>

          {/* Allowed Scan Roots */}
          <motion.div variants={itemVariants}>
            <AllowedRootsCard
              data={allowedRootsData}
              isLoading={isLoadingRoots}
              onAdd={addRoot}
              onRemove={removeRoot}
              isAdding={isAddingRoot}
              isRemoving={isRemovingRoot}
            />
          </motion.div>

          {/* Hybrid Search Weight */}
          <motion.div variants={itemVariants}>
            <HybridWeightCard />
          </motion.div>

          {/* Export / Import */}
          <motion.div variants={itemVariants}>
            <ExportImportCard />
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
