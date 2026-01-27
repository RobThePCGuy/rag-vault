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
}

/**
 * Scan databases request body
 */
interface ScanDatabasesRequest {
  scanPath: string
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
      const { dbPath, name } = req.body as CreateDatabaseRequest

      if (!dbPath || typeof dbPath !== 'string') {
        throw new ValidationError('dbPath is required and must be a string')
      }

      await dbManager.createDatabase({ dbPath, name })
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

  return router
}
