// DatabaseManager - Manages RAG database lifecycle and configuration

import { existsSync, realpathSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import type { RAGServer, RAGServerConfig } from '../server/index.js'
import { RecentDatabasesFileSchema, StatusResponseSchema } from '../server/schemas.js'
import { atomicWriteFile } from '../utils/file-utils.js'

// ============================================
// Constants
// ============================================

/** Config directory for rag-vault */
const CONFIG_DIR = path.join(homedir(), '.rag-vault')

/** Recent databases file path */
const RECENT_DBS_FILE = path.join(CONFIG_DIR, 'recent-dbs.json')

/** User-added allowed roots file path */
const ALLOWED_ROOTS_FILE = path.join(CONFIG_DIR, 'allowed-roots.json')

/** LanceDB directory name (indicator of a valid database) */
const LANCEDB_DIR_NAME = 'chunks.lance'

/** Maximum number of recent databases to track */
const MAX_RECENT_DATABASES = 10

/**
 * Get allowed scan roots from environment variable or default to home directory
 * ALLOWED_SCAN_ROOTS: comma-separated list of absolute paths
 */
function getEnvAllowedScanRoots(): string[] {
  const envRoots = process.env['ALLOWED_SCAN_ROOTS']
  if (envRoots) {
    return envRoots.split(',').map((p) => path.resolve(p.trim()))
  }
  // Default: only allow scanning within home directory
  return [homedir()]
}

/**
 * Read user-added allowed roots from config file
 * Note: This is async to avoid blocking the event loop
 */
async function readUserAllowedRoots(): Promise<string[]> {
  if (!existsSync(ALLOWED_ROOTS_FILE)) {
    return []
  }
  try {
    const content = JSON.parse(await readFile(ALLOWED_ROOTS_FILE, 'utf-8'))
    if (Array.isArray(content.roots)) {
      return content.roots.map((p: string) => path.resolve(p))
    }
    return []
  } catch {
    return []
  }
}

/**
 * Write user-added allowed roots to config file
 * Uses atomic write to prevent race conditions
 */
async function writeUserAllowedRoots(roots: string[]): Promise<void> {
  await atomicWriteFile(ALLOWED_ROOTS_FILE, JSON.stringify({ roots }, null, 2))
}

/**
 * Check if a path is within a set of allowed roots
 */
function isPathWithinRoots(targetPath: string, allowedRoots: string[]): boolean {
  let resolvedPath: string

  try {
    // Resolve to absolute path and resolve symlinks
    resolvedPath = existsSync(targetPath) ? realpathSync(targetPath) : path.resolve(targetPath)
  } catch {
    // If we can't resolve the path, reject it
    return false
  }

  // Check if the resolved path is within any allowed root
  return allowedRoots.some((root) => {
    const normalizedRoot = path.normalize(root)
    const normalizedTarget = path.normalize(resolvedPath)
    // Ensure exact prefix match (avoid /home/user matching /home/username)
    return (
      normalizedTarget === normalizedRoot || normalizedTarget.startsWith(normalizedRoot + path.sep)
    )
  })
}

/**
 * Expand tilde (~) in path to home directory
 */
function expandTilde(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(homedir(), filePath.slice(2))
  }
  if (filePath === '~') {
    return homedir()
  }
  return filePath
}

// ============================================
// Type Definitions
// ============================================

/**
 * Database entry in recent databases list
 */
export interface DatabaseEntry {
  /** Absolute path to the database directory */
  path: string
  /** Human-readable name (derived from path) */
  name: string
  /** Last access timestamp (ISO 8601) */
  lastAccessed: string
  /** Model name used with this database */
  modelName?: string | undefined
}

/**
 * Recent databases file structure
 */
interface RecentDatabasesFile {
  version: number
  databases: DatabaseEntry[]
}

/**
 * Current database configuration (extended with stats)
 */
