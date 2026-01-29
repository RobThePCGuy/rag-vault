// REST API routes for web frontend

import path from 'node:path'
import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { RAGError, ValidationError } from '../errors/index.js'
import { explainChunkSimilarity, type ChunkExplanation } from '../explainability/index.js'
import {
  getFeedbackStore,
  type FeedbackEventType,
  type ChunkRef,
} from '../flywheel/index.js'
import type { RAGServer } from '../server/index.js'
import { asyncHandler } from './middleware/index.js'
import type { ServerAccessor } from './types.js'

/**
 * Extract text from a RAG server response with proper bounds checking
 * @throws RAGError if the response format is invalid
 */
function extractResultText(result: { content?: Array<{ text?: string }> }): string {
  if (!result.content || !Array.isArray(result.content) || result.content.length === 0) {
    throw new RAGError('Malformed server response: missing content array', {
      statusCode: 500,
    })
  }
  const firstContent = result.content[0]
  if (!firstContent || typeof firstContent.text !== 'string') {
    throw new RAGError('Malformed server response: missing text in content', {
      statusCode: 500,
    })
  }
  return firstContent.text
}

/**
 * Search request body
 */
interface SearchRequest {
  query: string
  limit?: number
}

/**
 * Ingest data request body
 */
interface IngestDataRequest {
  content: string
  metadata: {
    source: string
    format: 'text' | 'html' | 'markdown'
  }
}

/**
 * Delete file request body
 */
interface DeleteFileRequest {
  filePath?: string
  source?: string
}

/**
 * Create API router with all endpoints
 * @param serverOrAccessor - RAGServer instance or accessor function
 */
