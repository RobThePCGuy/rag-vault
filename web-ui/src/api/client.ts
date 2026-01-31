// API client for MCP Local RAG backend

const API_BASE = '/api/v1'

/** Default request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 30_000

/** Upload timeout in milliseconds (longer for large files) */
const UPLOAD_TIMEOUT_MS = 300_000

/**
 * Search result from query
 */
export interface SearchResult {
  filePath: string
  chunkIndex: number
  text: string
  score: number
  source?: string
  /** Content-based fingerprint for resilient linking */
  fingerprint?: string
}

/**
 * File info from list
 */
export interface FileInfo {
  filePath: string
  chunkCount: number
  source?: string
}

/**
 * System status
 */
export interface SystemStatus {
  documentCount: number
  chunkCount: number
  memoryUsage: number
  uptime: number
  ftsIndexEnabled: boolean
  searchMode: 'hybrid' | 'vector-only'
}

/**
 * Ingest result
 */
export interface IngestResult {
  filePath: string
  chunkCount: number
  timestamp: string
}

/**
 * API error response
 */
export interface ApiError {
  error: string
}

/**
 * Generic fetch wrapper with error handling and timeout
 */
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
      signal: controller.signal,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error((data as ApiError).error || 'Request failed')
    }

    return data as T
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Search documents
 */
export async function searchDocuments(query: string, limit?: number): Promise<SearchResult[]> {
  const data = await fetchApi<{ results: SearchResult[] }>('/search', {
    method: 'POST',
    body: JSON.stringify({ query, limit }),
  })
  return data.results
}

/**
 * Upload a file with timeout protection
 */
