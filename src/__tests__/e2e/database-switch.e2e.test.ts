import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getIntegrationCacheDir } from '../utils/integration-cache.js'
import { RAGServer } from '../../server/index.js'

// ============================================
// E2E Test: Database Switching Workflow
// ============================================

describe.runIf(process.env['RUN_EMBEDDING_INTEGRATION'] === '1')(
  'Database Switching E2E Workflow',
  () => {
    const testCacheDir = getIntegrationCacheDir('e2e-database-switch')
    // User Scenario: Create multiple databases, switch between them, verify isolation
    // Validation: Database switching works correctly and data is isolated

    it('User Journey: Create database A → Add documents → Create database B → Add documents → Switch between them → Verify isolation', async () => {
      // 1. Setup test environments for two databases
      const testDbPathA = resolve('./tmp/e2e-db-switch-a')
      const testDbPathB = resolve('./tmp/e2e-db-switch-b')
      const testDataDir = resolve('./tmp/e2e-db-switch-data')
      mkdirSync(testDbPathA, { recursive: true })
      mkdirSync(testDbPathB, { recursive: true })
      mkdirSync(testDataDir, { recursive: true })

      try {
        // 2. Create and initialize Database A
        const serverA = new RAGServer({
          dbPath: testDbPathA,
          modelName: 'Xenova/all-MiniLM-L6-v2',
          cacheDir: testCacheDir,
          baseDir: testDataDir,
          maxFileSize: 100 * 1024 * 1024,
        })
        await serverA.initialize()

        // 3. Add document to Database A (about cats)
        const fileA = resolve(testDataDir, 'cats-doc.txt')
        writeFileSync(
          fileA,
          'Cats are independent and curious animals. They are known for their hunting skills and playful nature. ' +
            'Domestic cats have been companions to humans for thousands of years.'
        )

        const ingestResultA = await serverA.handleIngestFile({ filePath: fileA })
        const resultA = JSON.parse(ingestResultA.content[0].text)
        expect(resultA.chunkCount).toBeGreaterThan(0)

        // 4. Verify document is in Database A
        const statusA1 = await serverA.handleStatus()
        const statusDataA1 = JSON.parse(statusA1.content[0].text)
        expect(statusDataA1.documentCount).toBe(1)

        // 5. Create and initialize Database B
        const serverB = new RAGServer({
          dbPath: testDbPathB,
          modelName: 'Xenova/all-MiniLM-L6-v2',
          cacheDir: testCacheDir,
          baseDir: testDataDir,
          maxFileSize: 100 * 1024 * 1024,
        })
        await serverB.initialize()

        // 6. Add document to Database B (about dogs)
        const fileB = resolve(testDataDir, 'dogs-doc.txt')
        writeFileSync(
          fileB,
          'Dogs are loyal and social animals. They are known for their obedience and protective instincts. ' +
            'Dogs have been domesticated for over 15,000 years and serve many roles.'
        )

        const ingestResultB = await serverB.handleIngestFile({ filePath: fileB })
        const resultB = JSON.parse(ingestResultB.content[0].text)
        expect(resultB.chunkCount).toBeGreaterThan(0)

        // 7. Verify document is in Database B
        const statusB1 = await serverB.handleStatus()
        const statusDataB1 = JSON.parse(statusB1.content[0].text)
        expect(statusDataB1.documentCount).toBe(1)

        // 8. Search Database A for cats - should find results
        const queryResultA1 = await serverA.handleQueryDocuments({
          query: 'cats hunting playful',
          limit: 5,
        })
        const resultsA1 = JSON.parse(queryResultA1.content[0].text)
        expect(resultsA1.length).toBeGreaterThan(0)
        expect(resultsA1[0].filePath).toContain('cats-doc')

        // 9. Search Database A for dogs - should NOT find results
        const queryResultA2 = await serverA.handleQueryDocuments({
          query: 'dogs loyalty obedience protective',
          limit: 5,
        })
        const resultsA2 = JSON.parse(queryResultA2.content[0].text)
        const dogsInA = resultsA2.filter((r: { filePath: string }) =>
          r.filePath.includes('dogs-doc')
        )
        expect(dogsInA.length).toBe(0)

        // 10. Search Database B for dogs - should find results
        const queryResultB1 = await serverB.handleQueryDocuments({
          query: 'dogs loyalty obedience protective',
          limit: 5,
        })
        const resultsB1 = JSON.parse(queryResultB1.content[0].text)
        expect(resultsB1.length).toBeGreaterThan(0)
        expect(resultsB1[0].filePath).toContain('dogs-doc')

        // 11. Search Database B for cats - should NOT find results
        const queryResultB2 = await serverB.handleQueryDocuments({
          query: 'cats hunting playful',
          limit: 5,
        })
        const resultsB2 = JSON.parse(queryResultB2.content[0].text)
        const catsInB = resultsB2.filter((r: { filePath: string }) =>
          r.filePath.includes('cats-doc')
        )
        expect(catsInB.length).toBe(0)

        // 12. Verify file lists are independent
        const listA = await serverA.handleListFiles()
        const filesA = JSON.parse(listA.content[0].text)
        expect(filesA.length).toBe(1)
        expect(filesA[0].filePath).toContain('cats-doc')

        const listB = await serverB.handleListFiles()
        const filesB = JSON.parse(listB.content[0].text)
        expect(filesB.length).toBe(1)
        expect(filesB[0].filePath).toContain('dogs-doc')
      } finally {
        // Cleanup
        rmSync(testDbPathA, { recursive: true, force: true })
        rmSync(testDbPathB, { recursive: true, force: true })
        rmSync(testDataDir, { recursive: true, force: true })
      }
    })

    it('User Journey: Verify empty database has zero documents and chunks', async () => {
      // 1. Setup test environment
      const testDbPath = resolve('./tmp/e2e-empty-db')
      const testDataDir = resolve('./tmp/e2e-empty-data')
      mkdirSync(testDbPath, { recursive: true })
      mkdirSync(testDataDir, { recursive: true })

      const ragServer = new RAGServer({
        dbPath: testDbPath,
        modelName: 'Xenova/all-MiniLM-L6-v2',
        cacheDir: testCacheDir,
        baseDir: testDataDir,
        maxFileSize: 100 * 1024 * 1024,
      })
      await ragServer.initialize()

      try {
        // 2. Verify status shows zero documents
        const statusResult = await ragServer.handleStatus()
        const status = JSON.parse(statusResult.content[0].text)
        expect(status.documentCount).toBe(0)
        expect(status.chunkCount).toBe(0)

        // 3. Verify file list is empty
        const listResult = await ragServer.handleListFiles()
        const files = JSON.parse(listResult.content[0].text)
        expect(files).toEqual([])

        // 4. Verify search returns empty results
        const queryResult = await ragServer.handleQueryDocuments({
          query: 'any search query',
          limit: 5,
        })
        const results = JSON.parse(queryResult.content[0].text)
        expect(results).toEqual([])
      } finally {
        // Cleanup
        rmSync(testDbPath, { recursive: true, force: true })
        rmSync(testDataDir, { recursive: true, force: true })
      }
    })

    it('User Journey: Same file path in different databases maintains isolation', async () => {
      // 1. Setup test environments
      const testDbPath1 = resolve('./tmp/e2e-same-path-db1')
      const testDbPath2 = resolve('./tmp/e2e-same-path-db2')
      const testDataDir = resolve('./tmp/e2e-same-path-data')
      mkdirSync(testDbPath1, { recursive: true })
      mkdirSync(testDbPath2, { recursive: true })
      mkdirSync(testDataDir, { recursive: true })

      try {
        // 2. Create shared file with version 1 content
        const sharedFile = resolve(testDataDir, 'shared-doc.txt')
        writeFileSync(sharedFile, 'Version 1: This is the original content about version control.')

        // 3. Initialize Database 1 and ingest
        const server1 = new RAGServer({
          dbPath: testDbPath1,
          modelName: 'Xenova/all-MiniLM-L6-v2',
          cacheDir: testCacheDir,
          baseDir: testDataDir,
          maxFileSize: 100 * 1024 * 1024,
        })
        await server1.initialize()
        await server1.handleIngestFile({ filePath: sharedFile })

        // 4. Modify file to version 2
        writeFileSync(
          sharedFile,
          'Version 2: This is the updated content about branching and merging.'
        )

        // 5. Initialize Database 2 and ingest
        const server2 = new RAGServer({
          dbPath: testDbPath2,
          modelName: 'Xenova/all-MiniLM-L6-v2',
          cacheDir: testCacheDir,
          baseDir: testDataDir,
          maxFileSize: 100 * 1024 * 1024,
        })
        await server2.initialize()
        await server2.handleIngestFile({ filePath: sharedFile })

        // 6. Verify Database 1 has version 1 content
        const chunks1 = await server1.handleGetDocumentChunks(sharedFile)
        const chunksData1 = JSON.parse(chunks1.content[0].text)
        expect(chunksData1[0].text).toContain('Version 1')
        expect(chunksData1[0].text).toContain('original content')

        // 7. Verify Database 2 has version 2 content
        const chunks2 = await server2.handleGetDocumentChunks(sharedFile)
        const chunksData2 = JSON.parse(chunks2.content[0].text)
        expect(chunksData2[0].text).toContain('Version 2')
        expect(chunksData2[0].text).toContain('branching and merging')

        // 8. Search Database 1 for version 1 content
        const query1 = await server1.handleQueryDocuments({
          query: 'original content version control',
          limit: 5,
        })
        const results1 = JSON.parse(query1.content[0].text)
        expect(results1.length).toBeGreaterThan(0)

        // 9. Search Database 2 for version 2 content
        const query2 = await server2.handleQueryDocuments({
          query: 'branching merging updated',
          limit: 5,
        })
        const results2 = JSON.parse(query2.content[0].text)
        expect(results2.length).toBeGreaterThan(0)
      } finally {
        // Cleanup
        rmSync(testDbPath1, { recursive: true, force: true })
        rmSync(testDbPath2, { recursive: true, force: true })
        rmSync(testDataDir, { recursive: true, force: true })
      }
    })
  }
)
