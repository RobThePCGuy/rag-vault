// REST API routes for web frontend

import path from 'node:path'
import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { ValidationError } from '../errors/index.js'
import type { RAGServer } from '../server/index.js'
import { asyncHandler } from './middleware/index.js'
import type { ServerAccessor } from './types.js'

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
      const data = JSON.parse(result.content[0].text)
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
      const data = JSON.parse(result.content[0].text)
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
      const data = JSON.parse(result.content[0].text)
      res.json(data)
    })
  )

  // GET /api/v1/files - List ingested files
  router.get(
    '/files',
    asyncHandler(async (_req: Request, res: Response) => {
      const server = getServer()
      const result = await server.handleListFiles()
      const data = JSON.parse(result.content[0].text)
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
      const data = JSON.parse(result.content[0].text)
      res.json(data)
    })
  )

  // GET /api/v1/status - System status
  router.get(
    '/status',
    asyncHandler(async (_req: Request, res: Response) => {
      const server = getServer()
      const result = await server.handleStatus()
      const data = JSON.parse(result.content[0].text)
      res.json(data)
    })
  )

  return router
}
