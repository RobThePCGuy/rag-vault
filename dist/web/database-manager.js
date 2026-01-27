"use strict";
// DatabaseManager - Manages RAG database lifecycle and configuration
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseManager = void 0;
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = __importDefault(require("node:path"));
const schemas_js_1 = require("../server/schemas.js");
// ============================================
// Constants
// ============================================
/** Config directory for rag-vault */
const CONFIG_DIR = node_path_1.default.join((0, node_os_1.homedir)(), '.rag-vault');
/** Recent databases file path */
const RECENT_DBS_FILE = node_path_1.default.join(CONFIG_DIR, 'recent-dbs.json');
/** LanceDB directory name (indicator of a valid database) */
const LANCEDB_DIR_NAME = 'chunks.lance';
/** Maximum number of recent databases to track */
const MAX_RECENT_DATABASES = 10;
/**
 * Get allowed scan roots from environment variable or default to home directory
 * ALLOWED_SCAN_ROOTS: comma-separated list of absolute paths
 */
function getAllowedScanRoots() {
    const envRoots = process.env['ALLOWED_SCAN_ROOTS'];
    if (envRoots) {
        return envRoots.split(',').map((p) => node_path_1.default.resolve(p.trim()));
    }
    // Default: only allow scanning within home directory
    return [(0, node_os_1.homedir)()];
}
/**
 * Validate that a path is within allowed scan roots (prevents path traversal)
 * @param targetPath - Path to validate (will be resolved and normalized)
 * @returns true if path is within allowed roots
 */
function isPathWithinAllowedRoots(targetPath) {
    const allowedRoots = getAllowedScanRoots();
    let resolvedPath;
    try {
        // Resolve to absolute path and resolve symlinks
        resolvedPath = (0, node_fs_1.existsSync)(targetPath) ? (0, node_fs_1.realpathSync)(targetPath) : node_path_1.default.resolve(targetPath);
    }
    catch {
        // If we can't resolve the path, reject it
        return false;
    }
    // Check if the resolved path is within any allowed root
    return allowedRoots.some((root) => {
        const normalizedRoot = node_path_1.default.normalize(root);
        const normalizedTarget = node_path_1.default.normalize(resolvedPath);
        // Ensure exact prefix match (avoid /home/user matching /home/username)
        return (normalizedTarget === normalizedRoot || normalizedTarget.startsWith(normalizedRoot + node_path_1.default.sep));
    });
}
/**
 * Expand tilde (~) in path to home directory
 */
