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
