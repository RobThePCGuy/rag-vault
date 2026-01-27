// HTTP server for web frontend

import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import cors from 'cors'
import express, { type Express } from 'express'
import multer from 'multer'
import type { RAGServer } from '../server/index.js'
import { createApiRouter } from './api-routes.js'
import { createConfigRouter } from './config-routes.js'
import type { DatabaseManager } from './database-manager.js'
import { errorHandler, notFoundHandler } from './middleware/index.js'
import type { ServerAccessor } from './types.js'

// Re-export for backwards compatibility
export type { ServerAccessor } from './types.js'

/**
 * HTTP server configuration
 */
export interface HttpServerConfig {
  /** Port to listen on */
  port: number
  /** Upload directory for temporary files */
  uploadDir: string
  /** Static files directory (for production builds) */
  staticDir?: string
}

/**
 * Create and configure Express app with DatabaseManager
 */
export async function createHttpServerWithManager(
  dbManager: DatabaseManager,
  config: HttpServerConfig
): Promise<Express> {
  // Create server accessor
  const serverAccessor: ServerAccessor = () => {
    return dbManager.getServer()
  }

  // Create config router to add before error handlers
  const configRouter = createConfigRouter(dbManager)

  const app = await createHttpServerInternal(serverAccessor, config, configRouter)

  return app
}

/**
 * Create and configure Express app (legacy - direct RAGServer)
 */
export async function createHttpServer(
  ragServer: RAGServer,
  config: HttpServerConfig
): Promise<Express> {
  return createHttpServerInternal(() => ragServer, config)
}

/**
 * Internal function to create Express app
 */
async function createHttpServerInternal(
  serverAccessor: ServerAccessor,
  config: HttpServerConfig,
  configRouter?: ReturnType<typeof createConfigRouter>
): Promise<Express> {
  const app = express()

  // Middleware
  app.use(cors())
  app.use(express.json({ limit: '50mb' }))

  // Ensure upload directory exists
  if (!existsSync(config.uploadDir)) {
    await mkdir(config.uploadDir, { recursive: true })
  }

  // Configure multer for file uploads
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, config.uploadDir)
    },
    filename: (_req, file, cb) => {
      // Preserve original filename with timestamp prefix
      const timestamp = Date.now()
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')
      cb(null, `${timestamp}-${safeName}`)
    },
  })

  const upload = multer({
    storage,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
    },
    fileFilter: (_req, file, cb) => {
      // Allow common document types
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
        'text/html',
        'application/json',
      ]
      const allowedExtensions = ['.pdf', '.docx', '.txt', '.md', '.html', '.json']

      const ext = path.extname(file.originalname).toLowerCase()
      if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
        cb(null, true)
      } else {
        cb(new Error(`File type not allowed: ${file.mimetype}`))
      }
    },
  })

  // API routes
  const apiRouter = createApiRouter(serverAccessor)

  // Apply multer middleware to upload endpoint
  app.use('/api/v1/files/upload', upload.single('file'), (_req, _res, next) => {
    // Multer adds file to req.file
    next()
  })

  app.use('/api/v1', apiRouter)

  // Add config routes if provided (must be before error handlers)
  if (configRouter) {
    app.use('/api/v1/config', configRouter)
  }

  // Serve static files in production
  if (config.staticDir && existsSync(config.staticDir)) {
    app.use(express.static(config.staticDir))

    // SPA fallback - serve index.html for all non-API routes
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(config.staticDir as string, 'index.html'))
      }
    })
  }

  // 404 handler for API routes
  app.use('/api/*', notFoundHandler)

  // Error handling middleware
  app.use(errorHandler)

  return app
}

/**
 * Start HTTP server
 */
export function startServer(app: Express, port: number): Promise<void> {
  return new Promise((resolve) => {
    app.listen(port, () => {
      console.log(`Web server running at http://localhost:${port}`)
      resolve()
    })
  })
}
