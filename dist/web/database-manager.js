"use strict";
// DatabaseManager - Manages RAG database lifecycle and configuration
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseManager = exports.AVAILABLE_MODELS = void 0;
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
/** User-added allowed roots file path */
const ALLOWED_ROOTS_FILE = node_path_1.default.join(CONFIG_DIR, 'allowed-roots.json');
/** LanceDB directory name (indicator of a valid database) */
const LANCEDB_DIR_NAME = 'chunks.lance';
/** Maximum number of recent databases to track */
const MAX_RECENT_DATABASES = 10;
/**
 * Get allowed scan roots from environment variable or default to home directory
 * ALLOWED_SCAN_ROOTS: comma-separated list of absolute paths
 */
function getEnvAllowedScanRoots() {
    const envRoots = process.env['ALLOWED_SCAN_ROOTS'];
    if (envRoots) {
        return envRoots.split(',').map((p) => node_path_1.default.resolve(p.trim()));
    }
    // Default: only allow scanning within home directory
    return [(0, node_os_1.homedir)()];
}
/**
 * Read user-added allowed roots from config file
 */
function readUserAllowedRoots() {
    if (!(0, node_fs_1.existsSync)(ALLOWED_ROOTS_FILE)) {
        return [];
    }
    try {
        const content = JSON.parse(require('node:fs').readFileSync(ALLOWED_ROOTS_FILE, 'utf-8'));
        if (Array.isArray(content.roots)) {
            return content.roots.map((p) => node_path_1.default.resolve(p));
        }
        return [];
    }
    catch {
        return [];
    }
}
/**
 * Write user-added allowed roots to config file
 */
function writeUserAllowedRoots(roots) {
    const dir = node_path_1.default.dirname(ALLOWED_ROOTS_FILE);
    if (!(0, node_fs_1.existsSync)(dir)) {
        require('node:fs').mkdirSync(dir, { recursive: true });
    }
    require('node:fs').writeFileSync(ALLOWED_ROOTS_FILE, JSON.stringify({ roots }, null, 2), 'utf-8');
}
/**
 * Check if a path is within a set of allowed roots
 */
