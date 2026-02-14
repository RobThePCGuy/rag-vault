// Tests for HTTP server startup behavior

import { EventEmitter } from 'node:events'
import type { Express } from 'express'
import { describe, expect, it, vi } from 'vitest'
import { startServer } from '../http-server.js'

describe('startServer', () => {
  it('should resolve when server starts listening', async () => {
    const server = new EventEmitter()
    const listenMock = vi.fn((_port: number) => {
      setImmediate(() => {
        server.emit('listening')
      })
      return server
    })

    const app = { listen: listenMock } as unknown as Express
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await expect(startServer(app, 3000)).resolves.toBeUndefined()

    expect(listenMock).toHaveBeenCalledWith(3000)
    expect(logSpy).toHaveBeenCalledWith('Web server running at http://localhost:3000')

    logSpy.mockRestore()
  })

  it('should reject when server fails to listen', async () => {
    const server = new EventEmitter()
    const listenMock = vi.fn((_port: number) => {
      setImmediate(() => {
        server.emit(
          'error',
          Object.assign(new Error('Address already in use'), { code: 'EADDRINUSE' })
        )
      })
      return server
    })

    const app = { listen: listenMock } as unknown as Express

    await expect(startServer(app, 3000)).rejects.toThrow('Address already in use')
    expect(listenMock).toHaveBeenCalledWith(3000)
  })
})
