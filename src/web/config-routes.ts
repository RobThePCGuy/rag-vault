// REST API routes for database configuration

import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { ValidationError } from '../errors/index.js'
import type { DatabaseManager } from './database-manager.js'
import { asyncHandler } from './middleware/index.js'

/**
 * Switch database request body
 */
interface SwitchDatabaseRequest {
  dbPath: string
}

/**
 * Create database request body
 */
interface CreateDatabaseRequest {
  dbPath: string
  name?: string
  modelName?: string
}

/**
 * Import config request body
 */
interface ImportConfigRequest {
  config: {
    version: number
    exportedAt: string
    allowedRoots: string[]
    preferences?: Record<string, unknown>
  }
}

/**
 * Scan databases request body
 */
interface ScanDatabasesRequest {
  scanPath: string
}

/**
 * Add/remove allowed root request body
 */
interface AllowedRootRequest {
  path: string
}

/**
 * Create config API router with all endpoints
 */
export function createConfigRouter(dbManager: DatabaseManager): Router {
  const router = createRouter()

  // GET /api/v1/config/current - Get current database configuration
  router.get(
    '/current',
    asyncHandler(async (_req: Request, res: Response) => {
      const config = await dbManager.getCurrentConfig()
      res.json(config)
    })
  )

  // GET /api/v1/config/databases - List recent databases
  router.get(
    '/databases',
    asyncHandler(async (_req: Request, res: Response) => {
      const databases = await dbManager.getRecentDatabases()
      res.json({ databases })
    })
  )

  // POST /api/v1/config/databases/switch - Switch to different database
  router.post(
    '/databases/switch',
    asyncHandler(async (req: Request, res: Response) => {
      const { dbPath } = req.body as SwitchDatabaseRequest

      if (!dbPath || typeof dbPath !== 'string') {
        throw new ValidationError('dbPath is required and must be a string')
      }

      await dbManager.switchDatabase(dbPath)
      const config = await dbManager.getCurrentConfig()
      res.json({ success: true, config })
    })
  )

  // POST /api/v1/config/databases/create - Create new database
  router.post(
    '/databases/create',
    asyncHandler(async (req: Request, res: Response) => {
      const { dbPath, name, modelName } = req.body as CreateDatabaseRequest

      if (!dbPath || typeof dbPath !== 'string') {
        throw new ValidationError('dbPath is required and must be a string')
      }

      await dbManager.createDatabase({ dbPath, name, modelName })
      const config = await dbManager.getCurrentConfig()
      res.json({ success: true, config })
    })
  )

  // POST /api/v1/config/databases/scan - Scan directory for databases
  router.post(
    '/databases/scan',
    asyncHandler(async (req: Request, res: Response) => {
      const { scanPath } = req.body as ScanDatabasesRequest

      if (!scanPath || typeof scanPath !== 'string') {
        throw new ValidationError('scanPath is required and must be a string')
      }

      const databases = await dbManager.scanForDatabases(scanPath)
      res.json({ databases })
    })
  )

  // GET /api/v1/config/allowed-roots - List all effective allowed roots
  router.get(
    '/allowed-roots',
    asyncHandler(async (_req: Request, res: Response) => {
      const info = dbManager.getAllowedRootsInfo()
      res.json(info)
    })
  )

  // POST /api/v1/config/allowed-roots - Add a new allowed root
  router.post(
    '/allowed-roots',
    asyncHandler(async (req: Request, res: Response) => {
      const { path: rootPath } = req.body as AllowedRootRequest

      if (!rootPath || typeof rootPath !== 'string') {
        throw new ValidationError('path is required and must be a string')
      }

      dbManager.addUserAllowedRoot(rootPath)
      const info = dbManager.getAllowedRootsInfo()
      res.json({ success: true, ...info })
    })
  )

  // DELETE /api/v1/config/allowed-roots - Remove an allowed root
  router.delete(
    '/allowed-roots',
    asyncHandler(async (req: Request, res: Response) => {
      const { path: rootPath } = req.body as AllowedRootRequest

      if (!rootPath || typeof rootPath !== 'string') {
        throw new ValidationError('path is required and must be a string')
      }

      dbManager.removeUserAllowedRoot(rootPath)
      const info = dbManager.getAllowedRootsInfo()
      res.json({ success: true, ...info })
    })
  )

  // GET /api/v1/config/browse - List directory contents for folder browser
  router.get(
    '/browse',
    asyncHandler(async (req: Request, res: Response) => {
      const dirPath = req.query['path'] as string
      const showHidden = req.query['showHidden'] === 'true'

      if (!dirPath || typeof dirPath !== 'string') {
        throw new ValidationError('path query parameter is required')
      }

      const entries = await dbManager.listDirectory(dirPath, showHidden)
      res.json({ entries, path: dirPath })
    })
  )

  // GET /api/v1/config/models - List available embedding models
  router.get(
    '/models',
    asyncHandler(async (_req: Request, res: Response) => {
      const models = dbManager.getAvailableModels()
      res.json({ models })
    })
  )

  // GET /api/v1/config/export - Export configuration as JSON
  router.get(
    '/export',
    asyncHandler(async (_req: Request, res: Response) => {
      const config = dbManager.exportConfig()
      res.json(config)
    })
  )

  // POST /api/v1/config/import - Import configuration from JSON
  router.post(
    '/import',
    asyncHandler(async (req: Request, res: Response) => {
      const { config } = req.body as ImportConfigRequest

      if (!config || typeof config !== 'object') {
        throw new ValidationError('config is required and must be an object')
      }

      dbManager.importConfig(config)
      const info = dbManager.getAllowedRootsInfo()
      res.json({ success: true, ...info })
    })
  )

  return router
}
