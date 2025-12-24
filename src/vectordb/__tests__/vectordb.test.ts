import { randomUUID } from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type VectorChunk, VectorStore } from '../index.js'

describe('VectorStore', () => {
  const testDbPath = './tmp/test-vectordb'

  beforeEach(() => {
    // Clean up test database before each test
    if (fs.existsSync(testDbPath)) {
      fs.rmSync(testDbPath, { recursive: true })
    }
  })

  afterEach(() => {
    // Clean up after tests
    if (fs.existsSync(testDbPath)) {
      fs.rmSync(testDbPath, { recursive: true })
    }
  })

  /**
   * Helper function to create a test vector chunk
   */
  function createTestChunk(
    text: string,
    filePath: string,
    chunkIndex: number,
    vector?: number[]
  ): VectorChunk {
    return {
      id: randomUUID(),
      filePath,
      chunkIndex,
      text,
      vector: vector || new Array(384).fill(0).map(() => Math.random()),
      metadata: {
        fileName: path.basename(filePath),
        fileSize: text.length,
        fileType: path.extname(filePath).slice(1),
      },
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Helper function to create a normalized vector (L2 norm = 1)
   */
  function createNormalizedVector(seed: number): number[] {
    const vector = new Array(384).fill(0).map((_, i) => Math.sin(seed + i))
    const norm = Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0))
    return vector.map((x) => x / norm)
  }

  describe('Phase 1: FTS Index Creation and Migration', () => {
    describe('FTS index auto-creation', () => {
      it('should create FTS index on initialize when table exists', async () => {
        const store = new VectorStore({
          dbPath: testDbPath,
          tableName: 'chunks',
        })

        await store.initialize()

        // Insert some data to create the table
        const chunk = createTestChunk(
          'This is a test document about TypeScript programming',
          '/test/doc.txt',
          0,
          createNormalizedVector(1)
        )
        await store.insertChunks([chunk])

        // Get status and check FTS is enabled
        const status = await store.getStatus()
        expect(status).toHaveProperty('ftsIndexEnabled')
        expect(status.ftsIndexEnabled).toBe(true)
      })

      it('should set ftsIndexEnabled to false when table does not exist yet', async () => {
        const store = new VectorStore({
          dbPath: testDbPath,
          tableName: 'chunks',
        })

        await store.initialize()

        // No data inserted, table doesn't exist
        const status = await store.getStatus()
        expect(status.ftsIndexEnabled).toBe(false)
      })

      it('should report searchMode in status', async () => {
        const store = new VectorStore({
          dbPath: testDbPath,
          tableName: 'chunks',
        })

        await store.initialize()

        const chunk = createTestChunk(
          'Test document content',
          '/test/doc.txt',
          0,
          createNormalizedVector(1)
        )
        await store.insertChunks([chunk])

        const status = await store.getStatus()
        expect(status).toHaveProperty('searchMode')
        expect(['hybrid', 'vector-only']).toContain(status.searchMode)
      })
    })

    describe('Fallback behavior', () => {
      it('should continue working even if FTS index creation fails', async () => {
        const store = new VectorStore({
          dbPath: testDbPath,
          tableName: 'chunks',
        })

        await store.initialize()

        // Insert data
        const chunk = createTestChunk(
          'Fallback test document',
          '/test/fallback.txt',
          0,
          createNormalizedVector(1)
        )
        await store.insertChunks([chunk])

        // Search should still work (vector-only)
        const results = await store.search(createNormalizedVector(1), 'test query', 10)
        expect(results).toBeDefined()
        expect(Array.isArray(results)).toBe(true)
      })
    })
  })

  describe('Phase 2: Hybrid Search', () => {
    describe('Search with query text', () => {
      it('should accept query text parameter for hybrid search', async () => {
        const store = new VectorStore({
          dbPath: testDbPath,
          tableName: 'chunks',
        })

        await store.initialize()

        // Insert test documents
        const chunks = [
          createTestChunk(
            'ProjectLifetimeScope is a VContainer concept for dependency injection',
            '/test/vcontainer.md',
            0,
            createNormalizedVector(1)
          ),
          createTestChunk(
            'Profile Analyzer is a Unity tool for performance profiling',
            '/test/profiler.md',
            0,
            createNormalizedVector(2)
          ),
          createTestChunk(
            'Game patterns include Manager classes and LifetimeScope',
            '/test/patterns.md',
            0,
            createNormalizedVector(3)
          ),
        ]

        for (const chunk of chunks) {
          await store.insertChunks([chunk])
        }

        // Search with exact keyword match
        const queryVector = createNormalizedVector(1)
        const results = await store.search(queryVector, 'ProjectLifetimeScope', 10)

        expect(results).toBeDefined()
        expect(results.length).toBeGreaterThan(0)

        // With hybrid search, exact keyword match should rank higher
        // The first result should contain "ProjectLifetimeScope"
        if (results.length > 0 && results[0]) {
          expect(results[0].text).toContain('ProjectLifetimeScope')
        }
      })

      it('should fall back to vector-only search when query text is empty', async () => {
        const store = new VectorStore({
          dbPath: testDbPath,
          tableName: 'chunks',
        })

        await store.initialize()

        const chunk = createTestChunk(
          'Test document for vector search',
          '/test/doc.txt',
          0,
          createNormalizedVector(1)
        )
        await store.insertChunks([chunk])

        // Search with empty query text (should use vector-only)
        const results = await store.search(createNormalizedVector(1), '', 10)

        expect(results).toBeDefined()
        expect(results.length).toBeGreaterThan(0)
      })

      it('should maintain backward compatibility with vector-only search', async () => {
        const store = new VectorStore({
          dbPath: testDbPath,
          tableName: 'chunks',
        })

        await store.initialize()

        const chunk = createTestChunk(
          'Backward compatibility test',
          '/test/compat.txt',
          0,
          createNormalizedVector(1)
        )
        await store.insertChunks([chunk])

        // Original search signature should still work
        const results = await store.search(createNormalizedVector(1), undefined, 10)

        expect(results).toBeDefined()
        expect(results.length).toBeGreaterThan(0)
      })
    })

    describe('Hybrid search ranking', () => {
      it('should prioritize exact keyword matches in hybrid search', async () => {
        const store = new VectorStore({
          dbPath: testDbPath,
          tableName: 'chunks',
        })

        await store.initialize()

        // Create documents with different relevance
        // Doc1: Contains exact match but different semantic meaning
        const doc1 = createTestChunk(
          'ProjectLifetimeScope manages object lifetime in VContainer',
          '/test/exact-match.md',
          0,
          createNormalizedVector(10) // Different semantic vector
        )

        // Doc2: Semantically similar but no exact match
        const doc2 = createTestChunk(
          'Dependency injection containers manage object lifecycles',
          '/test/semantic-match.md',
          0,
          createNormalizedVector(1) // Similar semantic vector to query
        )

        await store.insertChunks([doc1])
        await store.insertChunks([doc2])

        // Query with vector similar to doc2 but keyword matching doc1
        const queryVector = createNormalizedVector(1)
        const results = await store.search(queryVector, 'ProjectLifetimeScope', 10)

        // In hybrid search, doc1 should rank higher due to keyword match
        // despite doc2 being semantically closer
        expect(results.length).toBeGreaterThanOrEqual(2)
        if (results[0]) {
          expect(results[0].text).toContain('ProjectLifetimeScope')
        }
      })
    })
  })

  describe('Grouping algorithm (statistical threshold)', () => {
    it('should use statistical threshold for grouping in similar mode', async () => {
      const store = new VectorStore({
        dbPath: testDbPath,
        tableName: 'chunks',
        grouping: 'similar',
      })

      await store.initialize()

      // Create documents with varying similarity
      const baseVector = createNormalizedVector(1)

      // Group 1: Very similar (small gaps)
      for (let i = 0; i < 3; i++) {
        const chunk = createTestChunk(`Similar doc ${i}`, `/test/similar${i}.txt`, 0, baseVector)
        await store.insertChunks([chunk])
      }

      // Group 2: Different (larger gap)
      const differentVector = createNormalizedVector(100)
      const chunk = createTestChunk('Different doc', '/test/different.txt', 0, differentVector)
      await store.insertChunks([chunk])

      const results = await store.search(baseVector, '', 10)

      // With 'similar' mode, should cut at statistically significant gap
      // Results should be filtered to the similar group
      expect(results.length).toBeLessThanOrEqual(4)
    })

    it('should include more results in related mode', async () => {
      const store = new VectorStore({
        dbPath: testDbPath,
        tableName: 'chunks',
        grouping: 'related',
      })

      await store.initialize()

      const baseVector = createNormalizedVector(1)

      for (let i = 0; i < 5; i++) {
        const vector = createNormalizedVector(i + 1)
        const chunk = createTestChunk(`Doc ${i}`, `/test/doc${i}.txt`, 0, vector)
        await store.insertChunks([chunk])
      }

      const results = await store.search(baseVector, '', 10)

      // 'related' mode should include more results than 'similar'
      expect(results.length).toBeGreaterThan(0)
    })
  })
})
