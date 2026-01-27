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
        const { dbPath, name } = req.body;
        if (!dbPath || typeof dbPath !== 'string') {
            throw new index_js_1.ValidationError('dbPath is required and must be a string');
        }
        await dbManager.createDatabase({ dbPath, name });
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
    return router;
}
//# sourceMappingURL=config-routes.js.map