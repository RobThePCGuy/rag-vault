/**
 * Reference to a chunk with fingerprint for resilient linking
 */
interface ChunkRef {
  filePath: string
  chunkIndex: number
  fingerprint?: string
}

/**
 * Item types in the synthesis outline
 */
type OutlineItemType = 'heading' | 'chunk-ref' | 'note'

/**
 * Single item in the synthesis outline
 */
export interface OutlineItem {
  id: string
  type: OutlineItemType
  content: string
  /** Source reference for chunk-ref items */
  sourceRef?: ChunkRef
  /** Preview text from source (for display) */
  sourcePreview?: string
  /** Indent level for nesting (0 = top level) */
  indentLevel: number
}

/**
 * Complete synthesis draft
 */
export interface SynthesisDraft {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  items: OutlineItem[]
}
