// Web Worker that scans document chunks for wiki-links and builds an edge index.
// Receives document data via postMessage, returns the built index.
//
// NOTE: This worker imports buildLinkIndex from the utils module. Vite bundles
// workers as separate modules so the import resolves correctly at build time.

import { buildLinkIndex } from '../utils/link-index-builder'
import type { LinkIndex, ScanDocument } from '../utils/link-index-builder'

// --------------------------------------------
// Message protocol
// --------------------------------------------

interface ScanRequest {
  type: 'scan'
  documents: ScanDocument[]
}

interface ScanResponse {
  type: 'scan-complete'
  index: LinkIndex
}

interface ErrorResponse {
  type: 'error'
  message: string
}

type WorkerRequest = ScanRequest

// --------------------------------------------
// Handler
// --------------------------------------------

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data

  if (msg.type === 'scan') {
    try {
      const index = buildLinkIndex(msg.documents)
      const response: ScanResponse = { type: 'scan-complete', index }
      self.postMessage(response)
    } catch (err) {
      const response: ErrorResponse = {
        type: 'error',
        message: err instanceof Error ? err.message : 'Unknown worker error',
      }
      self.postMessage(response)
    }
  }
}
