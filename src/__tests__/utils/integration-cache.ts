import { resolve } from 'node:path'

function sanitizeSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9._-]/g, '_')
}

/**
 * Build a per-suite/per-worker model cache path to reduce ONNX cache collisions
 * when integration tests execute concurrently.
 */
export function getIntegrationCacheDir(suiteName: string): string {
  const workerId = process.env['VITEST_WORKER_ID'] ?? process.env['VITEST_POOL_ID'] ?? '0'
  return resolve('./tmp/models', `${sanitizeSegment(suiteName)}-w${workerId}-p${process.pid}`)
}
