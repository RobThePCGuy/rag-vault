// Config API client for database management

const API_BASE = '/api/v1/config'

/** Default request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 30_000

/**
 * Current database configuration
 */
export interface CurrentDatabaseConfig {
  dbPath: string
  modelName: string
  name: string
  documentCount: number
  chunkCount: number
}

/**
 * Database entry in recent list
 */
export interface DatabaseEntry {
  path: string
  name: string
  lastAccessed: string
  modelName?: string
}

/**
 * Scanned database result
 */
export interface ScannedDatabase {
  path: string
  name: string
  isKnown: boolean
}

/**
 * Directory entry for folder browser
 */
export interface DirectoryEntry {
  name: string
  path: string
  isDirectory: boolean
}

/**
 * Allowed roots response
 */
export interface AllowedRootsResponse {
  roots: string[]
  baseDir: string
  envRoots: string[]
  userRoots: string[]
}

/**
 * Available embedding model
 */
export interface AvailableModel {
  id: string
  name: string
  description: string
  isDefault: boolean
}

/**
 * Exported configuration
 */
export interface ExportedConfig {
  version: number
  exportedAt: string
  allowedRoots: string[]
  preferences?: Record<string, unknown>
}

/**
 * Browse directory response
 */
interface BrowseDirectoryResponse {
  entries: DirectoryEntry[]
  path: string
}

/**
 * API error response
 */
interface ApiError {
  error: string
}

/**
 * Generic fetch wrapper with error handling and timeout
 */
async function fetchConfigApi<T>(
  endpoint: string,
  options?: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
      signal: controller.signal,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error((data as ApiError).error || 'Request failed')
    }

    return data as T
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Get current database configuration
 */
export async function getCurrentConfig(): Promise<CurrentDatabaseConfig | null> {
  return fetchConfigApi<CurrentDatabaseConfig | null>('/current')
}

/**
 * Get list of recent databases
 */
export async function getRecentDatabases(): Promise<DatabaseEntry[]> {
  const data = await fetchConfigApi<{ databases: DatabaseEntry[] }>('/databases')
  return data.databases
}

/**
 * Switch to a different database
 */
export async function switchDatabase(dbPath: string): Promise<CurrentDatabaseConfig> {
  const data = await fetchConfigApi<{ success: boolean; config: CurrentDatabaseConfig }>(
    '/databases/switch',
    {
      method: 'POST',
      body: JSON.stringify({ dbPath }),
    }
  )
  return data.config
}

/**
 * Create a new database
 */
export async function createDatabase(
  dbPath: string,
  name?: string,
  modelName?: string
): Promise<CurrentDatabaseConfig> {
  const data = await fetchConfigApi<{ success: boolean; config: CurrentDatabaseConfig }>(
    '/databases/create',
    {
      method: 'POST',
      body: JSON.stringify({ dbPath, name, modelName }),
    }
  )
  return data.config
}

/**
 * Scan a directory for databases
 */
export async function scanForDatabases(scanPath: string): Promise<ScannedDatabase[]> {
  const data = await fetchConfigApi<{ databases: ScannedDatabase[] }>('/databases/scan', {
    method: 'POST',
    body: JSON.stringify({ scanPath }),
  })
  return data.databases
}

/**
 * Delete a database
 * @param dbPath - Path to the database to delete
 * @param deleteFiles - If true, also delete the database files from disk
 */
export async function deleteDatabase(
  dbPath: string,
  deleteFiles = false
): Promise<DatabaseEntry[]> {
  const data = await fetchConfigApi<{ success: boolean; databases: DatabaseEntry[] }>(
    '/databases',
    {
      method: 'DELETE',
      body: JSON.stringify({ dbPath, deleteFiles }),
    }
  )
  return data.databases
}

/**
 * Get allowed roots
 */
export async function getAllowedRoots(): Promise<AllowedRootsResponse> {
  return fetchConfigApi<AllowedRootsResponse>('/allowed-roots')
}

/**
 * Add an allowed root
 */
export async function addAllowedRoot(path: string): Promise<AllowedRootsResponse> {
  return fetchConfigApi<AllowedRootsResponse>('/allowed-roots', {
    method: 'POST',
    body: JSON.stringify({ path }),
  })
}

/**
 * Remove an allowed root
 */
export async function removeAllowedRoot(path: string): Promise<AllowedRootsResponse> {
  return fetchConfigApi<AllowedRootsResponse>('/allowed-roots', {
    method: 'DELETE',
    body: JSON.stringify({ path }),
  })
}

/**
 * Browse a directory
 */
export async function browseDirectory(
  path: string,
  showHidden = false
): Promise<BrowseDirectoryResponse> {
  const params = new URLSearchParams({ path })
  if (showHidden) {
    params.set('showHidden', 'true')
  }
  return fetchConfigApi<BrowseDirectoryResponse>(`/browse?${params.toString()}`)
}

/**
 * Get available embedding models
 */
export async function getAvailableModels(): Promise<AvailableModel[]> {
  const data = await fetchConfigApi<{ models: AvailableModel[] }>('/models')
  return data.models
}

/**
 * Export configuration
 */
export async function exportConfig(): Promise<ExportedConfig> {
  return fetchConfigApi<ExportedConfig>('/export')
}

/**
 * Import configuration
 */
export async function importConfig(config: ExportedConfig): Promise<AllowedRootsResponse> {
  return fetchConfigApi<AllowedRootsResponse>('/import', {
    method: 'POST',
    body: JSON.stringify({ config }),
  })
}

/**
 * Get current hybrid search weight
 * @returns Value between 0.0 (vector-only) and 1.0 (max keyword boost)
 */
export async function getHybridWeight(): Promise<number> {
  const data = await fetchConfigApi<{ weight: number }>('/hybrid-weight')
  return data.weight
}

/**
 * Set hybrid search weight
 * @param weight - Value between 0.0 (vector-only) and 1.0 (max keyword boost)
 */
export async function setHybridWeight(weight: number): Promise<void> {
  await fetchConfigApi<{ success: boolean; weight: number }>('/hybrid-weight', {
    method: 'PUT',
    body: JSON.stringify({ weight }),
  })
}
