"use strict";
// REST API routes for database configuration
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConfigRouter = createConfigRouter;
const express_1 = require("express");
const index_js_1 = require("../errors/index.js");
const index_js_2 = require("./middleware/index.js");
/**
 * Create config API router with all endpoints
 */
function createConfigRouter(dbManager) {
    const router = (0, express_1.Router)();
    // GET /api/v1/config/current - Get current database configuration
    router.get('/current', (0, index_js_2.asyncHandler)(async (_req, res) => {
        const config = await dbManager.getCurrentConfig();
        res.json(config);
    }));
    // GET /api/v1/config/databases - List recent databases
    router.get('/databases', (0, index_js_2.asyncHandler)(async (_req, res) => {
        const databases = await dbManager.getRecentDatabases();
        res.json({ databases });
    }));
    // POST /api/v1/config/databases/switch - Switch to different database
    router.post('/databases/switch', (0, index_js_2.asyncHandler)(async (req, res) => {
        const { dbPath } = req.body;
        if (!dbPath || typeof dbPath !== 'string') {
            throw new index_js_1.ValidationError('dbPath is required and must be a string');
        }
        await dbManager.switchDatabase(dbPath);
        const config = await dbManager.getCurrentConfig();
        res.json({ success: true, config });
    }));
    // POST /api/v1/config/databases/create - Create new database
    router.post('/databases/create', (0, index_js_2.asyncHandler)(async (req, res) => {
        const { dbPath, name, modelName } = req.body;
        if (!dbPath || typeof dbPath !== 'string') {
            throw new index_js_1.ValidationError('dbPath is required and must be a string');
        }
        await dbManager.createDatabase({ dbPath, name, modelName });
        const config = await dbManager.getCurrentConfig();
        res.json({ success: true, config });
    }));
    // POST /api/v1/config/databases/scan - Scan directory for databases
    router.post('/databases/scan', (0, index_js_2.asyncHandler)(async (req, res) => {
        const { scanPath } = req.body;
        if (!scanPath || typeof scanPath !== 'string') {
            throw new index_js_1.ValidationError('scanPath is required and must be a string');
        }
        const databases = await dbManager.scanForDatabases(scanPath);
        res.json({ databases });
    }));
    // DELETE /api/v1/config/databases - Delete a database
    router.delete('/databases', (0, index_js_2.asyncHandler)(async (req, res) => {
        const { dbPath, deleteFiles } = req.body;
        if (!dbPath || typeof dbPath !== 'string') {
            throw new index_js_1.ValidationError('dbPath is required and must be a string');
        }
        await dbManager.deleteDatabase(dbPath, deleteFiles ?? false);
        const databases = await dbManager.getRecentDatabases();
        res.json({ success: true, databases });
    }));
    // GET /api/v1/config/allowed-roots - List all effective allowed roots
    router.get('/allowed-roots', (0, index_js_2.asyncHandler)(async (_req, res) => {
        const info = dbManager.getAllowedRootsInfo();
        res.json(info);
    }));
    // POST /api/v1/config/allowed-roots - Add a new allowed root
    router.post('/allowed-roots', (0, index_js_2.asyncHandler)(async (req, res) => {
        const { path: rootPath } = req.body;
        if (!rootPath || typeof rootPath !== 'string') {
            throw new index_js_1.ValidationError('path is required and must be a string');
        }
        dbManager.addUserAllowedRoot(rootPath);
        const info = dbManager.getAllowedRootsInfo();
        res.json({ success: true, ...info });
    }));
    // DELETE /api/v1/config/allowed-roots - Remove an allowed root
    router.delete('/allowed-roots', (0, index_js_2.asyncHandler)(async (req, res) => {
        const { path: rootPath } = req.body;
        if (!rootPath || typeof rootPath !== 'string') {
            throw new index_js_1.ValidationError('path is required and must be a string');
        }
        dbManager.removeUserAllowedRoot(rootPath);
        const info = dbManager.getAllowedRootsInfo();
        res.json({ success: true, ...info });
    }));
    // GET /api/v1/config/browse - List directory contents for folder browser
    router.get('/browse', (0, index_js_2.asyncHandler)(async (req, res) => {
        const dirPath = req.query['path'];
        const showHidden = req.query['showHidden'] === 'true';
        if (!dirPath || typeof dirPath !== 'string') {
            throw new index_js_1.ValidationError('path query parameter is required');
        }
        const entries = await dbManager.listDirectory(dirPath, showHidden);
        res.json({ entries, path: dirPath });
    }));
    // GET /api/v1/config/models - List available embedding models
    router.get('/models', (0, index_js_2.asyncHandler)(async (_req, res) => {
        const models = dbManager.getAvailableModels();
        res.json({ models });
    }));
    // GET /api/v1/config/export - Export configuration as JSON
    router.get('/export', (0, index_js_2.asyncHandler)(async (_req, res) => {
        const config = dbManager.exportConfig();
        res.json(config);
    }));
    // POST /api/v1/config/import - Import configuration from JSON
    router.post('/import', (0, index_js_2.asyncHandler)(async (req, res) => {
        const { config } = req.body;
        if (!config || typeof config !== 'object') {
            throw new index_js_1.ValidationError('config is required and must be an object');
        }
        dbManager.importConfig(config);
        const info = dbManager.getAllowedRootsInfo();
        res.json({ success: true, ...info });
    }));
    // GET /api/v1/config/hybrid-weight - Get current hybrid search weight
    router.get('/hybrid-weight', (0, index_js_2.asyncHandler)(async (_req, res) => {
        const weight = dbManager.getHybridWeight();
        res.json({ weight });
    }));
    // PUT /api/v1/config/hybrid-weight - Set hybrid search weight
    router.put('/hybrid-weight', (0, index_js_2.asyncHandler)(async (req, res) => {
        const { weight } = req.body;
        if (typeof weight !== 'number') {
            throw new index_js_1.ValidationError('weight is required and must be a number');
        }
        if (weight < 0 || weight > 1) {
            throw new index_js_1.ValidationError('weight must be between 0.0 and 1.0');
        }
        dbManager.setHybridWeight(weight);
        res.json({ success: true, weight });
    }));
    return router;
}
//# sourceMappingURL=config-routes.js.map