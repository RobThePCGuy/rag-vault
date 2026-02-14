import { useCallback, useEffect, useRef, useState } from 'react'
import { getDocumentChunks, listFiles } from '../api/client'
import type { LinkIndex, ScanDocument } from '../utils/link-index-builder'

export interface UseLinkIndexResult {
  index: LinkIndex | null
  isScanning: boolean
  error: Error | null
  /** Send an explicit set of documents to scan */
  scan: (documents: ScanDocument[]) => void
  /** Fetch all files + chunks from the API, then scan */
  rescan: () => Promise<void>
}

export function useLinkIndex(): UseLinkIndexResult {
  const workerRef = useRef<Worker | null>(null)
  const [index, setIndex] = useState<LinkIndex | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Create and manage the worker lifecycle
  useEffect(() => {
    const worker = new Worker(new URL('../workers/link-indexer.worker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent) => {
      const msg = event.data as { type: string; index?: LinkIndex; message?: string }

      if (msg.type === 'scan-complete' && msg.index) {
        setIndex(msg.index)
        setIsScanning(false)
        setError(null)
      } else if (msg.type === 'error') {
        setError(new Error(msg.message ?? 'Worker error'))
        setIsScanning(false)
      }
    }

    worker.onerror = (event) => {
      setError(new Error(event.message || 'Worker initialization error'))
      setIsScanning(false)
    }

    workerRef.current = worker

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  const scan = useCallback((documents: ScanDocument[]) => {
    if (!workerRef.current) return
    setIsScanning(true)
    setError(null)
    workerRef.current.postMessage({ type: 'scan', documents })
  }, [])

  const rescan = useCallback(async () => {
    setIsScanning(true)
    setError(null)

    try {
      const files = await listFiles()

      // Fetch chunks for all files in parallel
      const documentResults = await Promise.all(
        files.map(async (file) => {
          const chunks = await getDocumentChunks(file.filePath)
          return {
            filePath: file.filePath,
            chunks: chunks.map((c) => ({ chunkIndex: c.chunkIndex, text: c.text })),
          }
        })
      )

      if (!workerRef.current) return
      workerRef.current.postMessage({ type: 'scan', documents: documentResults })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch documents for scan'))
      setIsScanning(false)
    }
  }, [])

  return { index, isScanning, error, scan, rescan }
}