export function createApiRouter(serverOrAccessor: RAGServer | ServerAccessor): Router {
  const router = createRouter()

  // Helper to get server (supports both direct instance and accessor function)
  const getServer = (): RAGServer => {
    if (typeof serverOrAccessor === 'function') {
      return serverOrAccessor()
    }
    return serverOrAccessor
  }

  // POST /api/v1/search - Search documents
  router.post(
    '/search',
    asyncHandler(async (req: Request, res: Response) => {
      const { query, limit } = req.body as SearchRequest

      if (!query || typeof query !== 'string') {
        throw new ValidationError('Query is required and must be a string')
      }

      const queryInput: { query: string; limit?: number } = { query }
      if (limit !== undefined) {
        queryInput.limit = limit
      }
      const server = getServer()
      const result = await server.handleQueryDocuments(queryInput)
      const data = JSON.parse(extractResultText(result))
      res.json({ results: data })
    })
  )

  // POST /api/v1/files/upload - Upload files (multipart)
  router.post(
    '/files/upload',
    asyncHandler(async (req: Request, res: Response) => {
      // File is attached by multer middleware
      const file = req.file
      if (!file) {
        throw new ValidationError('No file uploaded')
      }

      // Use the uploaded file path (convert to absolute)
      const server = getServer()
      const absolutePath = path.resolve(file.path)
      const result = await server.handleIngestFile({ filePath: absolutePath })
      const data = JSON.parse(extractResultText(result))
      res.json(data)
    })
  )

  // POST /api/v1/data - Ingest content strings
  router.post(
    '/data',
    asyncHandler(async (req: Request, res: Response) => {
      const { content, metadata } = req.body as IngestDataRequest

      if (!content || typeof content !== 'string') {
        throw new ValidationError('Content is required and must be a string')
      }

      if (!metadata || !metadata.source || !metadata.format) {
        throw new ValidationError('Metadata with source and format is required')
      }

      const server = getServer()
      const result = await server.handleIngestData({ content, metadata })
      const data = JSON.parse(extractResultText(result))
      res.json(data)
    })
  )

  // GET /api/v1/files - List ingested files
  router.get(
    '/files',
    asyncHandler(async (_req: Request, res: Response) => {
      const server = getServer()
      const result = await server.handleListFiles()
      const data = JSON.parse(extractResultText(result))
      res.json({ files: data })
    })
  )

  // DELETE /api/v1/files - Delete file/source
  router.delete(
    '/files',
    asyncHandler(async (req: Request, res: Response) => {
      const { filePath, source } = req.body as DeleteFileRequest

      if (!filePath && !source) {
        throw new ValidationError('Either filePath or source is required')
      }

      const deleteInput: { filePath?: string; source?: string } = {}
      if (filePath !== undefined) {
        deleteInput.filePath = filePath
      }
      if (source !== undefined) {
        deleteInput.source = source
      }
      const server = getServer()
      const result = await server.handleDeleteFile(deleteInput)
      const data = JSON.parse(extractResultText(result))
      res.json(data)
    })
  )

  // GET /api/v1/status - System status
  router.get(
    '/status',
    asyncHandler(async (_req: Request, res: Response) => {
      const server = getServer()
      const result = await server.handleStatus()
      const data = JSON.parse(extractResultText(result))
      res.json(data)
    })
  )

  // GET /api/v1/health - Lightweight health check for load balancers
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  })

  // ============================================
  // Reader Feature Endpoints
  // ============================================

  // GET /api/v1/documents/chunks - Get all chunks for a document
  router.get(
    '/documents/chunks',
    asyncHandler(async (req: Request, res: Response) => {
      const filePath = req.query['filePath'] as string | undefined

      if (!filePath || typeof filePath !== 'string') {
        throw new ValidationError('filePath query parameter is required')
      }

      const server = getServer()
      const result = await server.handleGetDocumentChunks(filePath)
      const data = JSON.parse(extractResultText(result))
      res.json({ chunks: data })
    })
  )

  // GET /api/v1/chunks/related - Get related chunks for a specific chunk
  router.get(
    '/chunks/related',
    asyncHandler(async (req: Request, res: Response) => {
      const filePath = req.query['filePath'] as string | undefined
      const chunkIndexStr = req.query['chunkIndex'] as string | undefined
      const limitStr = req.query['limit'] as string | undefined
      const excludeSameDocStr = req.query['excludeSameDoc'] as string | undefined
      const includeExplanationStr = req.query['includeExplanation'] as string | undefined

      if (!filePath || typeof filePath !== 'string') {
        throw new ValidationError('filePath query parameter is required')
      }

      if (!chunkIndexStr) {
        throw new ValidationError('chunkIndex query parameter is required')
      }

      const chunkIndex = Number.parseInt(chunkIndexStr, 10)
      if (Number.isNaN(chunkIndex) || chunkIndex < 0) {
        throw new ValidationError('chunkIndex must be a non-negative integer')
      }

      const limit = limitStr ? Number.parseInt(limitStr, 10) : undefined
      if (limit !== undefined && (Number.isNaN(limit) || limit < 1 || limit > 20)) {
        throw new ValidationError('limit must be between 1 and 20')
      }

      const excludeSameDocument = excludeSameDocStr !== 'false'
      const includeExplanation = includeExplanationStr === 'true'

      const server = getServer()
      const result = await server.handleFindRelatedChunks(
        filePath,
        chunkIndex,
        limit,
        excludeSameDocument
      )
      const data = JSON.parse(extractResultText(result)) as Array<{
        filePath: string
        chunkIndex: number
        text: string
        score: number
        fingerprint?: string
      }>

      // Add explanations if requested (Explainability feature)
      if (includeExplanation) {
        // Get source chunk text for comparison
        const sourceChunkResult = await server.handleGetDocumentChunks(filePath)
        const sourceChunks = JSON.parse(extractResultText(sourceChunkResult)) as Array<{
          chunkIndex: number
          text: string
        }>
        const sourceChunk = sourceChunks.find((c) => c.chunkIndex === chunkIndex)
        const sourceText = sourceChunk?.text || ''

        const dataWithExplanation = data.map((chunk) => ({
          ...chunk,
          explanation: explainChunkSimilarity(
            sourceText,
            chunk.text,
            chunk.filePath === filePath,
            chunk.score
          ),
        }))
        res.json({ related: dataWithExplanation })
      } else {
        res.json({ related: data })
      }
    })
  )

  // POST /api/v1/chunks/batch-related - Batch get related chunks
  router.post(
    '/chunks/batch-related',
    asyncHandler(async (req: Request, res: Response) => {
      const { chunks, limit } = req.body as {
        chunks?: Array<{ filePath: string; chunkIndex: number }>
        limit?: number
      }

      if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
        throw new ValidationError('chunks array is required and must not be empty')
      }

      // Validate each chunk
      for (const chunk of chunks) {
        if (!chunk.filePath || typeof chunk.filePath !== 'string') {
          throw new ValidationError('Each chunk must have a filePath string')
        }
        if (typeof chunk.chunkIndex !== 'number' || chunk.chunkIndex < 0) {
          throw new ValidationError('Each chunk must have a non-negative chunkIndex')
        }
      }

      if (limit !== undefined && (typeof limit !== 'number' || limit < 1 || limit > 20)) {
        throw new ValidationError('limit must be between 1 and 20')
      }

      const server = getServer()
      const result = await server.handleBatchFindRelatedChunks(chunks, limit)
      const data = JSON.parse(extractResultText(result))
      res.json({ results: data })
    })
  )

  // ============================================
  // Curatorial Flywheel Endpoints (Gap 4)
  // ============================================

  /**
   * Feedback event request body
   */
  interface FeedbackRequest {
    type: FeedbackEventType
    source: ChunkRef
    target: ChunkRef
  }

  // POST /api/v1/feedback - Record a feedback event
  router.post(
    '/feedback',
    asyncHandler(async (req: Request, res: Response) => {
      const { type, source, target } = req.body as FeedbackRequest

      // Validate event type
      const validTypes: FeedbackEventType[] = ['pin', 'unpin', 'dismiss_inferred', 'click_related']
      if (!type || !validTypes.includes(type)) {
        throw new ValidationError(`type must be one of: ${validTypes.join(', ')}`)
      }

      // Validate source
      if (!source || typeof source.filePath !== 'string' || typeof source.chunkIndex !== 'number') {
        throw new ValidationError('source must have filePath (string) and chunkIndex (number)')
      }

      // Validate target
      if (!target || typeof target.filePath !== 'string' || typeof target.chunkIndex !== 'number') {
        throw new ValidationError('target must have filePath (string) and chunkIndex (number)')
      }

      const feedbackStore = getFeedbackStore()
      feedbackStore.recordEvent({
        type,
        source,
        target,
        timestamp: new Date(),
      })

      res.json({ success: true })
    })
  )

  // GET /api/v1/feedback/stats - Get feedback statistics
  router.get('/feedback/stats', (_req: Request, res: Response) => {
    const feedbackStore = getFeedbackStore()
    const stats = feedbackStore.getStats()
    res.json(stats)
  })

  return router
}
