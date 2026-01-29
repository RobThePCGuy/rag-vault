import type { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ValidationError } from '../../errors/index.js'
import type { DatabaseManager, AllowedRootsResponse, CurrentDatabaseConfig, DatabaseEntry, DirectoryEntry, ScannedDatabase, AvailableModel, ExportedConfig } from '../database-manager.js'
import { createConfigRouter } from '../config-routes.js'

// ============================================
// Mock DatabaseManager
// ============================================

function createMockDatabaseManager(): Partial<DatabaseManager> {
  return {
    getCurrentConfig: vi.fn().mockResolvedValue({
      dbPath: '/test/db',
      modelName: 'test-model',
      name: 'test-db',
      documentCount: 10,
      chunkCount: 100,
    } as CurrentDatabaseConfig),
    getRecentDatabases: vi.fn().mockResolvedValue([
      {
        path: '/test/db1',
        name: 'db1',
        lastAccessed: '2024-01-01T00:00:00Z',
        modelName: 'test-model',
      },
    ] as DatabaseEntry[]),
    switchDatabase: vi.fn().mockResolvedValue(undefined),
    createDatabase: vi.fn().mockResolvedValue(undefined),
    scanForDatabases: vi.fn().mockResolvedValue([
      { path: '/test/db1', name: 'db1', isKnown: true },
      { path: '/test/db2', name: 'db2', isKnown: false },
    ] as ScannedDatabase[]),
    getAllowedRootsInfo: vi.fn().mockReturnValue({
      roots: ['/home/user', '/test'],
      baseDir: '/home/user',
      envRoots: ['/home/user'],
      userRoots: ['/test'],
    } as AllowedRootsResponse),
    addUserAllowedRoot: vi.fn(),
    removeUserAllowedRoot: vi.fn(),
    listDirectory: vi.fn().mockResolvedValue([
      { name: 'folder1', path: '/test/folder1', isDirectory: true },
      { name: 'file.txt', path: '/test/file.txt', isDirectory: false },
    ] as DirectoryEntry[]),
    getAvailableModels: vi.fn().mockReturnValue([
      { id: 'model1', name: 'Model 1', description: 'Test model', isDefault: true },
    ] as AvailableModel[]),
    exportConfig: vi.fn().mockReturnValue({
      version: 1,
      exportedAt: '2024-01-01T00:00:00Z',
      allowedRoots: ['/test'],
    } as ExportedConfig),
    importConfig: vi.fn(),
  }
}

// ============================================
// Mock Express request and response
// ============================================

function createMockReq(
  body: unknown = {},
  query: Record<string, string> = {}
): Partial<Request> {
  return { body, query }
}

function createMockRes(): {
  res: Partial<Response>
  json: ReturnType<typeof vi.fn>
  status: ReturnType<typeof vi.fn>
} {
  const json = vi.fn()
  const status = vi.fn().mockReturnThis()
  const res: Partial<Response> = { json, status }
  return { res, json, status }
}

// ============================================
// Helper to get route handler
// ============================================

interface RouteLayer {
  route?: {
    path: string
    methods: Record<string, boolean>
    stack?: { handle: (req: Request, res: Response, next: NextFunction) => Promise<void> }[]
  }
}

function getRouteHandler(
  router: { stack: RouteLayer[] },
  path: string,
  method: 'get' | 'post' | 'delete'
): ((req: Request, res: Response, next: NextFunction) => Promise<void>) | undefined {
  const layer = router.stack.find(
    (l) => l.route?.path === path && l.route?.methods?.[method]
  )
  return layer?.route?.stack?.[0]?.handle
}

// ============================================
// Tests
// ============================================