export interface CurrentDatabaseConfig {
  /** Database path */
  dbPath: string
  /** Model name */
  modelName: string
  /** Human-readable database name */
  name: string
  /** Document count */
  documentCount: number
  /** Chunk count */
  chunkCount: number
}

/**
 * Create database options
 */
export interface CreateDatabaseOptions {
  /** Path where to create the database */
  dbPath: string
  /** Optional custom name */
  name?: string | undefined
  /** Optional model name to use */
  modelName?: string | undefined
}

/**
 * Available embedding model
 */
export interface AvailableModel {
  /** Model ID */
  id: string
  /** Human-readable name */
  name: string
  /** Model description */
  description: string
  /** Whether this is the default model */
  isDefault: boolean
}

/**
 * Preset embedding models
 */
export const AVAILABLE_MODELS: AvailableModel[] = [
  {
    id: 'Xenova/all-MiniLM-L6-v2',
    name: 'all-MiniLM-L6-v2',
    description: 'Fast, general-purpose model (384 dimensions)',
    isDefault: true,
  },
  {
    id: 'Xenova/all-mpnet-base-v2',
    name: 'all-mpnet-base-v2',
    description: 'Higher quality, slower (768 dimensions)',
    isDefault: false,
  },
  {
    id: 'Xenova/bge-small-en-v1.5',
    name: 'bge-small-en-v1.5',
    description: 'Optimized for retrieval (384 dimensions)',
    isDefault: false,
  },
  {
    id: 'onnx-community/embeddinggemma-300m-ONNX',
    name: 'embeddinggemma-300M',
    description: 'High-quality multilingual (300M params, 100+ languages)',
    isDefault: false,
  },
  {
    id: 'sentence-transformers/allenai-specter',
    name: 'allenai-specter',
    description: 'Optimized for scientific papers and citations',
    isDefault: false,
  },
  {
    id: 'jinaai/jina-embeddings-v2-base-code',
    name: 'jina-code-v2',
    description: 'Optimized for code and technical documentation',
    isDefault: false,
  },
]

/**
 * Export/import configuration structure
 */
export interface ExportedConfig {
  version: number
  exportedAt: string
  allowedRoots: string[]
  preferences?: Record<string, unknown>
}

/**
 * Scan result for a discovered database
 */
export interface ScannedDatabase {
  /** Absolute path to the database */
  path: string
  /** Human-readable name */
  name: string
  /** Whether this database is already in recent list */
  isKnown: boolean
}

/**
 * Directory entry for folder browser
 */
export interface DirectoryEntry {
  /** Entry name */
  name: string
  /** Full path */
  path: string
  /** Whether this is a directory */
  isDirectory: boolean
}

/**
 * Allowed roots response
 */
export interface AllowedRootsResponse {
  /** All effective allowed roots */
  roots: string[]
  /** Current base directory */
  baseDir: string
  /** Environment-based roots */
  envRoots: string[]
  /** User-added roots (can be removed) */
  userRoots: string[]
}

// ============================================
// DatabaseManager Class
// ============================================

/**
 * DatabaseManager handles RAG database lifecycle management
 *
 * Responsibilities:
 * - Track current database connection
 * - Hot-swap between databases
 * - Persist recent databases list
 * - Discover databases by scanning directories
 */
export class DatabaseManager {
  private currentServer: RAGServer | null = null
  private currentConfig: RAGServerConfig | null = null
  private serverFactory: (config: RAGServerConfig) => RAGServer
  private baseConfig: Omit<RAGServerConfig, 'dbPath'>
  private switchPromise: Promise<void> | null = null

  constructor(
    serverFactory: (config: RAGServerConfig) => RAGServer,
    baseConfig: Omit<RAGServerConfig, 'dbPath'>
  ) {
    this.serverFactory = serverFactory
    this.baseConfig = baseConfig
  }

