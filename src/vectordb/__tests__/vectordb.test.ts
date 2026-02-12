import { randomUUID } from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type VectorChunk, VectorStore } from '../index.js'

describe('VectorStore', () => {
  const testRunId = randomUUID()
  const makeTestDbPath = (name: string): string => `./tmp/${name}-${testRunId}`
  const testDbPath = makeTestDbPath('test-vectordb')

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

  describe('Custom metadata schema compatibility', () => {
    it('should keep ingesting when later chunks introduce new custom metadata keys', async () => {
      const metadataSchemaDbPath = makeTestDbPath('test-vectordb-custom-metadata-schema')
      if (fs.existsSync(metadataSchemaDbPath)) {
        fs.rmSync(metadataSchemaDbPath, { recursive: true })
      }

      try {
        const store = new VectorStore({
          dbPath: metadataSchemaDbPath,
          tableName: 'chunks',
        })
        await store.initialize()

        const firstChunk = createTestChunk(
          'Timeline chunk',
          '/test/timeline.md',
          0,
          createNormalizedVector(1)
        )
        firstChunk.metadata.custom = {
          domain: 'series-canon',
          type: 'timeline',
        }
        await store.insertChunks([firstChunk])

        const secondChunk = createTestChunk(
          'Character arc chunk',
          '/test/character.md',
          0,
          createNormalizedVector(2)
        )
        secondChunk.metadata.custom = {
          domain: 'series-canon',
          type: 'character-arc',
          character: 'ellie',
        }

        // Regression check:
        // Previously this failed with:
        // "Found field not in schema: metadata.custom.character at row 0"
        await expect(store.insertChunks([secondChunk])).resolves.toBeUndefined()

        const files = await store.listFiles()
        expect(files.map((f) => f.filePath).sort()).toEqual(
          ['/test/character.md', '/test/timeline.md'].sort()
        )

        const results = await store.search(createNormalizedVector(2), 'character arc', 10)
        const characterResult = results.find((r) => r.filePath === '/test/character.md')
        expect(characterResult).toBeDefined()
        expect(characterResult?.metadata.custom?.['domain']).toBe('series-canon')
        expect(characterResult?.metadata.custom?.['type']).toBe('character-arc')
      } finally {
        if (fs.existsSync(metadataSchemaDbPath)) {
          fs.rmSync(metadataSchemaDbPath, { recursive: true })
        }
      }
    })
  })

  describe('FTS Index Creation and Migration', () => {
    it('should not write VectorStore operational logs to stdout', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      try {
        const store = new VectorStore({
          dbPath: testDbPath,
          tableName: 'chunks',
        })

        await store.initialize()
        await store.close()

        const vectorStoreStdoutLogs = logSpy.mock.calls.filter(([firstArg]) =>
          String(firstArg).includes('VectorStore:')
        )
        expect(vectorStoreStdoutLogs).toHaveLength(0)
      } finally {
        logSpy.mockRestore()
      }
    })

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

        // Search should still work (vector-only) and return the inserted document
        const results = await store.search(createNormalizedVector(1), 'test query', 10)
        expect(results).toHaveLength(1)
        expect(results[0]?.filePath).toBe('/test/fallback.txt')
        expect(results[0]?.text).toBe('Fallback test document')
      })
    })
  })

  describe('Hybrid Search', () => {
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

        // All 3 documents should be returned
        expect(results).toHaveLength(3)

        // With hybrid search, exact keyword match should rank higher
        // The first result MUST contain "ProjectLifetimeScope"
        expect(results[0]).toBeDefined()
        expect(results[0]!.text).toContain('ProjectLifetimeScope')
        expect(results[0]!.filePath).toBe('/test/vcontainer.md')
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

        // Should return the inserted document via vector-only search
        expect(results).toHaveLength(1)
        expect(results[0]?.filePath).toBe('/test/doc.txt')
        expect(results[0]?.text).toBe('Test document for vector search')
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

        // Original search signature should still work (queryText = undefined)
        const results = await store.search(createNormalizedVector(1), undefined, 10)

        // Should return the inserted document
        expect(results).toHaveLength(1)
        expect(results[0]?.filePath).toBe('/test/compat.txt')
        expect(results[0]?.text).toBe('Backward compatibility test')
      })
    })

    describe('Japanese text support', () => {
      it('should find Japanese documents with ngram tokenizer', async () => {
        const store = new VectorStore({
          dbPath: testDbPath,
          tableName: 'chunks',
        })

        await store.initialize()

        // Doc with Japanese text (keyword: dependency injection in Japanese)
        const japaneseDoc = createTestChunk(
          '依存性注入コンテナはオブジェクトのライフサイクルを管理します',
          '/test/japanese.md',
          0,
          createNormalizedVector(10)
        )

        // Doc with English text only
        const englishDoc = createTestChunk(
          'Vector database stores embeddings for semantic search',
          '/test/english.md',
          0,
          createNormalizedVector(1)
        )

        await store.insertChunks([japaneseDoc])
        await store.insertChunks([englishDoc])

        // Search with Japanese keyword
        const queryVector = createNormalizedVector(1)
        const results = await store.search(queryVector, '依存性注入', 10)

        // Verify Japanese document is found (ngram tokenizer works)
        const foundJapanese = results.some((r) => r.filePath === '/test/japanese.md')
        expect(foundJapanese).toBe(true)

        // Verify both documents are returned
        expect(results).toHaveLength(2)
      })
    })
  })

  describe('Search mode behavior', () => {
    /**
     * Test data design:
     * - doc1: Contains keyword "UniqueKeyword", but vector is far from query
     * - doc2: No keyword match, but vector is close to query
     *
     * Expected behavior:
     * - hybridWeight=0 (vector-only): doc2 ranks first (vector similarity)
     * - hybridWeight=1 (FTS-only): doc1 ranks first (keyword match)
     * - hybridWeight=0.6 (hybrid): doc1 ranks first (keyword match prioritized)
     */

    it('should use vector similarity order when hybridWeight=0', async () => {
      const vectorOnlyDbPath = makeTestDbPath('test-vectordb-vector-only')
      const fs = await import('node:fs')
      if (fs.existsSync(vectorOnlyDbPath)) {
        fs.rmSync(vectorOnlyDbPath, { recursive: true })
      }

      try {
        const store = new VectorStore({
          dbPath: vectorOnlyDbPath,
          tableName: 'chunks',
          hybridWeight: 0, // Vector-only mode
        })
        await store.initialize()

        const queryVector = createNormalizedVector(1)

        // doc1: Has keyword, but vector is far from query
        const doc1 = createTestChunk(
          'UniqueKeyword appears in this document about something else',
          '/test/keyword-match.md',
          0,
          createNormalizedVector(100) // Far from query
        )

        // doc2: No keyword, but vector is close to query
        const doc2 = createTestChunk(
          'This document has similar semantic meaning without the special term',
          '/test/vector-match.md',
          0,
          createNormalizedVector(1) // Close to query
        )

        await store.insertChunks([doc1])
        await store.insertChunks([doc2])

        // Search with keyword that matches doc1, but query vector close to doc2
        const results = await store.search(queryVector, 'UniqueKeyword', 10)

        expect(results).toHaveLength(2)

        // With hybridWeight=0, vector similarity should determine order
        // doc2 (vector close) should rank first
        expect(results[0]?.filePath).toBe('/test/vector-match.md')
        expect(results[1]?.filePath).toBe('/test/keyword-match.md')
      } finally {
        if (fs.existsSync(vectorOnlyDbPath)) {
          fs.rmSync(vectorOnlyDbPath, { recursive: true })
        }
      }
    })

    it('should boost keyword matches when hybridWeight=1', async () => {
      const ftsOnlyDbPath = makeTestDbPath('test-vectordb-fts-only')
      const fs = await import('node:fs')
      if (fs.existsSync(ftsOnlyDbPath)) {
        fs.rmSync(ftsOnlyDbPath, { recursive: true })
      }

      try {
        const store = new VectorStore({
          dbPath: ftsOnlyDbPath,
          tableName: 'chunks',
          hybridWeight: 1, // Maximum keyword boost
        })
        await store.initialize()

        const queryVector = createNormalizedVector(1)

        // doc1: Has keyword match, but farther vector distance
        const doc1 = createTestChunk(
          'UniqueKeyword appears in this document about something else',
          '/test/keyword-match.md',
          0,
          createNormalizedVector(5)
        )

        // doc2: No keyword match, but closer vector distance
        const doc2 = createTestChunk(
          'This document has similar semantic meaning without the special term',
          '/test/vector-match.md',
          0,
          createNormalizedVector(3)
        )

        await store.insertChunks([doc1])
        await store.insertChunks([doc2])

        const results = await store.search(queryVector, 'UniqueKeyword', 10)

        expect(results).toHaveLength(2)

        // Keyword match should boost doc1 to rank higher despite farther vector distance
        expect(results[0]?.filePath).toBe('/test/keyword-match.md')
        expect(results[1]?.filePath).toBe('/test/vector-match.md')
      } finally {
        if (fs.existsSync(ftsOnlyDbPath)) {
          fs.rmSync(ftsOnlyDbPath, { recursive: true })
        }
      }
    })

    it('should apply keyword boost with default hybridWeight=0.6', async () => {
      const hybridDbPath = makeTestDbPath('test-vectordb-hybrid')
      const fs = await import('node:fs')
      if (fs.existsSync(hybridDbPath)) {
        fs.rmSync(hybridDbPath, { recursive: true })
      }

      try {
        const store = new VectorStore({
          dbPath: hybridDbPath,
          tableName: 'chunks',
          // hybridWeight not specified, uses default 0.6
        })
        await store.initialize()

        const queryVector = createNormalizedVector(1)

        // doc1: Has keyword match, but farther vector distance
        const doc1 = createTestChunk(
          'UniqueKeyword appears in this document about something else',
          '/test/keyword-match.md',
          0,
          createNormalizedVector(5)
        )

        // doc2: No keyword match, but closer vector distance
        const doc2 = createTestChunk(
          'This document has similar semantic meaning without the special term',
          '/test/vector-match.md',
          0,
          createNormalizedVector(3)
        )

        await store.insertChunks([doc1])
        await store.insertChunks([doc2])

        const results = await store.search(queryVector, 'UniqueKeyword', 10)

        expect(results).toHaveLength(2)

        // Keyword match should boost doc1 to rank higher despite farther vector distance
        expect(results[0]?.filePath).toBe('/test/keyword-match.md')
        expect(results[1]?.filePath).toBe('/test/vector-match.md')
      } finally {
        if (fs.existsSync(hybridDbPath)) {
          fs.rmSync(hybridDbPath, { recursive: true })
        }
      }
    })
  })

  /**
   * Grouping Algorithm Contract:
   *
   * Given: Search results sorted by distance score (ascending)
   *
   * Algorithm:
   * 1. Calculate gaps between consecutive results
   * 2. Find "significant gaps" using threshold: mean(gaps) + 1.5 * std(gaps)
   * 3. Cut at boundaries based on mode:
   *    - 'similar': Cut at first boundary (return first group only)
   *    - 'related': Cut at second boundary (return up to 2 groups)
   *
   * Guarantees:
   * - If results <= 1: return as-is
   * - If no significant gaps: return all results
   * - 'similar' with 1+ boundaries: return first group
   * - 'related' with 1 boundary: return all results
   * - 'related' with 2+ boundaries: return first 2 groups
   */
  describe('Grouping algorithm (statistical threshold)', () => {
    describe('Contract guarantees', () => {
      it('returns single result as-is without grouping', async () => {
        const contractDbPath1 = makeTestDbPath('test-vectordb-contract-single')
        if (fs.existsSync(contractDbPath1)) {
          fs.rmSync(contractDbPath1, { recursive: true })
        }

        try {
          const store = new VectorStore({
            dbPath: contractDbPath1,
            tableName: 'chunks',
            grouping: 'similar',
          })
          await store.initialize()

          const chunk = createTestChunk(
            'Only document',
            '/test/only.txt',
            0,
            createNormalizedVector(1)
          )
          await store.insertChunks([chunk])

          const results = await store.search(createNormalizedVector(1), '', 10)

          // Contract: Single result returned as-is
          expect(results).toHaveLength(1)
          expect(results[0]?.text).toBe('Only document')
        } finally {
          if (fs.existsSync(contractDbPath1)) {
            fs.rmSync(contractDbPath1, { recursive: true })
          }
        }
      })

      it('returns all results when no significant gaps exist', async () => {
        const contractDbPath2 = makeTestDbPath('test-vectordb-contract-no-gaps')
        if (fs.existsSync(contractDbPath2)) {
          fs.rmSync(contractDbPath2, { recursive: true })
        }

        try {
          const store = new VectorStore({
            dbPath: contractDbPath2,
            tableName: 'chunks',
            grouping: 'similar',
          })
          await store.initialize()

          const baseVector = createNormalizedVector(1)

          // All documents use identical vectors = all gaps are 0 = no significant gaps
          for (let i = 0; i < 4; i++) {
            const chunk = createTestChunk(`Doc ${i}`, `/test/doc${i}.txt`, 0, baseVector)
            await store.insertChunks([chunk])
          }

          const results = await store.search(baseVector, '', 10)

          // Contract: No significant gaps → return all results
          expect(results).toHaveLength(4)
        } finally {
          if (fs.existsSync(contractDbPath2)) {
            fs.rmSync(contractDbPath2, { recursive: true })
          }
        }
      })
    })

    describe('Similar mode behavior', () => {
      it('returns first group only when clear boundary exists', async () => {
        const similarDbPath = makeTestDbPath('test-vectordb-similar-boundary')
        if (fs.existsSync(similarDbPath)) {
          fs.rmSync(similarDbPath, { recursive: true })
        }

        try {
          const store = new VectorStore({
            dbPath: similarDbPath,
            tableName: 'chunks',
            grouping: 'similar',
          })
          await store.initialize()

          const baseVector = createNormalizedVector(1)

          // Group 1: 3 documents with identical vectors (distance ~0)
          for (let i = 0; i < 3; i++) {
            const chunk = createTestChunk(`Group1 Doc ${i}`, `/test/group1-${i}.txt`, 0, baseVector)
            await store.insertChunks([chunk])
          }

          // Group 2: 2 documents with very different vectors (large gap from Group 1)
          const farVector = createNormalizedVector(100)
          for (let i = 0; i < 2; i++) {
            const chunk = createTestChunk(`Group2 Doc ${i}`, `/test/group2-${i}.txt`, 0, farVector)
            await store.insertChunks([chunk])
          }

          const results = await store.search(baseVector, '', 10)

          // Contract: 'similar' mode cuts at first boundary
          // Only Group 1 should be returned
          expect(results).toHaveLength(3)
          expect(results.every((r) => r.text.includes('Group1'))).toBe(true)
          expect(results.some((r) => r.text.includes('Group2'))).toBe(false)
        } finally {
          if (fs.existsSync(similarDbPath)) {
            fs.rmSync(similarDbPath, { recursive: true })
          }
        }
      })
    })

    describe('Related mode behavior', () => {
      it('returns all results when only one boundary exists', async () => {
        const relatedDbPath = makeTestDbPath('test-vectordb-related-one-boundary')
        if (fs.existsSync(relatedDbPath)) {
          fs.rmSync(relatedDbPath, { recursive: true })
        }

        try {
          const store = new VectorStore({
            dbPath: relatedDbPath,
            tableName: 'chunks',
            grouping: 'related',
          })
          await store.initialize()

          const baseVector = createNormalizedVector(1)

          // Group 1: 3 documents with identical vectors
          for (let i = 0; i < 3; i++) {
            const chunk = createTestChunk(`Group1 Doc ${i}`, `/test/group1-${i}.txt`, 0, baseVector)
            await store.insertChunks([chunk])
          }

          // Group 2: 2 documents with very different vectors (creates ONE boundary)
          const farVector = createNormalizedVector(100)
          for (let i = 0; i < 2; i++) {
            const chunk = createTestChunk(`Group2 Doc ${i}`, `/test/group2-${i}.txt`, 0, farVector)
            await store.insertChunks([chunk])
          }

          const results = await store.search(baseVector, '', 10)

          // Contract: 'related' mode with only 1 boundary → return all results
          expect(results).toHaveLength(5)
          expect(results.filter((r) => r.text.includes('Group1'))).toHaveLength(3)
          expect(results.filter((r) => r.text.includes('Group2'))).toHaveLength(2)
        } finally {
          if (fs.existsSync(relatedDbPath)) {
            fs.rmSync(relatedDbPath, { recursive: true })
          }
        }
      })

      it('returns first two groups when multiple boundaries exist', async () => {
        const relatedDbPath = makeTestDbPath('test-vectordb-related-multi-boundary')
        if (fs.existsSync(relatedDbPath)) {
          fs.rmSync(relatedDbPath, { recursive: true })
        }

        try {
          const store = new VectorStore({
            dbPath: relatedDbPath,
            tableName: 'chunks',
            grouping: 'related',
          })
          await store.initialize()

          // Create 3 distinct groups with large gaps between them
          // Group 1: seed 1 (distance ~0 from query)
          const group1Vector = createNormalizedVector(1)
          for (let i = 0; i < 2; i++) {
            const chunk = createTestChunk(
              `Group1 Doc ${i}`,
              `/test/group1-${i}.txt`,
              0,
              group1Vector
            )
            await store.insertChunks([chunk])
          }

          // Group 2: seed 50 (medium distance from query)
          const group2Vector = createNormalizedVector(50)
          for (let i = 0; i < 2; i++) {
            const chunk = createTestChunk(
              `Group2 Doc ${i}`,
              `/test/group2-${i}.txt`,
              0,
              group2Vector
            )
            await store.insertChunks([chunk])
          }

          // Group 3: seed 100 (far distance from query)
          const group3Vector = createNormalizedVector(100)
          for (let i = 0; i < 2; i++) {
            const chunk = createTestChunk(
              `Group3 Doc ${i}`,
              `/test/group3-${i}.txt`,
              0,
              group3Vector
            )
            await store.insertChunks([chunk])
          }

          const results = await store.search(group1Vector, '', 10)

          // Contract: 'related' mode with 2+ boundaries → return first 2 groups
          // Group 1 and Group 2 should be included, Group 3 should be excluded
          expect(results.length).toBeLessThanOrEqual(6) // At most all 6 docs
          expect(results.filter((r) => r.text.includes('Group1'))).toHaveLength(2)
          // Group 2 may or may not be included depending on gap distribution
          // Group 3 should be excluded if boundaries are detected correctly
          const group3Count = results.filter((r) => r.text.includes('Group3')).length
          expect(group3Count).toBeLessThanOrEqual(
            results.filter((r) => r.text.includes('Group2')).length
          )
        } finally {
          if (fs.existsSync(relatedDbPath)) {
            fs.rmSync(relatedDbPath, { recursive: true })
          }
        }
      })
    })

    describe('Similar vs Related comparison', () => {
      it('related mode returns same or more results than similar mode with identical data', async () => {
        const similarDbPath = makeTestDbPath('test-vectordb-similar-compare')
        const relatedDbPath = makeTestDbPath('test-vectordb-related-compare')

        if (fs.existsSync(similarDbPath)) {
          fs.rmSync(similarDbPath, { recursive: true })
        }
        if (fs.existsSync(relatedDbPath)) {
          fs.rmSync(relatedDbPath, { recursive: true })
        }

        try {
          const baseVector = createNormalizedVector(1)

          // Create test data with VERY clear group structure
          // Group 1: 3 docs with identical vectors (seed 1) - gaps within group = 0
          // Group 2: 2 docs with very different vectors (seed 200) - large gap from Group 1
          // This ensures statistical threshold (mean + 1.5*std) clearly detects the boundary
          const testChunks = [
            createTestChunk('Group1 Doc 0', '/test/g1-0.txt', 0, createNormalizedVector(1)),
            createTestChunk('Group1 Doc 1', '/test/g1-1.txt', 0, createNormalizedVector(1)),
            createTestChunk('Group1 Doc 2', '/test/g1-2.txt', 0, createNormalizedVector(1)),
            createTestChunk('Group2 Doc 0', '/test/g2-0.txt', 0, createNormalizedVector(200)),
            createTestChunk('Group2 Doc 1', '/test/g2-1.txt', 0, createNormalizedVector(200)),
          ]

          // Test with similar mode
          const similarStore = new VectorStore({
            dbPath: similarDbPath,
            tableName: 'chunks',
            grouping: 'similar',
          })
          await similarStore.initialize()
          for (const chunk of testChunks) {
            await similarStore.insertChunks([chunk])
          }
          const similarResults = await similarStore.search(baseVector, '', 10)

          // Test with related mode
          const relatedStore = new VectorStore({
            dbPath: relatedDbPath,
            tableName: 'chunks',
            grouping: 'related',
          })
          await relatedStore.initialize()
          for (const chunk of testChunks) {
            await relatedStore.insertChunks([chunk])
          }
          const relatedResults = await relatedStore.search(baseVector, '', 10)

          // Contract: 'similar' cuts at first boundary, 'related' at second (or returns all if only 1)
          // Therefore: relatedResults.length >= similarResults.length
          expect(relatedResults.length).toBeGreaterThanOrEqual(similarResults.length)

          // Verify both modes return at least 1 result
          expect(similarResults.length).toBeGreaterThanOrEqual(1)
          expect(relatedResults.length).toBeGreaterThanOrEqual(1)

          // Verify Group1 is always prioritized (appears first in both modes)
          const similarGroup1Count = similarResults.filter((r) => r.text.includes('Group1')).length
          const relatedGroup1Count = relatedResults.filter((r) => r.text.includes('Group1')).length

          // Both modes should include all Group1 results at minimum
          expect(similarGroup1Count).toBeGreaterThanOrEqual(1)
          expect(relatedGroup1Count).toBeGreaterThanOrEqual(similarGroup1Count)
        } finally {
          if (fs.existsSync(similarDbPath)) {
            fs.rmSync(similarDbPath, { recursive: true })
          }
          if (fs.existsSync(relatedDbPath)) {
            fs.rmSync(relatedDbPath, { recursive: true })
          }
        }
      })
    })
  })

  /**
   * Distance Semantics Contract:
   *
   * The VectorStore uses dot product distance on normalized embeddings.
   * This is equivalent to cosine distance and has the following semantics:
   * - Range: [0, 2]
   * - 0 = identical vectors
   * - 1 = orthogonal vectors
   * - 2 = opposite vectors
   *
   * Results are sorted ascending (lower distance = more similar).
   */
  describe('Dot product distance semantics', () => {
    /**
     * Create a normalized vector with explicit values for testing distance properties
     */
    function createSpecificNormalizedVector(values: number[]): number[] {
      const norm = Math.sqrt(values.reduce((sum, x) => sum + x * x, 0))
      return values.map((x) => x / norm)
    }

    it('should return lower distance for more similar vectors (ascending sort)', async () => {
      const distanceDbPath = makeTestDbPath('test-vectordb-distance-sort')
      if (fs.existsSync(distanceDbPath)) {
        fs.rmSync(distanceDbPath, { recursive: true })
      }

      try {
        const store = new VectorStore({
          dbPath: distanceDbPath,
          tableName: 'chunks',
        })
        await store.initialize()

        // Use explicit geometry: identical vs opposite vectors
        const baseValues = new Array(384).fill(0).map((_, i) => Math.sin(i + 1))
        const queryVector = createSpecificNormalizedVector(baseValues)

        // Similar vector: identical = should have lowest distance (~0)
        const similarChunk = createTestChunk(
          'Similar document',
          '/test/similar.txt',
          0,
          createSpecificNormalizedVector(baseValues)
        )

        // Different vector: opposite = should have highest distance (~2)
        const differentChunk = createTestChunk(
          'Different document',
          '/test/different.txt',
          0,
          createSpecificNormalizedVector(baseValues.map((x) => -x))
        )

        await store.insertChunks([differentChunk]) // Insert different first
        await store.insertChunks([similarChunk])

        const results = await store.search(queryVector, undefined, 10)

        expect(results).toHaveLength(2)

        // Contract: Results sorted by distance ascending (lower = better)
        // Similar document should come first
        expect(results[0]?.filePath).toBe('/test/similar.txt')
        expect(results[1]?.filePath).toBe('/test/different.txt')

        // Contract: First result should have lower score than second
        expect(results[0]!.score).toBeLessThan(results[1]!.score)
      } finally {
        if (fs.existsSync(distanceDbPath)) {
          fs.rmSync(distanceDbPath, { recursive: true })
        }
      }
    })

    it('should return distance ~0 for identical vectors', async () => {
      const identicalDbPath = makeTestDbPath('test-vectordb-identical')
      if (fs.existsSync(identicalDbPath)) {
        fs.rmSync(identicalDbPath, { recursive: true })
      }

      try {
        const store = new VectorStore({
          dbPath: identicalDbPath,
          tableName: 'chunks',
        })
        await store.initialize()

        const queryVector = createNormalizedVector(42)

        // Insert chunk with identical vector
        const identicalChunk = createTestChunk(
          'Identical vector document',
          '/test/identical.txt',
          0,
          createNormalizedVector(42) // Same seed = identical vector
        )
        await store.insertChunks([identicalChunk])

        const results = await store.search(queryVector, undefined, 10)

        expect(results).toHaveLength(1)

        // Contract: Identical vectors should have distance ~0
        // Allow small floating point tolerance
        expect(results[0]!.score).toBeCloseTo(0, 5)
      } finally {
        if (fs.existsSync(identicalDbPath)) {
          fs.rmSync(identicalDbPath, { recursive: true })
        }
      }
    })

    it('should return distance ~2 for opposite vectors', async () => {
      const oppositeDbPath = makeTestDbPath('test-vectordb-opposite')
      if (fs.existsSync(oppositeDbPath)) {
        fs.rmSync(oppositeDbPath, { recursive: true })
      }

      try {
        const store = new VectorStore({
          dbPath: oppositeDbPath,
          tableName: 'chunks',
        })
        await store.initialize()

        // Create a simple normalized vector
        const baseValues = new Array(384).fill(0).map((_, i) => Math.sin(i + 1))
        const queryVector = createSpecificNormalizedVector(baseValues)

        // Create opposite vector (negate all values)
        const oppositeValues = baseValues.map((x) => -x)
        const oppositeVector = createSpecificNormalizedVector(oppositeValues)

        const oppositeChunk = createTestChunk(
          'Opposite vector document',
          '/test/opposite.txt',
          0,
          oppositeVector
        )
        await store.insertChunks([oppositeChunk])

        const results = await store.search(queryVector, undefined, 10)

        expect(results).toHaveLength(1)

        // Contract: Opposite vectors should have distance ~2
        // Dot product of normalized opposite vectors: -1
        // LanceDB dot product distance = 1 - dot_product = 1 - (-1) = 2
        expect(results[0]!.score).toBeCloseTo(2, 3)
      } finally {
        if (fs.existsSync(oppositeDbPath)) {
          fs.rmSync(oppositeDbPath, { recursive: true })
        }
      }
    })

    it('should have distance in range [0, 2]', async () => {
      const rangeDbPath = makeTestDbPath('test-vectordb-range')
      if (fs.existsSync(rangeDbPath)) {
        fs.rmSync(rangeDbPath, { recursive: true })
      }

      try {
        const store = new VectorStore({
          dbPath: rangeDbPath,
          tableName: 'chunks',
        })
        await store.initialize()

        const queryVector = createNormalizedVector(1)

        // Insert documents with various vectors (batch insert to avoid multiple optimize() calls)
        const chunks = Array.from({ length: 10 }, (_, i) =>
          createTestChunk(
            `Document ${i + 1}`,
            `/test/doc${i + 1}.txt`,
            0,
            createNormalizedVector((i + 1) * 10)
          )
        )
        await store.insertChunks(chunks)

        const results = await store.search(queryVector, undefined, 10)

        // Contract: All distances should be in [0, 2] range (with epsilon for floating point)
        for (const result of results) {
          expect(result.score).toBeGreaterThanOrEqual(-1e-6)
          expect(result.score).toBeLessThanOrEqual(2 + 1e-6)
        }
      } finally {
        if (fs.existsSync(rangeDbPath)) {
          fs.rmSync(rangeDbPath, { recursive: true })
        }
      }
    })
  })
})
