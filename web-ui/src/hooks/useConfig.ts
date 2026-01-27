import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createDatabase,
  getCurrentConfig,
  getRecentDatabases,
  scanForDatabases,
  switchDatabase,
} from '../api/config'
import { useToast } from '../contexts/ToastContext'

/**
 * Hook for current database configuration
 */
export function useCurrentConfig() {
  const {
    data: config,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['config', 'current'],
    queryFn: getCurrentConfig,
  })

  return {
    config,
    isLoading,
    error,
    refetch,
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
    mutationFn: ({ dbPath, name }: { dbPath: string; name?: string }) =>
      createDatabase(dbPath, name),
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