  /**
   * Initialize with a database path
   */
  async initialize(dbPath: string): Promise<void> {
    await this.ensureConfigDir()

    // Look up stored model name from recent databases
    const recentDbs = await this.getRecentDatabases()
    const storedEntry = recentDbs.find((db) => db.path === dbPath)
    const effectiveModelName = storedEntry?.modelName || this.baseConfig.modelName

    const config: RAGServerConfig = {
      ...this.baseConfig,
      dbPath,
      modelName: effectiveModelName,
    }

    this.currentServer = this.serverFactory(config)
    this.currentConfig = config
    await this.currentServer.initialize()

    // Add to recent databases with the model name
    await this.addToRecent(dbPath, effectiveModelName)
  }

  /**
   * Get current RAG server instance
   */
  getServer(): RAGServer {
    if (!this.currentServer) {
      throw new Error('DatabaseManager not initialized. Call initialize() first.')
    }
    return this.currentServer
  }

  /**
   * Get current database configuration with stats
   */
  async getCurrentConfig(): Promise<CurrentDatabaseConfig | null> {
    if (!this.currentServer || !this.currentConfig) {
      return null
    }

    const serverConfig = this.currentServer.getConfig()
    const statusResult = await this.currentServer.handleStatus()

    // Safely extract text from response
    // The return type is { content: [{ type: 'text'; text: string }] }
    const firstContent = statusResult.content[0]
    if (typeof firstContent.text !== 'string') {
      throw new Error('Malformed server response: missing text in content')
    }

    // Parse and validate status response with Zod
    const parsed = StatusResponseSchema.safeParse(JSON.parse(firstContent.text))
    if (!parsed.success) {
      throw new Error(`Invalid status response: ${parsed.error.message}`)
    }
    const status = parsed.data

    return {
      dbPath: serverConfig.dbPath,
      modelName: serverConfig.modelName,
      name: this.getNameFromPath(serverConfig.dbPath),
      documentCount: status.documentCount,
      chunkCount: status.chunkCount,
    }
  }

  /**
   * Switch to a different database
   *
   * Uses promise-based mutex to prevent race conditions from concurrent switch attempts.
   */
  async switchDatabase(newDbPath: string): Promise<void> {
    // Prevent concurrent switches using promise-based mutex
    if (this.switchPromise) {
      throw new Error('Database switch already in progress')
    }

    // Expand tilde to home directory
    const resolvedPath = expandTilde(newDbPath)

    await this.assertPathAllowedForMutation('Switch path', resolvedPath)

    // Validate the new path exists and is a valid database
    if (!existsSync(resolvedPath)) {
      throw new Error(`Database path does not exist: ${resolvedPath}`)
    }

    const lanceDbPath = path.join(resolvedPath, LANCEDB_DIR_NAME)
    if (!existsSync(lanceDbPath)) {
      throw new Error(`Invalid database: ${resolvedPath} (missing LanceDB data)`)
    }

    // Look up stored model name from recent databases
    const recentDbs = await this.getRecentDatabases()
    const storedEntry = recentDbs.find((db) => db.path === resolvedPath)
    const modelName = storedEntry?.modelName

    // Set promise atomically before any async operations
    this.switchPromise = this.performSwitch(resolvedPath, modelName).finally(() => {
      this.switchPromise = null
    })

    return this.switchPromise
  }

  /**
   * Internal method to perform the actual database switch
   */
  private async performSwitch(resolvedPath: string, modelName?: string): Promise<void> {
    // Close current server
    if (this.currentServer) {
      await this.currentServer.close()
      this.currentServer = null
      this.currentConfig = null
    }

    // Use stored model name if available, otherwise fall back to baseConfig
    const effectiveModelName = modelName || this.baseConfig.modelName

    // Create new server with new path and correct model
    const config: RAGServerConfig = {
      ...this.baseConfig,
      dbPath: resolvedPath,
      modelName: effectiveModelName,
    }

    const newServer = this.serverFactory(config)

    try {
      await newServer.initialize()

      // Success - update state
      this.currentServer = newServer
      this.currentConfig = config

      // Update recent databases with the model name
      await this.addToRecent(resolvedPath, effectiveModelName)

      console.log(`Switched to database: ${resolvedPath} (model: ${effectiveModelName})`)
    } catch (error) {
      // Cleanup new server on failure
      try {
        await newServer.close()
      } catch {
        // Ignore cleanup errors
      }

      // Re-throw the original error
      throw error
    }
  }

