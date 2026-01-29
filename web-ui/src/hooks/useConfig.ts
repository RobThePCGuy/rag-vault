import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addAllowedRoot,
  browseDirectory,
  createDatabase,
  exportConfig,
  getAllowedRoots,
  getAvailableModels,
  getCurrentConfig,
  getRecentDatabases,
  importConfig,
  removeAllowedRoot,
  scanForDatabases,
  switchDatabase,
} from '../api/config'
import type { ExportedConfig } from '../api/config'
import { useToast } from '../contexts/ToastContext'

/**
 * Hook for current database configuration
 * @param refetchInterval - Optional refetch interval in ms (0 = disabled)
 */
export function useCurrentConfig(refetchInterval = 0) {
  const {
    data: config,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['config', 'current'],
    queryFn: getCurrentConfig,
    refetchInterval: refetchInterval > 0 ? refetchInterval : false,
  })

  return {
    config,
    isLoading,
    error,
    refetch,
    isFetching,
  }
}

/**
 * Hook for recent databases list
 */
export function useRecentDatabases() {
  const {
    data: databases,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['config', 'databases'],
    queryFn: getRecentDatabases,
  })

  return {
    databases: databases || [],
    isLoading,
    error,
    refetch,
  }
}

/**
 * Hook for switching databases
 */
export function useSwitchDatabase() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const mutation = useMutation({
    mutationFn: (dbPath: string) => switchDatabase(dbPath),
    onSuccess: (_data, dbPath) => {
      // Invalidate all queries to refresh data from new database
      queryClient.invalidateQueries({ queryKey: ['config'] })
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['status'] })
      addToast({
        type: 'success',
        title: 'Database switched',
        message: `Now using ${dbPath.split('/').pop() || dbPath}`,
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to switch database',
        message: error.message,
      })
    },
  })

  return {
    switchDatabase: mutation.mutate,
    switchDatabaseAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  }
}

/**
 * Hook for creating a new database
 */
export function useCreateDatabase() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const mutation = useMutation({
    mutationFn: ({ dbPath, name, modelName }: { dbPath: string; name?: string; modelName?: string }) =>
      createDatabase(dbPath, name, modelName),
    onSuccess: (_data, variables) => {
      // Invalidate all queries to refresh data from new database
      queryClient.invalidateQueries({ queryKey: ['config'] })
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['status'] })
      addToast({
        type: 'success',
        title: 'Database created',
        message: `Created and switched to ${variables.dbPath.split('/').pop() || variables.dbPath}`,
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to create database',
        message: error.message,
      })
    },
  })

  return {
    createDatabase: mutation.mutate,
    createDatabaseAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  }
}

/**
 * Hook for scanning for databases
 */
export function useScanDatabases() {
  const { addToast } = useToast()

  const mutation = useMutation({
    mutationFn: (scanPath: string) => scanForDatabases(scanPath),
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Scan failed',
        message: error.message,
      })
    },
  })

  return {
    scan: mutation.mutate,
    scanAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  }
}

/**
 * Hook for allowed roots
 */
export function useAllowedRoots() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['config', 'allowed-roots'],
    queryFn: getAllowedRoots,
  })

  return {
    data,
    isLoading,
    error,
    refetch,
  }
}

/**
 * Hook for adding an allowed root
 */
export function useAddAllowedRoot() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const mutation = useMutation({
    mutationFn: (path: string) => addAllowedRoot(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'allowed-roots'] })
      addToast({
        type: 'success',
        title: 'Root added',
        message: 'Allowed root added successfully',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to add root',
        message: error.message,
      })
    },
  })

  return {
    addRoot: mutation.mutate,
    addRootAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  }
}

/**
 * Hook for removing an allowed root
 */
export function useRemoveAllowedRoot() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const mutation = useMutation({
    mutationFn: (path: string) => removeAllowedRoot(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'allowed-roots'] })
      addToast({
        type: 'success',
        title: 'Root removed',
        message: 'Allowed root removed successfully',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to remove root',
        message: error.message,
      })
    },
  })

  return {
    removeRoot: mutation.mutate,
    removeRootAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  }
}

/**
 * Hook for browsing directories
 */
export function useBrowseDirectory() {
  const { addToast } = useToast()

  const mutation = useMutation({
    mutationFn: ({ path, showHidden = false }: { path: string; showHidden?: boolean }) =>
      browseDirectory(path, showHidden),
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to browse directory',
        message: error.message,
      })
    },
  })

  return {
    browse: (path: string, showHidden = false) => mutation.mutate({ path, showHidden }),
    browseAsync: (path: string, showHidden = false) => mutation.mutateAsync({ path, showHidden }),
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  }
}

/**
 * Hook for available embedding models
 */
export function useAvailableModels() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['config', 'models'],
    queryFn: getAvailableModels,
  })

  return {
    models: data || [],
    isLoading,
    error,
  }
}

/**
 * Hook for exporting configuration
 */
export function useExportConfig() {
  const { addToast } = useToast()

  const mutation = useMutation({
    mutationFn: exportConfig,
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Configuration exported',
        message: 'Download should begin automatically',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to export configuration',
        message: error.message,
      })
    },
  })

  return {
    exportConfig: mutation.mutate,
    exportConfigAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
  }
}

/**
 * Hook for importing configuration
 */
export function useImportConfig() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const mutation = useMutation({
    mutationFn: (config: ExportedConfig) => importConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'allowed-roots'] })
      addToast({
        type: 'success',
        title: 'Configuration imported',
        message: 'Settings have been restored',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to import configuration',
        message: error.message,
      })
    },
  })

  return {
    importConfig: mutation.mutate,
    importConfigAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  }
}
