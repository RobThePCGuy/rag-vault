import type { RAGServer, RAGServerConfig } from '../server/index.js';
/**
 * Database entry in recent databases list
 */
export interface DatabaseEntry {
    /** Absolute path to the database directory */
    path: string;
    /** Human-readable name (derived from path) */
    name: string;
    /** Last access timestamp (ISO 8601) */
    lastAccessed: string;
    /** Model name used with this database */
    modelName?: string | undefined;
}
/**
 * Current database configuration (extended with stats)
 */
export interface CurrentDatabaseConfig {
    /** Database path */
    dbPath: string;
    /** Model name */
    modelName: string;
    /** Human-readable database name */
    name: string;
    /** Document count */
    documentCount: number;
    /** Chunk count */
    chunkCount: number;
}
/**
 * Create database options
 */
export interface CreateDatabaseOptions {
    /** Path where to create the database */
    dbPath: string;
    /** Optional custom name */
    name?: string | undefined;
    /** Optional model name to use */
    modelName?: string | undefined;
}
/**
 * Available embedding model
 */
export interface AvailableModel {
    /** Model ID */
    id: string;
    /** Human-readable name */
    name: string;
    /** Model description */
    description: string;
    /** Whether this is the default model */
    isDefault: boolean;
}
/**
 * Preset embedding models
 */
export declare const AVAILABLE_MODELS: AvailableModel[];
/**
 * Export/import configuration structure
 */
export interface ExportedConfig {
    version: number;
    exportedAt: string;
    allowedRoots: string[];
    preferences?: Record<string, unknown>;
}
/**
 * Scan result for a discovered database
 */
export interface ScannedDatabase {
    /** Absolute path to the database */
    path: string;
    /** Human-readable name */
    name: string;
    /** Whether this database is already in recent list */
    isKnown: boolean;
}
/**
 * Directory entry for folder browser
 */
export interface DirectoryEntry {
    /** Entry name */
    name: string;
    /** Full path */
    path: string;
    /** Whether this is a directory */
    isDirectory: boolean;
}
/**
 * Allowed roots response
 */
export interface AllowedRootsResponse {
    /** All effective allowed roots */
    roots: string[];
    /** Current base directory */
    baseDir: string;
    /** Environment-based roots */
    envRoots: string[];
    /** User-added roots (can be removed) */
    userRoots: string[];
}
/**
 * DatabaseManager handles RAG database lifecycle management
 *
 * Responsibilities:
 * - Track current database connection
 * - Hot-swap between databases
 * - Persist recent databases list
 * - Discover databases by scanning directories
 */
export declare class DatabaseManager {
    private currentServer;
    private currentConfig;
    private serverFactory;
    private baseConfig;
    private switchPromise;
    constructor(serverFactory: (config: RAGServerConfig) => RAGServer, baseConfig: Omit<RAGServerConfig, 'dbPath'>);
    /**
     * Initialize with a database path
     */
    initialize(dbPath: string): Promise<void>;
    /**
     * Get current RAG server instance
     */
    getServer(): RAGServer;
    /**
     * Get current database configuration with stats
     */
    getCurrentConfig(): Promise<CurrentDatabaseConfig | null>;
    /**
     * Switch to a different database
     *
     * Uses promise-based mutex to prevent race conditions from concurrent switch attempts.
     */
    switchDatabase(newDbPath: string): Promise<void>;
    /**
     * Internal method to perform the actual database switch
     */
    private performSwitch;
    /**
     * Create a new database
     */
    createDatabase(options: CreateDatabaseOptions): Promise<void>;
    /**
     * Switch to a new (possibly empty) database
     *
     * Uses promise-based mutex to prevent race conditions from concurrent switch attempts.
     */
    private switchToNewDatabase;
    /**
     * Internal method to perform the actual switch to a new database
     */
    private performSwitchToNew;
    /**
     * Get list of recent databases
     *
     * Handles errors appropriately:
     * - File not found: Normal case, returns empty array
     * - Parse/validation error: Logs error but returns empty array to allow recovery
     */
    getRecentDatabases(): Promise<DatabaseEntry[]>;
    /**
     * Get the base directory (dbPath directory)
     */
    getBaseDir(): string;
    /**
     * Get all effective allowed roots (env + baseDir + user-added)
     */
    getEffectiveAllowedRoots(): string[];
    /**
     * Check if a path is within allowed roots
     */
    isPathAllowed(targetPath: string): boolean;
    /**
     * Get allowed roots info for API response
     */
    getAllowedRootsInfo(): AllowedRootsResponse;
    /**
     * Add a user-allowed root
     */
    addUserAllowedRoot(rootPath: string): void;
    /**
     * Remove a user-allowed root
     */
    removeUserAllowedRoot(rootPath: string): void;
    /**
     * List directory contents for folder browser
     * @param dirPath - The directory path to list
     * @param showHidden - Whether to include hidden files (starting with .)
     */
    listDirectory(dirPath: string, showHidden?: boolean): Promise<DirectoryEntry[]>;
    /**
     * Scan a directory for LanceDB databases
     *
     * Security: Only scans within allowed roots (ALLOWED_SCAN_ROOTS env var or home directory)
     * to prevent path traversal attacks.
     *
     * @param scanPath - The path to scan
     * @param maxDepth - Maximum depth to scan (default 2)
     */
    scanForDatabases(scanPath: string, maxDepth?: number): Promise<ScannedDatabase[]>;
    /**
     * Get available embedding models
     */
    getAvailableModels(): AvailableModel[];
    /**
     * Export configuration (allowed roots)
     */
    exportConfig(): ExportedConfig;
    /**
     * Import configuration (allowed roots)
     */
    importConfig(config: ExportedConfig): void;
    /**
     * Add a database to recent list
     */
    private addToRecent;
    /**
     * Derive a human-readable name from a path
     */
    private getNameFromPath;
    /**
     * Ensure config directory exists
     */
    private ensureConfigDir;
}
//# sourceMappingURL=database-manager.d.ts.map