  /**
   * Create a new database
   */
  async createDatabase(options: CreateDatabaseOptions): Promise<void> {
    // Expand tilde to home directory
    const resolvedPath = expandTilde(options.dbPath)

    await this.assertPathAllowedForMutation('Create path', resolvedPath)

    // Check if path already exists
    if (existsSync(resolvedPath)) {
      const lanceDbPath = path.join(resolvedPath, LANCEDB_DIR_NAME)
      if (existsSync(lanceDbPath)) {
        throw new Error(`Database already exists at: ${resolvedPath}`)
      }
    }

    // Create the directory if needed
    await mkdir(resolvedPath, { recursive: true })

    // Switch to the new database (it will be empty initially)
    // The VectorStore will create the table on first data insertion
    await this.switchToNewDatabase(resolvedPath, options.modelName)
  }

  /**
   * Switch to a new (possibly empty) database
   *
   * Uses promise-based mutex to prevent race conditions from concurrent switch attempts.
   */
  private async switchToNewDatabase(newDbPath: string, modelName?: string): Promise<void> {
    if (this.switchPromise) {
      throw new Error('Database switch already in progress')
    }

    // Set promise atomically before any async operations
    this.switchPromise = this.performSwitchToNew(newDbPath, modelName).finally(() => {
      this.switchPromise = null
    })

    return this.switchPromise
  }

  /**
   * Internal method to perform the actual switch to a new database
   */
  private async performSwitchToNew(newDbPath: string, modelName?: string): Promise<void> {
    // Close current server
    if (this.currentServer) {
      await this.currentServer.close()
      this.currentServer = null
      this.currentConfig = null
    }

    // Use provided modelName or fall back to baseConfig
    const effectiveModelName = modelName || this.baseConfig.modelName

    const config: RAGServerConfig = {
      ...this.baseConfig,
      dbPath: newDbPath,
      modelName: effectiveModelName,
    }

    const newServer = this.serverFactory(config)

    try {
      await newServer.initialize()

      // Success - update state
      this.currentServer = newServer
      this.currentConfig = config

      await this.addToRecent(newDbPath, effectiveModelName)

      console.log(`Created and switched to database: ${newDbPath} (model: ${effectiveModelName})`)
    } catch (error) {
      // Cleanup new server on failure
      try {
        await newServer.close()
      } catch {
        // Ignore cleanup errors
      }

      // Re-throw the original error
      throw error
    }
  }

  /**
   * Get list of recent databases
   *
   * Handles errors appropriately:
   * - File not found: Normal case, returns empty array
   * - Parse/validation error: Logs error but returns empty array to allow recovery
   */
  async getRecentDatabases(): Promise<DatabaseEntry[]> {
    await this.ensureConfigDir()

    if (!existsSync(RECENT_DBS_FILE)) {
      return []
    }

    try {
      const content = await readFile(RECENT_DBS_FILE, 'utf-8')
      const jsonData = JSON.parse(content)

      // Validate with Zod schema
      const parsed = RecentDatabasesFileSchema.safeParse(jsonData)
      if (!parsed.success) {
        console.error('Recent databases file has invalid format:', parsed.error.message)
        console.error('File will be overwritten on next database access.')
        return []
      }

      // Filter out databases that no longer exist
      const validDatabases = parsed.data.databases.filter((db) => existsSync(db.path))

      return validDatabases
    } catch (error) {
      // Differentiate between file-not-found and other errors
      const nodeError = error as NodeJS.ErrnoException
      if (nodeError.code === 'ENOENT') {
        // File was deleted between check and read - OK
        return []
      }

      // JSON parse error or other issues - log but allow recovery
      console.error('Failed to read recent databases (file may be corrupted):', error)
      console.error('File will be overwritten on next database access.')
      return []
    }
  }

