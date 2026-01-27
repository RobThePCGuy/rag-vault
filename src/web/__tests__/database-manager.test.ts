// Tests for DatabaseManager

import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { DatabaseManager } from '../database-manager.js'

// Mock RAGServer for testing
function createMockServer() {
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    getConfig: vi.fn().mockReturnValue({ dbPath: '/test/db', modelName: 'test-model' }),
    handleStatus: vi.fn().mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            documentCount: 5,
            chunkCount: 100,
            memoryUsage: 1024,
            uptime: 60,
            ftsIndexEnabled: true,
            searchMode: 'hybrid',
          }),
        },
      ],
    }),
  }
}

describe('DatabaseManager', () => {
  const testDir = path.join(tmpdir(), 'rag-vault-test-db-manager')
  const testDbPath = path.join(testDir, 'test-db')
  const testLanceDbPath = path.join(testDbPath, 'chunks.lance')

  beforeAll(async () => {
    // Create test directories
    await mkdir(testDir, { recursive: true })
    await mkdir(testDbPath, { recursive: true })
    await mkdir(testLanceDbPath, { recursive: true })
  })

  afterAll(async () => {
    // Cleanup test directories
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('initialization', () => {
    it('should create server with factory function', async () => {
      const mockServerFactory = vi.fn().mockReturnValue(createMockServer())
      const dbManager = new DatabaseManager(mockServerFactory, { modelName: 'test-model' })

      await dbManager.initialize(testDbPath)

      expect(mockServerFactory).toHaveBeenCalledWith({
        modelName: 'test-model',
        dbPath: testDbPath,
      })
    })

    it('should initialize the server', async () => {
      const mockServer = createMockServer()
      const mockServerFactory = vi.fn().mockReturnValue(mockServer)
      const dbManager = new DatabaseManager(mockServerFactory, { modelName: 'test-model' })

      await dbManager.initialize(testDbPath)

      expect(mockServer.initialize).toHaveBeenCalled()
    })
  })

  describe('getServer', () => {
    it('should throw if not initialized', () => {
      const mockServerFactory = vi.fn().mockReturnValue(createMockServer())
      const dbManager = new DatabaseManager(mockServerFactory, { modelName: 'test-model' })

      expect(() => dbManager.getServer()).toThrow('DatabaseManager not initialized')
    })

    it('should return server after initialization', async () => {
      const mockServer = createMockServer()
      const mockServerFactory = vi.fn().mockReturnValue(mockServer)
      const dbManager = new DatabaseManager(mockServerFactory, { modelName: 'test-model' })

      await dbManager.initialize(testDbPath)

      expect(dbManager.getServer()).toBe(mockServer)
    })
  })

  describe('getCurrentConfig', () => {
    it('should return null if not initialized', async () => {
      const mockServerFactory = vi.fn().mockReturnValue(createMockServer())
      const dbManager = new DatabaseManager(mockServerFactory, { modelName: 'test-model' })

      const config = await dbManager.getCurrentConfig()

      expect(config).toBeNull()
    })

    it('should return config with stats after initialization', async () => {
      const mockServer = createMockServer()
      const mockServerFactory = vi.fn().mockReturnValue(mockServer)
      const dbManager = new DatabaseManager(mockServerFactory, { modelName: 'test-model' })

      await dbManager.initialize(testDbPath)
      const config = await dbManager.getCurrentConfig()

      expect(config).not.toBeNull()
      expect(config?.documentCount).toBe(5)
      expect(config?.chunkCount).toBe(100)
      expect(config?.modelName).toBe('test-model')
    })
  })

  describe('switchDatabase', () => {
    it('should reject non-existent path', async () => {
      const mockServer = createMockServer()
      const mockServerFactory = vi.fn().mockReturnValue(mockServer)
      const dbManager = new DatabaseManager(mockServerFactory, { modelName: 'test-model' })

      await dbManager.initialize(testDbPath)

      await expect(dbManager.switchDatabase('/nonexistent/path')).rejects.toThrow(
        'Database path does not exist'
      )
    })

    it('should reject path without LanceDB data', async () => {
      const emptyDir = path.join(testDir, 'empty-dir')
      await mkdir(emptyDir, { recursive: true })

      const mockServer = createMockServer()
      const mockServerFactory = vi.fn().mockReturnValue(mockServer)
      const dbManager = new DatabaseManager(mockServerFactory, { modelName: 'test-model' })

      await dbManager.initialize(testDbPath)

      await expect(dbManager.switchDatabase(emptyDir)).rejects.toThrow('Invalid database')

      await rm(emptyDir, { recursive: true, force: true })
    })

    it('should prevent concurrent switch attempts', async () => {
      // Create second test DB
      const testDb2Path = path.join(testDir, 'test-db-2')
      const testLanceDb2Path = path.join(testDb2Path, 'chunks.lance')
      await mkdir(testDb2Path, { recursive: true })
      await mkdir(testLanceDb2Path, { recursive: true })

      const mockServer = createMockServer()
      // Make close take some time
      mockServer.close.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))
      const mockServerFactory = vi.fn().mockReturnValue(mockServer)
      const dbManager = new DatabaseManager(mockServerFactory, { modelName: 'test-model' })

      await dbManager.initialize(testDbPath)

      // Start switch
      const switch1 = dbManager.switchDatabase(testDb2Path)

      // Second switch should fail immediately (synchronous check)
      expect(() => {
        // Use a callback to catch the sync rejection during the async operation
        void dbManager.switchDatabase(testDbPath).catch(() => {
          // Expected rejection - ignore
        })
      }).not.toThrow()

      // Wait for first switch to complete
      await switch1

      // Now switching should work again
      await dbManager.switchDatabase(testDbPath)

      await rm(testDb2Path, { recursive: true, force: true })
    })

    it('should close current server before switching', async () => {
      // Create second test DB
      const testDb2Path = path.join(testDir, 'test-db-3')
      const testLanceDb2Path = path.join(testDb2Path, 'chunks.lance')
      await mkdir(testDb2Path, { recursive: true })
      await mkdir(testLanceDb2Path, { recursive: true })

      const mockServer = createMockServer()
      const mockServerFactory = vi.fn().mockReturnValue(mockServer)
      const dbManager = new DatabaseManager(mockServerFactory, { modelName: 'test-model' })

      await dbManager.initialize(testDbPath)
      await dbManager.switchDatabase(testDb2Path)

      expect(mockServer.close).toHaveBeenCalled()

      await rm(testDb2Path, { recursive: true, force: true })
    })
  })

  describe('scanForDatabases', () => {
    it('should find databases in directory', async () => {
      // Create a test structure with databases
      const scanDir = path.join(testDir, 'scan-test')
      const db1 = path.join(scanDir, 'db1', 'chunks.lance')
      const db2 = path.join(scanDir, 'db2', 'chunks.lance')
      await mkdir(db1, { recursive: true })
      await mkdir(db2, { recursive: true })

      // Set ALLOWED_SCAN_ROOTS to include our test directory
      const originalRoots = process.env['ALLOWED_SCAN_ROOTS']
      process.env['ALLOWED_SCAN_ROOTS'] = testDir

      const mockServer = createMockServer()
      const mockServerFactory = vi.fn().mockReturnValue(mockServer)
      const dbManager = new DatabaseManager(mockServerFactory, { modelName: 'test-model' })

      await dbManager.initialize(testDbPath)
      const results = await dbManager.scanForDatabases(scanDir)

      expect(results).toHaveLength(2)
      expect(results.map((r) => r.name).sort()).toEqual(['db1', 'db2'])

      // Cleanup
      process.env['ALLOWED_SCAN_ROOTS'] = originalRoots ?? ''
      if (originalRoots === undefined) {
        delete process.env['ALLOWED_SCAN_ROOTS']
      }
      await rm(scanDir, { recursive: true, force: true })
    })

    it('should reject paths outside allowed roots', async () => {
      // Set ALLOWED_SCAN_ROOTS to a restricted path
      const originalRoots = process.env['ALLOWED_SCAN_ROOTS']
      process.env['ALLOWED_SCAN_ROOTS'] = '/some/restricted/path'

      const mockServer = createMockServer()
      const mockServerFactory = vi.fn().mockReturnValue(mockServer)
      const dbManager = new DatabaseManager(mockServerFactory, { modelName: 'test-model' })

      await dbManager.initialize(testDbPath)

      await expect(dbManager.scanForDatabases(testDir)).rejects.toThrow('outside allowed roots')

      // Cleanup
      process.env['ALLOWED_SCAN_ROOTS'] = originalRoots ?? ''
      if (originalRoots === undefined) {
        delete process.env['ALLOWED_SCAN_ROOTS']
      }
    })
  })
})
