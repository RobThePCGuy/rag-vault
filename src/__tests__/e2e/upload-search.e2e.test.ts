import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { RAGServer } from '../../server/index.js'

// ============================================
// E2E Test: Upload → Index → Search Workflow
// ============================================

describe.runIf(process.env['RUN_EMBEDDING_INTEGRATION'] === '1')(
  'Upload → Search E2E Workflow',
  () => {
    // User Scenario: Upload a file through the server, wait for indexing, then search
    // Validation: Complete upload-to-search workflow works correctly

    it('User Journey: Upload multiple files → Wait for indexing → Search across all documents', async () => {
      // 1. Setup test environment
      const testDbPath = resolve('./tmp/e2e-upload-search-db')
      const testDataDir = resolve('./tmp/e2e-upload-search-data')
      mkdirSync(testDbPath, { recursive: true })
      mkdirSync(testDataDir, { recursive: true })

      const ragServer = new RAGServer({
        dbPath: testDbPath,
        modelName: 'Xenova/all-MiniLM-L6-v2',
        cacheDir: './tmp/models',
        baseDir: testDataDir,
        maxFileSize: 100 * 1024 * 1024,
      })
      await ragServer.initialize()

      try {
        // 2. Create and upload first document (about TypeScript)
        const file1 = resolve(testDataDir, 'typescript-guide.txt')
        writeFileSync(
          file1,
          'TypeScript is a strongly typed programming language that builds on JavaScript. ' +
            'It adds optional static typing and class-based object-oriented programming. ' +
            'TypeScript is designed for development of large applications and transcompiles to JavaScript.'
        )

        const ingestResult1 = await ragServer.handleIngestFile({ filePath: file1 })
        const result1 = JSON.parse(ingestResult1.content[0].text)
        expect(result1.chunkCount).toBeGreaterThan(0)
        expect(result1.filePath).toBe(file1)

        // 3. Create and upload second document (about Python)
        const file2 = resolve(testDataDir, 'python-guide.txt')
        writeFileSync(
          file2,
          'Python is a high-level, interpreted programming language known for its readability. ' +
            'Python supports multiple programming paradigms including procedural, object-oriented, and functional. ' +
            'It is widely used for web development, data science, and automation.'
        )

        const ingestResult2 = await ragServer.handleIngestFile({ filePath: file2 })
        const result2 = JSON.parse(ingestResult2.content[0].text)
        expect(result2.chunkCount).toBeGreaterThan(0)

        // 4. Create and upload third document (about JavaScript)
        const file3 = resolve(testDataDir, 'javascript-guide.txt')
        writeFileSync(
          file3,
          'JavaScript is a versatile scripting language primarily used for web development. ' +
            'It enables interactive web pages and is an essential part of web applications. ' +
            'JavaScript runs in browsers and can also run on servers using Node.js.'
        )

        const ingestResult3 = await ragServer.handleIngestFile({ filePath: file3 })
        const result3 = JSON.parse(ingestResult3.content[0].text)
        expect(result3.chunkCount).toBeGreaterThan(0)

        // 5. Verify all files are listed
        const listResult = await ragServer.handleListFiles()
        const files = JSON.parse(listResult.content[0].text)
        expect(files.length).toBe(3)

        // 6. Search for TypeScript-related content
        const queryResult1 = await ragServer.handleQueryDocuments({
          query: 'strongly typed programming language',
          limit: 5,
        })
        const results1 = JSON.parse(queryResult1.content[0].text)
        expect(results1.length).toBeGreaterThan(0)
        // TypeScript document should be most relevant
        expect(results1[0].filePath).toContain('typescript-guide')

        // 7. Search for Python-related content
        const queryResult2 = await ragServer.handleQueryDocuments({
          query: 'data science and automation',
          limit: 5,
        })
        const results2 = JSON.parse(queryResult2.content[0].text)
        expect(results2.length).toBeGreaterThan(0)
        // Python document should be most relevant
        expect(results2[0].filePath).toContain('python-guide')

        // 8. Search for JavaScript-related content
        const queryResult3 = await ragServer.handleQueryDocuments({
          query: 'web development scripting browser',
          limit: 5,
        })
        const results3 = JSON.parse(queryResult3.content[0].text)
        expect(results3.length).toBeGreaterThan(0)
        // JavaScript document should be most relevant
        expect(results3[0].filePath).toContain('javascript-guide')

        // 9. Verify cross-document search returns multiple documents
        const queryResult4 = await ragServer.handleQueryDocuments({
          query: 'programming language development',
          limit: 10,
        })
        const results4 = JSON.parse(queryResult4.content[0].text)
        expect(results4.length).toBeGreaterThan(0)
        // Should find content from multiple documents
        const uniqueFiles = new Set(results4.map((r: { filePath: string }) => r.filePath))
        expect(uniqueFiles.size).toBeGreaterThan(1)
      } finally {
        // Cleanup
        rmSync(testDbPath, { recursive: true, force: true })
        rmSync(testDataDir, { recursive: true, force: true })
      }
    })

    it('User Journey: Upload → Delete → Verify removed from search results', async () => {
      // 1. Setup test environment
      const testDbPath = resolve('./tmp/e2e-upload-delete-db')
      const testDataDir = resolve('./tmp/e2e-upload-delete-data')
      mkdirSync(testDbPath, { recursive: true })
      mkdirSync(testDataDir, { recursive: true })

      const ragServer = new RAGServer({
        dbPath: testDbPath,
        modelName: 'Xenova/all-MiniLM-L6-v2',
        cacheDir: './tmp/models',
        baseDir: testDataDir,
        maxFileSize: 100 * 1024 * 1024,
      })
      await ragServer.initialize()

      try {
        // 2. Upload a document
        const file = resolve(testDataDir, 'deletable-doc.txt')
        writeFileSync(
          file,
          'This document contains unique content about quantum computing and superposition. ' +
            'Quantum bits or qubits can exist in multiple states simultaneously.'
        )

        await ragServer.handleIngestFile({ filePath: file })

        // 3. Verify document appears in search
        const queryResult1 = await ragServer.handleQueryDocuments({
          query: 'quantum computing qubits superposition',
          limit: 5,
        })
        const results1 = JSON.parse(queryResult1.content[0].text)
        expect(results1.length).toBeGreaterThan(0)
        expect(results1[0].filePath).toBe(file)

        // 4. Delete the document
        const deleteResult = await ragServer.handleDeleteFile({ filePath: file })
        const deleteResponse = JSON.parse(deleteResult.content[0].text)
        expect(deleteResponse.deleted).toBe(true)

        // 5. Verify document no longer appears in file list
        const listResult = await ragServer.handleListFiles()
        const files = JSON.parse(listResult.content[0].text)
        const deletedFile = files.find((f: { filePath: string }) => f.filePath === file)
        expect(deletedFile).toBeUndefined()

        // 6. Verify document no longer appears in search results
        const queryResult2 = await ragServer.handleQueryDocuments({
          query: 'quantum computing qubits superposition',
          limit: 5,
        })
        const results2 = JSON.parse(queryResult2.content[0].text)
        const foundDeletedDoc = results2.find((r: { filePath: string }) => r.filePath === file)
        expect(foundDeletedDoc).toBeUndefined()
      } finally {
        // Cleanup
        rmSync(testDbPath, { recursive: true, force: true })
        rmSync(testDataDir, { recursive: true, force: true })
      }
    })

    it('User Journey: Upload → Get document chunks → Navigate chunks', async () => {
      // 1. Setup test environment
      const testDbPath = resolve('./tmp/e2e-upload-chunks-db')
      const testDataDir = resolve('./tmp/e2e-upload-chunks-data')
      mkdirSync(testDbPath, { recursive: true })
      mkdirSync(testDataDir, { recursive: true })

      const ragServer = new RAGServer({
        dbPath: testDbPath,
        modelName: 'Xenova/all-MiniLM-L6-v2',
        cacheDir: './tmp/models',
        baseDir: testDataDir,
        maxFileSize: 100 * 1024 * 1024,
      })
      await ragServer.initialize()

      try {
        // 2. Upload a multi-paragraph document
        const file = resolve(testDataDir, 'multi-chunk-doc.txt')
        writeFileSync(
          file,
          'Chapter 1: Introduction to Machine Learning\n\n' +
            'Machine learning is a subset of artificial intelligence that enables computers to learn from data. ' +
            'It uses algorithms to identify patterns and make decisions with minimal human intervention.\n\n' +
            'Chapter 2: Supervised Learning\n\n' +
            'Supervised learning involves training models on labeled data. ' +
            'The algorithm learns to map inputs to outputs based on example input-output pairs. ' +
            'Common applications include classification and regression tasks.\n\n' +
            'Chapter 3: Unsupervised Learning\n\n' +
            'Unsupervised learning finds patterns in data without labeled responses. ' +
            'Clustering and dimensionality reduction are key techniques in this paradigm.'
        )

        const ingestResult = await ragServer.handleIngestFile({ filePath: file })
        const result = JSON.parse(ingestResult.content[0].text)
        expect(result.chunkCount).toBeGreaterThan(1) // Should create multiple chunks

        // 3. Get document chunks
        const chunksResult = await ragServer.handleGetDocumentChunks(file)
        const chunks = JSON.parse(chunksResult.content[0].text)

        // 4. Verify chunks are ordered by chunkIndex
        expect(chunks.length).toBeGreaterThan(1)
        for (let i = 0; i < chunks.length - 1; i++) {
          expect(chunks[i].chunkIndex).toBeLessThan(chunks[i + 1].chunkIndex)
        }

        // 5. Verify all chunks belong to the same document
        for (const chunk of chunks) {
          expect(chunk.filePath).toBe(file)
        }

        // 6. Verify chunks have fingerprints
        for (const chunk of chunks) {
          expect(chunk.fingerprint).toBeDefined()
          expect(typeof chunk.fingerprint).toBe('string')
          expect(chunk.fingerprint.length).toBe(16) // SHA-256 prefix
        }
      } finally {
        // Cleanup
        rmSync(testDbPath, { recursive: true, force: true })
        rmSync(testDataDir, { recursive: true, force: true })
      }
    })
  }
)