  /**
   * Get the base directory (dbPath directory)
   */
  getBaseDir(): string {
    return this.currentConfig ? path.dirname(this.currentConfig.dbPath) : homedir()
  }

  /**
   * Get all effective allowed roots (env + baseDir + user-added)
   */
  async getEffectiveAllowedRoots(): Promise<string[]> {
    const envRoots = getEnvAllowedScanRoots()
    const userRoots = await readUserAllowedRoots()
    const baseDir = this.getBaseDir()

    // Combine all sources and deduplicate
    const allRoots = new Set([...envRoots, baseDir, ...userRoots])
    return Array.from(allRoots)
  }

  /**
   * Check if a path is within allowed roots
   */
  async isPathAllowed(targetPath: string): Promise<boolean> {
    const allowedRoots = await this.getEffectiveAllowedRoots()
    return isPathWithinRoots(targetPath, allowedRoots)
  }

  /**
   * Get allowed roots info for API response
   */
  async getAllowedRootsInfo(): Promise<AllowedRootsResponse> {
    const [roots, userRoots] = await Promise.all([
      this.getEffectiveAllowedRoots(),
      readUserAllowedRoots(),
    ])
    return {
      roots,
      baseDir: this.getBaseDir(),
      envRoots: getEnvAllowedScanRoots(),
      userRoots,
    }
  }

  /**
   * Add a user-allowed root
   */
  async addUserAllowedRoot(rootPath: string): Promise<void> {
    const resolved = path.resolve(expandTilde(rootPath))
    if (!existsSync(resolved)) {
      throw new Error(`Path does not exist: ${resolved}`)
    }
    const roots = await readUserAllowedRoots()
    if (!roots.includes(resolved)) {
      roots.push(resolved)
      await writeUserAllowedRoots(roots)
    }
  }

  /**
   * Remove a user-allowed root
   */
  async removeUserAllowedRoot(rootPath: string): Promise<void> {
    const resolved = path.resolve(expandTilde(rootPath))
    const roots = await readUserAllowedRoots()
    const filtered = roots.filter((r) => r !== resolved)
    await writeUserAllowedRoots(filtered)
  }

