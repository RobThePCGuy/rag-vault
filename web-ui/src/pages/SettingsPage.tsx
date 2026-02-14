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
import { type WsTabItem, WsTabs } from '../components/ws'
import { usePreferences } from '../contexts/PreferencesContext'
import {
  useAddAllowedRoot,
  useAllowedRoots,
  useCreateDatabase,
  useCurrentConfig,
  useDeleteDatabase,
  useLocalStorage,
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
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  },
}

const settingsTabs: WsTabItem[] = [
  { id: 'database', label: 'Database' },
  { id: 'search', label: 'Search' },
  { id: 'data', label: 'Data' },
]

export function SettingsPage() {
  const [activeTab, setActiveTab] = useLocalStorage('settings-active-tab', 'database')
  const { preferences } = usePreferences()
  const {
    config,
    isLoading: isLoadingConfig,
    error: configError,
    refetch,
    isFetching,
  } = useCurrentConfig(preferences.statsRefreshInterval)
  const { databases, isLoading: isLoadingDatabases } = useRecentDatabases()
  const { switchDatabase, isLoading: isSwitching } = useSwitchDatabase()
  const { deleteDatabase, isLoading: isDeleting } = useDeleteDatabase()
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

  const handleDelete = async (dbPath: string, deleteFiles: boolean) => {
    await new Promise<void>((resolve, reject) => {
      deleteDatabase(
        { dbPath, deleteFiles },
        {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        }
      )
    })
  }

  const handleCreate = (dbPath: string, _name?: string, modelName?: string) => {
    createDatabase({ dbPath, modelName })
  }

  const handleScan = (scanPath: string) => {
    scan(scanPath)
  }

  return (
    <div className="ws-page max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="ws-page-title text-2xl font-bold mb-2">Settings</h1>
          <p style={{ color: 'var(--ws-text-secondary)' }}>
            Manage your RAG database configuration.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoadingConfig || isFetching}
          className="ws-button px-4 py-2 text-sm rounded-lg transition-colors"
          data-variant="default"
        >
          {isLoadingConfig || isFetching ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {isLoadingConfig && !config ? (
        <div className="flex items-center justify-center py-12">
          <span style={{ color: 'var(--ws-text-faint)' }}><Spinner /></span>
          <span className="ml-3" style={{ color: 'var(--ws-text-muted)' }}>Loading configuration...</span>
        </div>
      ) : configError ? (
        <div className="ws-error-box rounded-lg">
          <p className="font-medium">Error loading configuration</p>
          <p className="text-sm">{configError.message}</p>
        </div>
      ) : (
        <>
        <WsTabs
          tabs={settingsTabs}
          activeId={activeTab}
          onSelect={setActiveTab}
          variant="underline"
          className="mb-6"
        />

        {activeTab === 'database' && (
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
                  onDelete={handleDelete}
                  isLoading={isSwitching || isDeleting}
                />
              </motion.div>
            )}

            {/* Create New Database */}
            <motion.div variants={itemVariants}>
              <CreateDatabaseCard
                onCreate={handleCreate}
                isLoading={isCreating}
                error={createError}
              />
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
          </motion.div>
        )}

        {activeTab === 'search' && (
          <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
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
          </motion.div>
        )}

        {activeTab === 'data' && (
          <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Export / Import */}
            <motion.div variants={itemVariants}>
              <ExportImportCard />
            </motion.div>
          </motion.div>
        )}
        </>
      )}
    </div>
  )
}