export async function uploadFile(file: File): Promise<IngestResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)

  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE}/files/upload`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error((data as ApiError).error || 'Upload failed')
    }

    return data as IngestResult
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Upload timed out')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Ingest content string
 */
export async function ingestData(
  content: string,
  source: string,
  format: 'text' | 'html' | 'markdown'
): Promise<IngestResult> {
  return fetchApi<IngestResult>('/data', {
    method: 'POST',
    body: JSON.stringify({ content, metadata: { source, format } }),
  })
}

/**
 * List ingested files
 */
export async function listFiles(): Promise<FileInfo[]> {
  const data = await fetchApi<{ files: FileInfo[] }>('/files')
  return data.files
}

/**
 * Delete a file or source
 */
export async function deleteFile(options: { filePath?: string; source?: string }): Promise<void> {
  await fetchApi('/files', {
    method: 'DELETE',
    body: JSON.stringify(options),
  })
}

/**
 * Get system status
 */
export async function getStatus(): Promise<SystemStatus> {
  return fetchApi<SystemStatus>('/status')
}

// ============================================
// Reader Feature Types and Functions
// ============================================

/**
 * Document metadata
 */
export interface DocumentMetadata {
  fileName: string
  fileSize: number
  fileType: string
}

/**
 * Document chunk with full data
 */
export interface DocumentChunk {
  filePath: string
  chunkIndex: number
  text: string
  score: number
  metadata: DocumentMetadata
  source?: string
  /** Content-based fingerprint for resilient linking */
  fingerprint?: string
}

/**
 * Explanation for why chunks are related (Explainability feature)
 */
export interface ChunkExplanation {
  sharedKeywords: string[]
  sharedPhrases: string[]
  reasonLabel: 'same_doc' | 'very_similar' | 'related_topic' | 'loosely_related'
}

/**
 * Related chunk with connection information
 */
export interface RelatedChunk extends DocumentChunk {
  connectionReason?: string
  /** Explanation for the relationship (when includeExplanation=true) */
  explanation?: ChunkExplanation
}

/**
 * Chunk key for identification
 */
export interface ChunkKey {
  filePath: string
  chunkIndex: number
}

/**
 * Options for getting related chunks
 */
export interface RelatedChunksOptions {
  limit?: number
  excludeSameDocument?: boolean
  /** Include keyword/phrase explanations for why chunks are related */
  includeExplanation?: boolean
}

/**
 * Get all chunks for a document, ordered by chunkIndex
 */
export async function getDocumentChunks(filePath: string): Promise<DocumentChunk[]> {
  const encodedPath = encodeURIComponent(filePath)
  const data = await fetchApi<{ chunks: DocumentChunk[] }>(
    `/documents/chunks?filePath=${encodedPath}`
  )
  return data.chunks
}

/**
 * Get related chunks for a specific chunk
 */
export async function getRelatedChunks(
  filePath: string,
  chunkIndex: number,
  options?: RelatedChunksOptions
): Promise<RelatedChunk[]> {
  const params = new URLSearchParams({
    filePath,
    chunkIndex: String(chunkIndex),
  })

  if (options?.limit !== undefined) {
    params.set('limit', String(options.limit))
  }

  if (options?.excludeSameDocument !== undefined) {
    params.set('excludeSameDoc', String(options.excludeSameDocument))
  }

  if (options?.includeExplanation) {
    params.set('includeExplanation', 'true')
  }

  const data = await fetchApi<{ related: RelatedChunk[] }>(`/chunks/related?${params.toString()}`)

  // Add connection reasons based on score (or use explanation if available)
  return data.related.map((chunk) => ({
    ...chunk,
    connectionReason: chunk.explanation
      ? getExplanationReason(chunk.explanation)
      : getConnectionReason(chunk.score, chunk.filePath === filePath),
  }))
}

/**
 * Get human-readable connection reason from explanation
 */
function getExplanationReason(explanation: ChunkExplanation): string {
  switch (explanation.reasonLabel) {
    case 'same_doc':
      return 'Same document'
    case 'very_similar':
      return 'Very similar'
    case 'related_topic':
      return 'Related topic'
    case 'loosely_related':
      return 'Loosely related'
    default:
      return 'Related'
  }
}

/**
 * Batch get related chunks for multiple source chunks
 */
export async function getBatchRelatedChunks(
  chunks: ChunkKey[],
  limit?: number
): Promise<Record<string, RelatedChunk[]>> {
  const data = await fetchApi<{ results: Record<string, DocumentChunk[]> }>(
    '/chunks/batch-related',
    {
      method: 'POST',
      body: JSON.stringify({ chunks, limit }),
    }
  )

  // Add connection reasons to all results
  const results: Record<string, RelatedChunk[]> = {}
  for (const [key, relatedChunks] of Object.entries(data.results)) {
    const [sourceFilePath] = key.split(':')
    results[key] = relatedChunks.map((chunk) => ({
      ...chunk,
      connectionReason: getConnectionReason(chunk.score, chunk.filePath === sourceFilePath),
    }))
  }

  return results
}

/**
 * Get human-readable connection reason based on score
 */
function getConnectionReason(score: number, isSameDocument: boolean): string {
  if (isSameDocument) {
    return 'Same document'
  }
  if (score < 0.3) {
    return 'Very similar'
  }
  if (score < 0.5) {
    return 'Related topic'
  }
  return 'Loosely related'
}

// ============================================
// Curatorial Flywheel API (Gap 4)
// ============================================

/**
 * Feedback event types
 */
export type FeedbackEventType = 'pin' | 'unpin' | 'dismiss_inferred' | 'click_related'

/**
 * Chunk reference for feedback
 */
export interface FeedbackChunkRef {
  filePath: string
  chunkIndex: number
  fingerprint?: string
}

/**
 * Record a feedback event (pin, unpin, dismiss, click)
 */
export async function recordFeedback(
  type: FeedbackEventType,
  source: FeedbackChunkRef,
  target: FeedbackChunkRef
): Promise<void> {
  await fetchApi('/feedback', {
    method: 'POST',
    body: JSON.stringify({ type, source, target }),
  })
}
