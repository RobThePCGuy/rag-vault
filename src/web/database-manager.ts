// DatabaseManager - Manages RAG database lifecycle and configuration

import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import type { RAGServer, RAGServerConfig } from '../server/index.js'

// ============================================
// Constants
// ============================================

/** Config directory for rag-vault */
const CONFIG_DIR = path.join(homedir(), '.rag-vault')

/** Recent databases file path */
const RECENT_DBS_FILE = path.join(CONFIG_DIR, 'recent-dbs.json')

/** LanceDB directory name (indicator of a valid database) */
const LANCEDB_DIR_NAME = 'chunks.lance'

/** Maximum number of recent databases to track */
const MAX_RECENT_DATABASES = 10

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
  private switchLock = false

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

    const config: RAGServerConfig = {
      ...this.baseConfig,
      dbPath,
    }

    this.currentServer = this.serverFactory(config)
    this.currentConfig = config
    await this.currentServer.initialize()

    // Add to recent databases
    await this.addToRecent(dbPath, this.baseConfig.modelName)
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
    const status = JSON.parse(statusResult.content[0].text)

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
   */
  async switchDatabase(newDbPath: string): Promise<void> {
    // Prevent concurrent switches
    if (this.switchLock) {
      throw new Error('Database switch already in progress')
    }

    // Expand tilde to home directory
    const resolvedPath = expandTilde(newDbPath)

    // Validate the new path exists and is a valid database
    if (!existsSync(resolvedPath)) {
      throw new Error(`Database path does not exist: ${resolvedPath}`)
    }

    const lanceDbPath = path.join(resolvedPath, LANCEDB_DIR_NAME)
    if (!existsSync(lanceDbPath)) {
      throw new Error(`Invalid database: ${resolvedPath} (missing LanceDB data)`)
    }

    this.switchLock = true

    try {
      // Close current server
      if (this.currentServer) {
        await this.currentServer.close()
      }

      // Create new server with new path
      const config: RAGServerConfig = {
        ...this.baseConfig,
        dbPath: resolvedPath,
      }

      this.currentServer = this.serverFactory(config)
      this.currentConfig = config
      await this.currentServer.initialize()

      // Update recent databases
      await this.addToRecent(resolvedPath, this.baseConfig.modelName)

      console.log(`Switched to database: ${resolvedPath}`)
    } finally {
      this.switchLock = false
    }
  }

  /**
   * Create a new database
   */
  async createDatabase(options: CreateDatabaseOptions): Promise<void> {
    // Expand tilde to home directory
    const resolvedPath = expandTilde(options.dbPath)

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
    await this.switchToNewDatabase(resolvedPath)
  }

  /**
   * Switch to a new (possibly empty) database
   */
  private async switchToNewDatabase(newDbPath: string): Promise<void> {
    if (this.switchLock) {
      throw new Error('Database switch already in progress')
    }

    this.switchLock = true

    try {
      if (this.currentServer) {
        await this.currentServer.close()
      }

      const config: RAGServerConfig = {
        ...this.baseConfig,
        dbPath: newDbPath,
      }

      this.currentServer = this.serverFactory(config)
      this.currentConfig = config
      await this.currentServer.initialize()

      await this.addToRecent(newDbPath, this.baseConfig.modelName)

      console.log(`Created and switched to database: ${newDbPath}`)
    } finally {
      this.switchLock = false
    }
  }

  /**
   * Get list of recent databases
   */
  async getRecentDatabases(): Promise<DatabaseEntry[]> {
    await this.ensureConfigDir()

    if (!existsSync(RECENT_DBS_FILE)) {
      return []
    }

    try {
      const content = await readFile(RECENT_DBS_FILE, 'utf-8')
      const data = JSON.parse(content) as RecentDatabasesFile

      // Filter out databases that no longer exist
      const validDatabases = data.databases.filter((db) => existsSync(db.path))

      return validDatabases
    } catch (error) {
      console.error('Failed to read recent databases:', error)
      return []
    }
  }

  /**
   * Scan a directory for LanceDB databases
   */
  async scanForDatabases(scanPath: string): Promise<ScannedDatabase[]> {
    // Expand tilde to home directory
    const resolvedPath = expandTilde(scanPath)

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

    // Check if resolvedPath itself is a database
    const lanceDbPath = path.join(resolvedPath, LANCEDB_DIR_NAME)
    if (existsSync(lanceDbPath)) {
      results.push({
        path: resolvedPath,
        name: this.getNameFromPath(resolvedPath),
        isKnown: knownPaths.has(resolvedPath),
      })
    }

    // Scan subdirectories (one level deep)
    try {
      const entries = await readdir(resolvedPath, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory()) continue

        const subPath = path.join(resolvedPath, entry.name)
        const subLanceDbPath = path.join(subPath, LANCEDB_DIR_NAME)

        if (existsSync(subLanceDbPath)) {
          results.push({
            path: subPath,
            name: this.getNameFromPath(subPath),
            isKnown: knownPaths.has(subPath),
          })
        }
      }
    } catch (error) {
      console.error(`Failed to scan directory ${resolvedPath}:`, error)
    }

    return results
  }

  /**
   * Add a database to recent list
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

    await writeFile(RECENT_DBS_FILE, JSON.stringify(fileContent, null, 2), 'utf-8')
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
}
