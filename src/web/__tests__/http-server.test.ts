// Tests for HTTP server startup behavior

import { EventEmitter } from 'node:events'
import type { Express } from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startServer } from '../http-server.js'

describe('startServer', () => {
  const bindEnvVars = ['RAG_BIND_HOST', 'RAG_HOST'] as const
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    // Isolate from any ambient bind-host configuration
    for (const key of bindEnvVars) {
      savedEnv[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    for (const key of bindEnvVars) {
      if (savedEnv[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = savedEnv[key]
      }
    }
    vi.restoreAllMocks()
  })

  it('should resolve when server starts listening and bind to loopback by default', async () => {
    const server = new EventEmitter()
    const listenMock = vi.fn((_port: number, _host: string) => {
      setImmediate(() => {
        server.emit('listening')
      })
      return server
    })

    const app = { listen: listenMock } as unknown as Express
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await expect(startServer(app, 3000)).resolves.toBeUndefined()

    // Default bind is loopback only (not 0.0.0.0), so the API is not exposed to the LAN
    expect(listenMock).toHaveBeenCalledWith(3000, '127.0.0.1')
    expect(logSpy).toHaveBeenCalledWith('Web server running at http://127.0.0.1:3000')
  })

  it('should honor RAG_BIND_HOST opt-in and warn when exposed to all interfaces', async () => {
    process.env['RAG_BIND_HOST'] = '0.0.0.0'
    const server = new EventEmitter()
    const listenMock = vi.fn((_port: number, _host: string) => {
      setImmediate(() => {
        server.emit('listening')
      })
      return server
    })

    const app = { listen: listenMock } as unknown as Express
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(startServer(app, 3000)).resolves.toBeUndefined()

    expect(listenMock).toHaveBeenCalledWith(3000, '0.0.0.0')
    expect(logSpy).toHaveBeenCalledWith('Web server running at http://localhost:3000')
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[SECURITY]'))
  })

  it('should use an explicit host argument over the environment', async () => {
    process.env['RAG_BIND_HOST'] = '0.0.0.0'
    const server = new EventEmitter()
    const listenMock = vi.fn((_port: number, _host: string) => {
      setImmediate(() => {
        server.emit('listening')
      })
      return server
    })

    const app = { listen: listenMock } as unknown as Express
    vi.spyOn(console, 'log').mockImplementation(() => {})

    await expect(startServer(app, 3000, '127.0.0.1')).resolves.toBeUndefined()
    expect(listenMock).toHaveBeenCalledWith(3000, '127.0.0.1')
  })

  it('should reject when server fails to listen', async () => {
    const server = new EventEmitter()
    const listenMock = vi.fn((_port: number, _host: string) => {
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
    expect(listenMock).toHaveBeenCalledWith(3000, '127.0.0.1')
  })
})
