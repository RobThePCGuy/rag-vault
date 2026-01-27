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
    private switchLock;
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
     */
    switchDatabase(newDbPath: string): Promise<void>;
    /**
     * Create a new database
     */
    createDatabase(options: CreateDatabaseOptions): Promise<void>;
    /**
     * Switch to a new (possibly empty) database
     */
    private switchToNewDatabase;
    /**
     * Get list of recent databases
     */
    getRecentDatabases(): Promise<DatabaseEntry[]>;
    /**
     * Scan a directory for LanceDB databases
     */
    scanForDatabases(scanPath: string): Promise<ScannedDatabase[]>;
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