function isPathWithinRoots(targetPath, allowedRoots) {
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
/**
 * Preset embedding models
 */
exports.AVAILABLE_MODELS = [
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
];
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
        // Look up stored model name from recent databases
        const recentDbs = await this.getRecentDatabases();
        const storedEntry = recentDbs.find((db) => db.path === dbPath);
        const effectiveModelName = storedEntry?.modelName || this.baseConfig.modelName;
        const config = {
            ...this.baseConfig,
            dbPath,
            modelName: effectiveModelName,
        };
        this.currentServer = this.serverFactory(config);
        this.currentConfig = config;
        await this.currentServer.initialize();
        // Add to recent databases with the model name
        await this.addToRecent(dbPath, effectiveModelName);
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
        // Look up stored model name from recent databases
        const recentDbs = await this.getRecentDatabases();
        const storedEntry = recentDbs.find((db) => db.path === resolvedPath);
        const modelName = storedEntry?.modelName;
        // Set promise atomically before any async operations
        this.switchPromise = this.performSwitch(resolvedPath, modelName).finally(() => {
            this.switchPromise = null;
        });
        return this.switchPromise;
    }
    /**
     * Internal method to perform the actual database switch
     */
    async performSwitch(resolvedPath, modelName) {
        // Close current server
        if (this.currentServer) {
            await this.currentServer.close();
        }
        // Use stored model name if available, otherwise fall back to baseConfig
        const effectiveModelName = modelName || this.baseConfig.modelName;
        // Create new server with new path and correct model
        const config = {
            ...this.baseConfig,
            dbPath: resolvedPath,
            modelName: effectiveModelName,
        };
        this.currentServer = this.serverFactory(config);
        this.currentConfig = config;
        await this.currentServer.initialize();
        // Update recent databases with the model name
        await this.addToRecent(resolvedPath, effectiveModelName);
        console.log(`Switched to database: ${resolvedPath} (model: ${effectiveModelName})`);
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
        await this.switchToNewDatabase(resolvedPath, options.modelName);
    }
    /**
     * Switch to a new (possibly empty) database
     *
     * Uses promise-based mutex to prevent race conditions from concurrent switch attempts.
     */
    async switchToNewDatabase(newDbPath, modelName) {
        if (this.switchPromise) {
            throw new Error('Database switch already in progress');
        }
        // Set promise atomically before any async operations
        this.switchPromise = this.performSwitchToNew(newDbPath, modelName).finally(() => {
            this.switchPromise = null;
        });
        return this.switchPromise;
    }
    /**
     * Internal method to perform the actual switch to a new database
     */
    async performSwitchToNew(newDbPath, modelName) {
        if (this.currentServer) {
            await this.currentServer.close();
        }
        // Use provided modelName or fall back to baseConfig
        const effectiveModelName = modelName || this.baseConfig.modelName;
        const config = {
            ...this.baseConfig,
            dbPath: newDbPath,
            modelName: effectiveModelName,
        };
        this.currentServer = this.serverFactory(config);
        this.currentConfig = config;
        await this.currentServer.initialize();
        await this.addToRecent(newDbPath, effectiveModelName);
        console.log(`Created and switched to database: ${newDbPath} (model: ${effectiveModelName})`);
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
     * Get the base directory (dbPath directory)
     */
    getBaseDir() {
        return this.currentConfig ? node_path_1.default.dirname(this.currentConfig.dbPath) : (0, node_os_1.homedir)();
    }
    /**
     * Get all effective allowed roots (env + baseDir + user-added)
     */
    getEffectiveAllowedRoots() {
        const envRoots = getEnvAllowedScanRoots();
        const userRoots = readUserAllowedRoots();
        const baseDir = this.getBaseDir();
        // Combine all sources and deduplicate
        const allRoots = new Set([...envRoots, baseDir, ...userRoots]);
        return Array.from(allRoots);
    }
    /**
     * Check if a path is within allowed roots
     */
    isPathAllowed(targetPath) {
        const allowedRoots = this.getEffectiveAllowedRoots();
        return isPathWithinRoots(targetPath, allowedRoots);
    }
    /**
     * Get allowed roots info for API response
     */
    getAllowedRootsInfo() {
        return {
            roots: this.getEffectiveAllowedRoots(),
            baseDir: this.getBaseDir(),
            envRoots: getEnvAllowedScanRoots(),
            userRoots: readUserAllowedRoots(),
        };
    }
    /**
     * Add a user-allowed root
     */
    addUserAllowedRoot(rootPath) {
        const resolved = node_path_1.default.resolve(expandTilde(rootPath));
        if (!(0, node_fs_1.existsSync)(resolved)) {
            throw new Error(`Path does not exist: ${resolved}`);
        }
        const roots = readUserAllowedRoots();
        if (!roots.includes(resolved)) {
            roots.push(resolved);
            writeUserAllowedRoots(roots);
        }
    }
    /**
     * Remove a user-allowed root
     */
    removeUserAllowedRoot(rootPath) {
        const resolved = node_path_1.default.resolve(expandTilde(rootPath));
        const roots = readUserAllowedRoots();
        const filtered = roots.filter((r) => r !== resolved);
        writeUserAllowedRoots(filtered);
    }
    /**
     * List directory contents for folder browser
     * @param dirPath - The directory path to list
     * @param showHidden - Whether to include hidden files (starting with .)
     */
    async listDirectory(dirPath, showHidden = false) {
        const resolved = node_path_1.default.resolve(expandTilde(dirPath));
        // Allow browsing root directories and paths within allowed roots
        // For security, we still allow browsing but the user can only add paths as allowed roots
        if (!(0, node_fs_1.existsSync)(resolved)) {
            throw new Error(`Directory does not exist: ${resolved}`);
        }
        const dirStat = await (0, promises_1.stat)(resolved);
        if (!dirStat.isDirectory()) {
            throw new Error(`Path is not a directory: ${resolved}`);
        }
        const entries = await (0, promises_1.readdir)(resolved, { withFileTypes: true });
        const results = [];
        for (const entry of entries) {
            // Skip hidden files/directories unless showHidden is true
            if (!showHidden && entry.name.startsWith('.'))
                continue;
            results.push({
                name: entry.name,
                path: node_path_1.default.join(resolved, entry.name),
                isDirectory: entry.isDirectory(),
            });
        }
        // Sort: directories first, then alphabetically
        results.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory)
                return -1;
            if (!a.isDirectory && b.isDirectory)
                return 1;
            return a.name.localeCompare(b.name);
        });
        return results;
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
    async scanForDatabases(scanPath, maxDepth = 2) {
        // Expand tilde to home directory
        const resolvedPath = expandTilde(scanPath);
        // Security: Validate path is within allowed roots
        if (!this.isPathAllowed(resolvedPath)) {
            const allowedRoots = this.getEffectiveAllowedRoots();
            throw new Error(`Scan path "${resolvedPath}" is outside allowed roots. ` +
                `Allowed: ${allowedRoots.join(', ')}. ` +
                `Add this path to allowed roots or set ALLOWED_SCAN_ROOTS environment variable.`);
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
        // Recursive scan function with depth tracking
        const scanDirectory = async (dirPath, currentDepth) => {
            // Check if this directory is a database
            const lanceDbPath = node_path_1.default.join(dirPath, LANCEDB_DIR_NAME);
            if ((0, node_fs_1.existsSync)(lanceDbPath)) {
                results.push({
                    path: dirPath,
                    name: this.getNameFromPath(dirPath),
                    isKnown: knownPaths.has(dirPath),
                });
                // Don't scan subdirectories of a database
                return;
            }
            // Stop if we've reached max depth
            if (currentDepth >= maxDepth)
                return;
            try {
                const entries = await (0, promises_1.readdir)(dirPath, { withFileTypes: true });
                for (const entry of entries) {
                    if (!entry.isDirectory())
                        continue;
                    // Skip hidden directories
                    if (entry.name.startsWith('.'))
                        continue;
                    const subPath = node_path_1.default.join(dirPath, entry.name);
                    await scanDirectory(subPath, currentDepth + 1);
                }
            }
            catch (error) {
                // Ignore permission errors on individual directories
                console.error(`Failed to scan directory ${dirPath}:`, error);
            }
        };
        await scanDirectory(resolvedPath, 0);
        return results;
    }
    /**
     * Get available embedding models
     */
    getAvailableModels() {
        return exports.AVAILABLE_MODELS;
    }
    /**
     * Export configuration (allowed roots)
     */
    exportConfig() {
        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            allowedRoots: readUserAllowedRoots(),
        };
    }
    /**
     * Import configuration (allowed roots)
     */
    importConfig(config) {
        if (config.version !== 1) {
            throw new Error(`Unsupported config version: ${config.version}`);
        }
        if (!Array.isArray(config.allowedRoots)) {
            throw new Error('Invalid config: allowedRoots must be an array');
        }
        // Validate each path exists before importing
        const validRoots = [];
        for (const root of config.allowedRoots) {
            const resolved = node_path_1.default.resolve(expandTilde(root));
            if ((0, node_fs_1.existsSync)(resolved)) {
                validRoots.push(resolved);
            }
            else {
                console.warn(`Skipping non-existent root during import: ${resolved}`);
            }
        }
        writeUserAllowedRoots(validRoots);
    }
    /**
     * Get the current hybrid search weight
     * @returns Value between 0.0 (vector-only) and 1.0 (max keyword boost)
     */
    getHybridWeight() {
        if (!this.currentServer) {
            return 0.6; // Default value
        }
        return this.currentServer.getHybridWeight();
    }
    /**
     * Set the hybrid search weight at runtime
     * @param weight - Value between 0.0 (vector-only) and 1.0 (max keyword boost)
     */
    setHybridWeight(weight) {
        if (!this.currentServer) {
            throw new Error('DatabaseManager not initialized. Call initialize() first.');
        }
        this.currentServer.setHybridWeight(weight);
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
     * Remove a database from the recent list
     */
    async removeFromRecent(dbPath) {
        const databases = await this.getRecentDatabases();
        const filtered = databases.filter((db) => db.path !== dbPath);
        const fileContent = {
            version: 1,
            databases: filtered,
        };
        await (0, promises_1.writeFile)(RECENT_DBS_FILE, JSON.stringify(fileContent, null, 2), 'utf-8');
    }
    /**
     * Delete a database (removes from recent list and optionally deletes files)
     *
     * @param dbPath - Path to the database to delete
     * @param deleteFiles - If true, also delete the database files from disk
     */
    async deleteDatabase(dbPath, deleteFiles = false) {
        const resolvedPath = expandTilde(dbPath);
        // Cannot delete the currently active database
        if (this.currentConfig && this.currentConfig.dbPath === resolvedPath) {
            throw new Error('Cannot delete the currently active database. Switch to another database first.');
        }
        // Remove from recent databases list
        await this.removeFromRecent(resolvedPath);
        // Optionally delete files from disk
        if (deleteFiles) {
            const lanceDbPath = node_path_1.default.join(resolvedPath, LANCEDB_DIR_NAME);
            if ((0, node_fs_1.existsSync)(lanceDbPath)) {
                await (0, promises_1.rm)(lanceDbPath, { recursive: true, force: true });
                console.log(`Deleted database files: ${lanceDbPath}`);
            }
        }
        console.log(`Removed database from recent list: ${resolvedPath}`);
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