describe('Config Routes', () => {
  let mockDbManager: Partial<DatabaseManager>

  beforeEach(() => {
    mockDbManager = createMockDatabaseManager()
  })

  describe('GET /current', () => {
    it('should return current database configuration', async () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)
      const handler = getRouteHandler(router, '/current', 'get')

      expect(handler).toBeDefined()

      if (handler) {
        const req = createMockReq()
        const { res, json } = createMockRes()

        await handler(req as Request, res as Response, vi.fn())

        expect(mockDbManager.getCurrentConfig).toHaveBeenCalled()
        expect(json).toHaveBeenCalledWith({
          dbPath: '/test/db',
          modelName: 'test-model',
          name: 'test-db',
          documentCount: 10,
          chunkCount: 100,
        })
      }
    })
  })

  describe('GET /databases', () => {
    it('should return list of recent databases', async () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)
      const handler = getRouteHandler(router, '/databases', 'get')

      expect(handler).toBeDefined()

      if (handler) {
        const req = createMockReq()
        const { res, json } = createMockRes()

        await handler(req as Request, res as Response, vi.fn())

        expect(mockDbManager.getRecentDatabases).toHaveBeenCalled()
        expect(json).toHaveBeenCalledWith({
          databases: [
            {
              path: '/test/db1',
              name: 'db1',
              lastAccessed: '2024-01-01T00:00:00Z',
              modelName: 'test-model',
            },
          ],
        })
      }
    })
  })

  describe('POST /databases/switch', () => {
    it('should switch to specified database', async () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)
      const handler = getRouteHandler(router, '/databases/switch', 'post')

      expect(handler).toBeDefined()

      if (handler) {
        const req = createMockReq({ dbPath: '/new/db' })
        const { res, json } = createMockRes()

        await handler(req as Request, res as Response, vi.fn())

        expect(mockDbManager.switchDatabase).toHaveBeenCalledWith('/new/db')
        expect(mockDbManager.getCurrentConfig).toHaveBeenCalled()
        expect(json).toHaveBeenCalledWith({
          success: true,
          config: expect.objectContaining({ dbPath: '/test/db' }),
        })
      }
    })

    it('should return 400 if dbPath is missing', async () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)
      const handler = getRouteHandler(router, '/databases/switch', 'post')

      if (handler) {
        const req = createMockReq({ dbPath: '' })
        const { res } = createMockRes()
        const next = vi.fn()

        await handler(req as Request, res as Response, next)

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError))
        expect((next.mock.calls[0][0] as ValidationError).message).toBe(
          'dbPath is required and must be a string'
        )
      }
    })
  })

  describe('POST /databases/create', () => {
    it('should create a new database', async () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)
      const handler = getRouteHandler(router, '/databases/create', 'post')

      expect(handler).toBeDefined()

      if (handler) {
        const req = createMockReq({ dbPath: '/new/db', name: 'New DB', modelName: 'model1' })
        const { res, json } = createMockRes()

        await handler(req as Request, res as Response, vi.fn())

        expect(mockDbManager.createDatabase).toHaveBeenCalledWith({
          dbPath: '/new/db',
          name: 'New DB',
          modelName: 'model1',
        })
        expect(json).toHaveBeenCalledWith({
          success: true,
          config: expect.objectContaining({ dbPath: '/test/db' }),
        })
      }
    })

    it('should return 400 if dbPath is missing', async () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)
      const handler = getRouteHandler(router, '/databases/create', 'post')

      if (handler) {
        const req = createMockReq({})
        const { res } = createMockRes()
        const next = vi.fn()

        await handler(req as Request, res as Response, next)

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError))
        expect((next.mock.calls[0][0] as ValidationError).message).toBe(
          'dbPath is required and must be a string'
        )
      }
    })
  })

  describe('POST /databases/scan', () => {
    it('should scan directory for databases', async () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)
      const handler = getRouteHandler(router, '/databases/scan', 'post')

      expect(handler).toBeDefined()

      if (handler) {
        const req = createMockReq({ scanPath: '/test' })
        const { res, json } = createMockRes()

        await handler(req as Request, res as Response, vi.fn())

        expect(mockDbManager.scanForDatabases).toHaveBeenCalledWith('/test')
        expect(json).toHaveBeenCalledWith({
          databases: [
            { path: '/test/db1', name: 'db1', isKnown: true },
            { path: '/test/db2', name: 'db2', isKnown: false },
          ],
        })
      }
    })

    it('should return 400 if scanPath is missing', async () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)
      const handler = getRouteHandler(router, '/databases/scan', 'post')

      if (handler) {
        const req = createMockReq({})
        const { res } = createMockRes()
        const next = vi.fn()

        await handler(req as Request, res as Response, next)

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError))
        expect((next.mock.calls[0][0] as ValidationError).message).toBe(
          'scanPath is required and must be a string'
        )
      }
    })
  })

  describe('GET /allowed-roots', () => {
    it('should return allowed roots info', async () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)
      const handler = getRouteHandler(router, '/allowed-roots', 'get')

      expect(handler).toBeDefined()

      if (handler) {
        const req = createMockReq()
        const { res, json } = createMockRes()

        await handler(req as Request, res as Response, vi.fn())

        expect(mockDbManager.getAllowedRootsInfo).toHaveBeenCalled()
        expect(json).toHaveBeenCalledWith({
          roots: ['/home/user', '/test'],
          baseDir: '/home/user',
          envRoots: ['/home/user'],
          userRoots: ['/test'],
        })
      }
    })
  })

  describe('POST /allowed-roots', () => {
    it('should add an allowed root', async () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)
      const handler = getRouteHandler(router, '/allowed-roots', 'post')

      expect(handler).toBeDefined()

      if (handler) {
        const req = createMockReq({ path: '/new/root' })
        const { res, json } = createMockRes()

        await handler(req as Request, res as Response, vi.fn())

        expect(mockDbManager.addUserAllowedRoot).toHaveBeenCalledWith('/new/root')
        expect(mockDbManager.getAllowedRootsInfo).toHaveBeenCalled()
        expect(json).toHaveBeenCalledWith({
          success: true,
          roots: ['/home/user', '/test'],
          baseDir: '/home/user',
          envRoots: ['/home/user'],
          userRoots: ['/test'],
        })
      }
    })

    it('should return 400 if path is missing', async () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)
      const handler = getRouteHandler(router, '/allowed-roots', 'post')

      if (handler) {
        const req = createMockReq({})
        const { res } = createMockRes()
        const next = vi.fn()

        await handler(req as Request, res as Response, next)

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError))
        expect((next.mock.calls[0][0] as ValidationError).message).toBe(
          'path is required and must be a string'
        )
      }
    })
  })

  describe('DELETE /allowed-roots', () => {
    it('should remove an allowed root', async () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)
      const handler = getRouteHandler(router, '/allowed-roots', 'delete')

      expect(handler).toBeDefined()

      if (handler) {
        const req = createMockReq({ path: '/test' })
        const { res, json } = createMockRes()

        await handler(req as Request, res as Response, vi.fn())

        expect(mockDbManager.removeUserAllowedRoot).toHaveBeenCalledWith('/test')
        expect(mockDbManager.getAllowedRootsInfo).toHaveBeenCalled()
        expect(json).toHaveBeenCalledWith({
          success: true,
          roots: ['/home/user', '/test'],
          baseDir: '/home/user',
          envRoots: ['/home/user'],
          userRoots: ['/test'],
        })
      }
    })

    it('should return 400 if path is missing', async () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)
      const handler = getRouteHandler(router, '/allowed-roots', 'delete')

      if (handler) {
        const req = createMockReq({})
        const { res } = createMockRes()
        const next = vi.fn()

        await handler(req as Request, res as Response, next)

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError))
        expect((next.mock.calls[0][0] as ValidationError).message).toBe(
          'path is required and must be a string'
        )
      }
    })
  })

  describe('GET /browse', () => {
    it('should list directory contents', async () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)
      const handler = getRouteHandler(router, '/browse', 'get')

      expect(handler).toBeDefined()

      if (handler) {
        const req = createMockReq({}, { path: '/test', showHidden: 'false' })
        const { res, json } = createMockRes()

        await handler(req as Request, res as Response, vi.fn())

        expect(mockDbManager.listDirectory).toHaveBeenCalledWith('/test', false)
        expect(json).toHaveBeenCalledWith({
          entries: [
            { name: 'folder1', path: '/test/folder1', isDirectory: true },
            { name: 'file.txt', path: '/test/file.txt', isDirectory: false },
          ],
          path: '/test',
        })
      }
    })

    it('should pass showHidden=true when specified', async () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)
      const handler = getRouteHandler(router, '/browse', 'get')

      if (handler) {
        const req = createMockReq({}, { path: '/test', showHidden: 'true' })
        const { res } = createMockRes()

        await handler(req as Request, res as Response, vi.fn())

        expect(mockDbManager.listDirectory).toHaveBeenCalledWith('/test', true)
      }
    })

    it('should return 400 if path is missing', async () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)
      const handler = getRouteHandler(router, '/browse', 'get')

      if (handler) {
        const req = createMockReq({}, {})
        const { res } = createMockRes()
        const next = vi.fn()

        await handler(req as Request, res as Response, next)

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError))
        expect((next.mock.calls[0][0] as ValidationError).message).toBe(
          'path query parameter is required'
        )
      }
    })
  })

  describe('GET /models', () => {
    it('should return available embedding models', async () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)
      const handler = getRouteHandler(router, '/models', 'get')

      expect(handler).toBeDefined()

      if (handler) {
        const req = createMockReq()
        const { res, json } = createMockRes()

        await handler(req as Request, res as Response, vi.fn())

        expect(mockDbManager.getAvailableModels).toHaveBeenCalled()
        expect(json).toHaveBeenCalledWith({
          models: [{ id: 'model1', name: 'Model 1', description: 'Test model', isDefault: true }],
        })
      }
    })
  })

  describe('GET /export', () => {
    it('should export configuration', async () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)
      const handler = getRouteHandler(router, '/export', 'get')

      expect(handler).toBeDefined()

      if (handler) {
        const req = createMockReq()
        const { res, json } = createMockRes()

        await handler(req as Request, res as Response, vi.fn())

        expect(mockDbManager.exportConfig).toHaveBeenCalled()
        expect(json).toHaveBeenCalledWith({
          version: 1,
          exportedAt: '2024-01-01T00:00:00Z',
          allowedRoots: ['/test'],
        })
      }
    })
  })

  describe('POST /import', () => {
    it('should import configuration', async () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)
      const handler = getRouteHandler(router, '/import', 'post')

      expect(handler).toBeDefined()

      if (handler) {
        const config = {
          version: 1,
          exportedAt: '2024-01-01T00:00:00Z',
          allowedRoots: ['/imported'],
        }
        const req = createMockReq({ config })
        const { res, json } = createMockRes()

        await handler(req as Request, res as Response, vi.fn())

        expect(mockDbManager.importConfig).toHaveBeenCalledWith(config)
        expect(mockDbManager.getAllowedRootsInfo).toHaveBeenCalled()
        expect(json).toHaveBeenCalledWith({
          success: true,
          roots: ['/home/user', '/test'],
          baseDir: '/home/user',
          envRoots: ['/home/user'],
          userRoots: ['/test'],
        })
      }
    })

    it('should return 400 if config is missing', async () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)
      const handler = getRouteHandler(router, '/import', 'post')

      if (handler) {
        const req = createMockReq({})
        const { res } = createMockRes()
        const next = vi.fn()

        await handler(req as Request, res as Response, next)

        expect(next).toHaveBeenCalledWith(expect.any(ValidationError))
        expect((next.mock.calls[0][0] as ValidationError).message).toBe(
          'config is required and must be an object'
        )
      }
    })
  })

  describe('Router configuration', () => {
    it('should have all 11 expected routes', () => {
      const router = createConfigRouter(mockDbManager as DatabaseManager)

      const routes = router.stack
        .filter((layer: RouteLayer) => layer.route)
        .map((layer: RouteLayer) => ({
          path: layer.route!.path,
          methods: Object.keys(layer.route!.methods).filter((m) => layer.route!.methods[m]),
        }))

      expect(routes).toContainEqual({ path: '/current', methods: ['get'] })
      expect(routes).toContainEqual({ path: '/databases', methods: ['get'] })
      expect(routes).toContainEqual({ path: '/databases/switch', methods: ['post'] })
      expect(routes).toContainEqual({ path: '/databases/create', methods: ['post'] })
      expect(routes).toContainEqual({ path: '/databases/scan', methods: ['post'] })
      expect(routes).toContainEqual({ path: '/allowed-roots', methods: ['get'] })
      expect(routes).toContainEqual({ path: '/allowed-roots', methods: ['post'] })
      expect(routes).toContainEqual({ path: '/allowed-roots', methods: ['delete'] })
      expect(routes).toContainEqual({ path: '/browse', methods: ['get'] })
      expect(routes).toContainEqual({ path: '/models', methods: ['get'] })
      expect(routes).toContainEqual({ path: '/export', methods: ['get'] })
      expect(routes).toContainEqual({ path: '/import', methods: ['post'] })
    })
  })
})