function expandTilde(filePath) {
    if (filePath.startsWith('~/')) {
        return node_path_1.default.join((0, node_os_1.homedir)(), filePath.slice(2));
    }
    if (filePath === '~') {
        return (0, node_os_1.homedir)();
    }
    return filePath;
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
class DatabaseManager {
    constructor(serverFactory, baseConfig) {
        this.currentServer = null;
        this.currentConfig = null;
        this.switchPromise = null;
        this.serverFactory = serverFactory;
        this.baseConfig = baseConfig;
    }
    /**
     * Initialize with a database path
     */
    async initialize(dbPath) {
        await this.ensureConfigDir();
        const config = {
            ...this.baseConfig,
            dbPath,
        };
        this.currentServer = this.serverFactory(config);
        this.currentConfig = config;
        await this.currentServer.initialize();
        // Add to recent databases
        await this.addToRecent(dbPath, this.baseConfig.modelName);
    }
    /**
     * Get current RAG server instance
     */
    getServer() {
        if (!this.currentServer) {
            throw new Error('DatabaseManager not initialized. Call initialize() first.');
        }
        return this.currentServer;
    }
    /**
     * Get current database configuration with stats
     */
    async getCurrentConfig() {
        if (!this.currentServer || !this.currentConfig) {
            return null;
        }
        const serverConfig = this.currentServer.getConfig();
        const statusResult = await this.currentServer.handleStatus();
        // Safely extract text from response
        // The return type is { content: [{ type: 'text'; text: string }] }
        const firstContent = statusResult.content[0];
        if (typeof firstContent.text !== 'string') {
            throw new Error('Malformed server response: missing text in content');
        }
        // Parse and validate status response with Zod
        const parsed = schemas_js_1.StatusResponseSchema.safeParse(JSON.parse(firstContent.text));
        if (!parsed.success) {
            throw new Error(`Invalid status response: ${parsed.error.message}`);
        }
        const status = parsed.data;
        return {
            dbPath: serverConfig.dbPath,
            modelName: serverConfig.modelName,
            name: this.getNameFromPath(serverConfig.dbPath),
            documentCount: status.documentCount,
            chunkCount: status.chunkCount,
        };
    }
    /**
     * Switch to a different database
     *
     * Uses promise-based mutex to prevent race conditions from concurrent switch attempts.
     */
    async switchDatabase(newDbPath) {
        // Prevent concurrent switches using promise-based mutex
        if (this.switchPromise) {
            throw new Error('Database switch already in progress');
        }
        // Expand tilde to home directory
        const resolvedPath = expandTilde(newDbPath);
        // Validate the new path exists and is a valid database
        if (!(0, node_fs_1.existsSync)(resolvedPath)) {
            throw new Error(`Database path does not exist: ${resolvedPath}`);
        }
        const lanceDbPath = node_path_1.default.join(resolvedPath, LANCEDB_DIR_NAME);
        if (!(0, node_fs_1.existsSync)(lanceDbPath)) {
            throw new Error(`Invalid database: ${resolvedPath} (missing LanceDB data)`);
        }
        // Set promise atomically before any async operations
        this.switchPromise = this.performSwitch(resolvedPath).finally(() => {
            this.switchPromise = null;
        });
        return this.switchPromise;
    }
    /**
     * Internal method to perform the actual database switch
     */
    async performSwitch(resolvedPath) {
        // Close current server
        if (this.currentServer) {
            await this.currentServer.close();
        }
        // Create new server with new path
        const config = {
            ...this.baseConfig,
            dbPath: resolvedPath,
        };
        this.currentServer = this.serverFactory(config);
        this.currentConfig = config;
        await this.currentServer.initialize();
        // Update recent databases
        await this.addToRecent(resolvedPath, this.baseConfig.modelName);
        console.log(`Switched to database: ${resolvedPath}`);
    }
    /**
     * Create a new database
     */
    async createDatabase(options) {
        // Expand tilde to home directory
        const resolvedPath = expandTilde(options.dbPath);
        // Check if path already exists
        if ((0, node_fs_1.existsSync)(resolvedPath)) {
            const lanceDbPath = node_path_1.default.join(resolvedPath, LANCEDB_DIR_NAME);
            if ((0, node_fs_1.existsSync)(lanceDbPath)) {
                throw new Error(`Database already exists at: ${resolvedPath}`);
            }
        }
        // Create the directory if needed
        await (0, promises_1.mkdir)(resolvedPath, { recursive: true });
        // Switch to the new database (it will be empty initially)
        // The VectorStore will create the table on first data insertion
        await this.switchToNewDatabase(resolvedPath);
    }
    /**
     * Switch to a new (possibly empty) database
     *
     * Uses promise-based mutex to prevent race conditions from concurrent switch attempts.
     */
    async switchToNewDatabase(newDbPath) {
        if (this.switchPromise) {
            throw new Error('Database switch already in progress');
        }
        // Set promise atomically before any async operations
        this.switchPromise = this.performSwitchToNew(newDbPath).finally(() => {
            this.switchPromise = null;
        });
        return this.switchPromise;
    }
    /**
     * Internal method to perform the actual switch to a new database
     */
    async performSwitchToNew(newDbPath) {
        if (this.currentServer) {
            await this.currentServer.close();
        }
        const config = {
            ...this.baseConfig,
            dbPath: newDbPath,
        };
        this.currentServer = this.serverFactory(config);
        this.currentConfig = config;
        await this.currentServer.initialize();
        await this.addToRecent(newDbPath, this.baseConfig.modelName);
        console.log(`Created and switched to database: ${newDbPath}`);
    }
    /**
     * Get list of recent databases
     *
     * Handles errors appropriately:
     * - File not found: Normal case, returns empty array
     * - Parse/validation error: Logs error but returns empty array to allow recovery
     */
    async getRecentDatabases() {
        await this.ensureConfigDir();
        if (!(0, node_fs_1.existsSync)(RECENT_DBS_FILE)) {
            return [];
        }
        try {
            const content = await (0, promises_1.readFile)(RECENT_DBS_FILE, 'utf-8');
            const jsonData = JSON.parse(content);
            // Validate with Zod schema
            const parsed = schemas_js_1.RecentDatabasesFileSchema.safeParse(jsonData);
            if (!parsed.success) {
                console.error('Recent databases file has invalid format:', parsed.error.message);
                console.error('File will be overwritten on next database access.');
                return [];
            }
            // Filter out databases that no longer exist
            const validDatabases = parsed.data.databases.filter((db) => (0, node_fs_1.existsSync)(db.path));
            return validDatabases;
        }
        catch (error) {
            // Differentiate between file-not-found and other errors
            const nodeError = error;
            if (nodeError.code === 'ENOENT') {
                // File was deleted between check and read - OK
                return [];
            }
            // JSON parse error or other issues - log but allow recovery
            console.error('Failed to read recent databases (file may be corrupted):', error);
            console.error('File will be overwritten on next database access.');
            return [];
        }
    }
    /**
     * Scan a directory for LanceDB databases
     *
     * Security: Only scans within allowed roots (ALLOWED_SCAN_ROOTS env var or home directory)
     * to prevent path traversal attacks.
     */
    async scanForDatabases(scanPath) {
        // Expand tilde to home directory
        const resolvedPath = expandTilde(scanPath);
        // Security: Validate path is within allowed roots
        if (!isPathWithinAllowedRoots(resolvedPath)) {
            const allowedRoots = getAllowedScanRoots();
            throw new Error(`Scan path "${resolvedPath}" is outside allowed roots. ` +
                `Allowed: ${allowedRoots.join(', ')}. ` +
                `Set ALLOWED_SCAN_ROOTS environment variable to allow additional paths.`);
        }
        const results = [];
        const recentDbs = await this.getRecentDatabases();
        const knownPaths = new Set(recentDbs.map((db) => db.path));
        if (!(0, node_fs_1.existsSync)(resolvedPath)) {
            throw new Error(`Scan path does not exist: ${resolvedPath}`);
        }
        const scanStat = await (0, promises_1.stat)(resolvedPath);
        if (!scanStat.isDirectory()) {
            throw new Error(`Scan path is not a directory: ${resolvedPath}`);
        }
        // Check if resolvedPath itself is a database
        const lanceDbPath = node_path_1.default.join(resolvedPath, LANCEDB_DIR_NAME);
        if ((0, node_fs_1.existsSync)(lanceDbPath)) {
            results.push({
                path: resolvedPath,
                name: this.getNameFromPath(resolvedPath),
                isKnown: knownPaths.has(resolvedPath),
            });
        }
        // Scan subdirectories (one level deep)
        try {
            const entries = await (0, promises_1.readdir)(resolvedPath, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory())
                    continue;
                const subPath = node_path_1.default.join(resolvedPath, entry.name);
                const subLanceDbPath = node_path_1.default.join(subPath, LANCEDB_DIR_NAME);
                if ((0, node_fs_1.existsSync)(subLanceDbPath)) {
                    results.push({
                        path: subPath,
                        name: this.getNameFromPath(subPath),
                        isKnown: knownPaths.has(subPath),
                    });
                }
            }
        }
        catch (error) {
            console.error(`Failed to scan directory ${resolvedPath}:`, error);
        }
        return results;
    }
    /**
     * Add a database to recent list
     */
    async addToRecent(dbPath, modelName) {
        const databases = await this.getRecentDatabases();
        // Remove existing entry for this path
        const filtered = databases.filter((db) => db.path !== dbPath);
        // Add new entry at the beginning
        const newEntry = {
            path: dbPath,
            name: this.getNameFromPath(dbPath),
            lastAccessed: new Date().toISOString(),
            modelName,
        };
        const updated = [newEntry, ...filtered].slice(0, MAX_RECENT_DATABASES);
        const fileContent = {
            version: 1,
            databases: updated,
        };
        await (0, promises_1.writeFile)(RECENT_DBS_FILE, JSON.stringify(fileContent, null, 2), 'utf-8');
    }
    /**
     * Derive a human-readable name from a path
     */
    getNameFromPath(dbPath) {
        // Get the last directory name
        const basename = node_path_1.default.basename(dbPath);
        // If it's a generic name, include parent directory
        if (basename === 'db' || basename === 'data' || basename === 'rag') {
            const parent = node_path_1.default.basename(node_path_1.default.dirname(dbPath));
            return `${parent}/${basename}`;
        }
        return basename;
    }
    /**
     * Ensure config directory exists
     */
    async ensureConfigDir() {
        if (!(0, node_fs_1.existsSync)(CONFIG_DIR)) {
            await (0, promises_1.mkdir)(CONFIG_DIR, { recursive: true });
        }
    }
}
exports.DatabaseManager = DatabaseManager;
//# sourceMappingURL=database-manager.js.map