  /**
   * List directory contents for folder browser
   * @param dirPath - The directory path to list
   * @param showHidden - Whether to include hidden files (starting with .)
   */
  async listDirectory(dirPath: string, showHidden = false): Promise<DirectoryEntry[]> {
    const resolved = path.resolve(expandTilde(dirPath))

    // Allow browsing root directories and paths within allowed roots
    // For security, we still allow browsing but the user can only add paths as allowed roots
    if (!existsSync(resolved)) {
      throw new Error(`Directory does not exist: ${resolved}`)
    }

    const dirStat = await stat(resolved)
    if (!dirStat.isDirectory()) {
      throw new Error(`Path is not a directory: ${resolved}`)
    }

    const entries = await readdir(resolved, { withFileTypes: true })
    const results: DirectoryEntry[] = []

    for (const entry of entries) {
      // Skip hidden files/directories unless showHidden is true
      if (!showHidden && entry.name.startsWith('.')) continue

      results.push({
        name: entry.name,
        path: path.join(resolved, entry.name),
        isDirectory: entry.isDirectory(),
      })
    }

    // Sort: directories first, then alphabetically
    results.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })

    return results
  }

  /**
   * Scan a directory for LanceDB databases
   *
   * Security: Only scans within allowed roots (ALLOWED_SCAN_ROOTS env var or home directory)
   * to prevent path traversal attacks.
   *
   * @param scanPath - The path to scan
   * @param maxDepth - Maximum depth to scan (default 2)
   */
  async scanForDatabases(scanPath: string, maxDepth = 2): Promise<ScannedDatabase[]> {
    // Expand tilde to home directory
    const resolvedPath = expandTilde(scanPath)

    // Security: Validate path is within allowed roots
    if (!(await this.isPathAllowed(resolvedPath))) {
      const allowedRoots = await this.getEffectiveAllowedRoots()
      throw new Error(
        `Scan path "${resolvedPath}" is outside allowed roots. ` +
          `Allowed: ${allowedRoots.join(', ')}. ` +
          `Add this path to allowed roots or set ALLOWED_SCAN_ROOTS environment variable.`
      )
    }

    const results: ScannedDatabase[] = []
    const recentDbs = await this.getRecentDatabases()
    const knownPaths = new Set(recentDbs.map((db) => db.path))

    if (!existsSync(resolvedPath)) {
      throw new Error(`Scan path does not exist: ${resolvedPath}`)
    }

    const scanStat = await stat(resolvedPath)
    if (!scanStat.isDirectory()) {
      throw new Error(`Scan path is not a directory: ${resolvedPath}`)
    }

    // Recursive scan function with depth tracking
    const scanDirectory = async (dirPath: string, currentDepth: number): Promise<void> => {
      // Check if this directory is a database
      const lanceDbPath = path.join(dirPath, LANCEDB_DIR_NAME)
      if (existsSync(lanceDbPath)) {
        results.push({
          path: dirPath,
          name: this.getNameFromPath(dirPath),
          isKnown: knownPaths.has(dirPath),
        })
        // Don't scan subdirectories of a database
        return
      }

      // Stop if we've reached max depth
      if (currentDepth >= maxDepth) return

      try {
        const entries = await readdir(dirPath, { withFileTypes: true })

        for (const entry of entries) {
          if (!entry.isDirectory()) continue
          // Skip hidden directories
          if (entry.name.startsWith('.')) continue

          const subPath = path.join(dirPath, entry.name)
          await scanDirectory(subPath, currentDepth + 1)
        }
      } catch (error) {
        // Ignore permission errors on individual directories
        console.error(`Failed to scan directory ${dirPath}:`, error)
      }
    }

    await scanDirectory(resolvedPath, 0)

    return results
  }

  /**
   * Get available embedding models
   */
  getAvailableModels(): AvailableModel[] {
    return AVAILABLE_MODELS
  }

  /**
   * Export configuration (allowed roots)
   */
  async exportConfig(): Promise<ExportedConfig> {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      allowedRoots: await readUserAllowedRoots(),
    }
  }

  /**
   * Import configuration (allowed roots)
   */
  async importConfig(config: ExportedConfig): Promise<void> {
    if (config.version !== 1) {
      throw new Error(`Unsupported config version: ${config.version}`)
    }

    if (!Array.isArray(config.allowedRoots)) {
      throw new Error('Invalid config: allowedRoots must be an array')
    }

    // Validate each path exists before importing
    const validRoots: string[] = []
    for (const root of config.allowedRoots) {
      const resolved = path.resolve(expandTilde(root))
      if (existsSync(resolved)) {
        validRoots.push(resolved)
      } else {
        console.warn(`Skipping non-existent root during import: ${resolved}`)
      }
    }

    await writeUserAllowedRoots(validRoots)
  }

  /**
   * Get the current hybrid search weight
   * @returns Value between 0.0 (vector-only) and 1.0 (max keyword boost)
   */
  getHybridWeight(): number {
    if (!this.currentServer) {
      return 0.6 // Default value
    }
    return this.currentServer.getHybridWeight()
  }

  /**
   * Set the hybrid search weight at runtime
   * @param weight - Value between 0.0 (vector-only) and 1.0 (max keyword boost)
   */
  setHybridWeight(weight: number): void {
    if (!this.currentServer) {
      throw new Error('DatabaseManager not initialized. Call initialize() first.')
    }
    this.currentServer.setHybridWeight(weight)
  }

  /**
   * Add a database to recent list
   * Uses atomic write to prevent read-modify-write race conditions
   */
  private async addToRecent(dbPath: string, modelName?: string): Promise<void> {
    const databases = await this.getRecentDatabases()

    // Remove existing entry for this path
    const filtered = databases.filter((db) => db.path !== dbPath)

    // Add new entry at the beginning
    const newEntry: DatabaseEntry = {
      path: dbPath,
      name: this.getNameFromPath(dbPath),
      lastAccessed: new Date().toISOString(),
      modelName,
    }

    const updated = [newEntry, ...filtered].slice(0, MAX_RECENT_DATABASES)

    const fileContent: RecentDatabasesFile = {
      version: 1,
      databases: updated,
    }

    await atomicWriteFile(RECENT_DBS_FILE, JSON.stringify(fileContent, null, 2))
  }

  /**
   * Remove a database from the recent list
   * Uses atomic write to prevent read-modify-write race conditions
   */
  private async removeFromRecent(dbPath: string): Promise<void> {
    const databases = await this.getRecentDatabases()
    const filtered = databases.filter((db) => db.path !== dbPath)

    const fileContent: RecentDatabasesFile = {
      version: 1,
      databases: filtered,
    }

    await atomicWriteFile(RECENT_DBS_FILE, JSON.stringify(fileContent, null, 2))
  }

  /**
   * Delete a database (removes from recent list and optionally deletes files)
   *
   * @param dbPath - Path to the database to delete
   * @param deleteFiles - If true, also delete the database files from disk
   */
  async deleteDatabase(dbPath: string, deleteFiles = false): Promise<void> {
    const resolvedPath = expandTilde(dbPath)

    await this.assertPathAllowedForMutation('Delete path', resolvedPath)

    // Cannot delete the currently active database
    if (this.currentConfig && this.currentConfig.dbPath === resolvedPath) {
      throw new Error(
        'Cannot delete the currently active database. Switch to another database first.'
      )
    }

    // Remove from recent databases list
    await this.removeFromRecent(resolvedPath)

    // Optionally delete files from disk
    if (deleteFiles) {
      const lanceDbPath = path.join(resolvedPath, LANCEDB_DIR_NAME)
      if (existsSync(lanceDbPath)) {
        await rm(lanceDbPath, { recursive: true, force: true })
        console.log(`Deleted database files: ${lanceDbPath}`)
      }
    }

    console.log(`Removed database from recent list: ${resolvedPath}`)
  }

  /**
   * Derive a human-readable name from a path
   */
  private getNameFromPath(dbPath: string): string {
    // Get the last directory name
    const basename = path.basename(dbPath)

    // If it's a generic name, include parent directory
    if (basename === 'db' || basename === 'data' || basename === 'rag') {
      const parent = path.basename(path.dirname(dbPath))
      return `${parent}/${basename}`
    }

    return basename
  }

  /**
   * Ensure config directory exists
   */
  private async ensureConfigDir(): Promise<void> {
    if (!existsSync(CONFIG_DIR)) {
      await mkdir(CONFIG_DIR, { recursive: true })
    }
  }

  /**
   * Enforce allowed-roots policy for database mutation operations.
   */
  private async assertPathAllowedForMutation(action: string, targetPath: string): Promise<void> {
    if (await this.isPathAllowed(targetPath)) {
      return
    }

    const allowedRoots = await this.getEffectiveAllowedRoots()
    throw new Error(
      `${action} "${targetPath}" is outside allowed roots. ` +
        `Allowed: ${allowedRoots.join(', ')}. ` +
        `Add this path to allowed roots or set ALLOWED_SCAN_ROOTS environment variable.`
    )
  }
}
