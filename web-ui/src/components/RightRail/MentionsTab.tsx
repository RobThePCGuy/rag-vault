import { useMemo } from 'react'
import { useLinkIndexContext } from '../../contexts/LinkIndexContext'
import { useSelection } from '../../contexts/SelectionContext'
import type { LinkEdge } from '../../utils/link-index-builder'
import { WsBadge } from '../ws/WsBadge'
import { RailEmptyState } from './EmptyState'
import { VirtualizedRailList } from './VirtualizedRailList'

/**
 * Extract a human-readable document name from a docId.
 * Handles both file paths ("notes/My Document.md" -> "My Document")
 * and plain titles ("My Document" -> "My Document").
 */
function extractDocName(docId: string): string {
  const segments = docId.split('/')
  const fileName = segments[segments.length - 1] ?? docId
  return fileName.replace(/\.[^.]+$/, '')
}

interface MentionGroup {
  sourceDoc: string
  edges: LinkEdge[]
}

export function MentionsTab() {
  const { selection, select } = useSelection()
  const { index, isScanning, getIncomingLinks } = useLinkIndexContext()

  const docName = useMemo(
    () => (selection.docId ? extractDocName(selection.docId) : null),
    [selection.docId]
  )

  // Linked mentions: documents that already wiki-link to this doc
  const linkedMentions = useMemo<MentionGroup[]>(() => {
    if (!docName) return []

    const edges = getIncomingLinks(docName)
    if (edges.length === 0) return []

    const grouped = new Map<string, LinkEdge[]>()
    for (const edge of edges) {
      const existing = grouped.get(edge.sourceDoc)
      if (existing) {
        existing.push(edge)
      } else {
        grouped.set(edge.sourceDoc, [edge])
      }
    }

    return Array.from(grouped.entries()).map(([sourceDoc, groupEdges]) => ({
      sourceDoc,
      edges: groupEdges,
    }))
  }, [docName, getIncomingLinks])

  const candidateCount = useMemo<number>(() => {
    if (!docName || !index) return 0

    const linkedSourceDocs = new Set(getIncomingLinks(docName).map((e) => e.sourceDoc))

    let count = 0
    for (const filePath of Object.keys(index.outgoing)) {
      if (filePath === selection.docId) continue
      if (linkedSourceDocs.has(filePath)) continue
      count++
    }
    return count
  }, [docName, index, selection.docId, getIncomingLinks])

  if (!selection.docId) {
    return <RailEmptyState message="Select a document to see unlinked mentions" />
  }

  if (isScanning) {
    return <div className="ws-rail-loading">Scanning for mentions...</div>
  }

  if (!index) {
    return <RailEmptyState message="Link index not available" />
  }

  const hasLinked = linkedMentions.length > 0

  if (!hasLinked && candidateCount === 0) {
    return <RailEmptyState message="No mentions found for this document" />
  }

  return (
    <div className="ws-rail-list">
      {/* Linked mentions section */}
      {hasLinked && (
        <>
          <div className="ws-rail-item-meta" style={{ padding: '0.5rem 0.75rem' }}>
            Linked mentions
            <WsBadge
              variant="success"
              count={linkedMentions.length}
              style={{ marginLeft: '0.5rem' }}
            >
              linked
            </WsBadge>
          </div>
          <VirtualizedRailList
            items={linkedMentions}
            getKey={(group) => group.sourceDoc}
            renderItem={(group) => {
              const fileName = group.sourceDoc.split('/').pop() ?? group.sourceDoc
              const chunkRefs = group.edges.map((e) => `#${e.chunkIndex}`).join(', ')
              return (
                <button
                  type="button"
                  className="ws-rail-item"
                  onClick={() => {
                    select({ docId: group.sourceDoc, source: 'backlink' })
                  }}
                >
                  <span className="ws-rail-item-title">{fileName}</span>
                  <span className="ws-rail-item-meta">
                    {group.edges.length} link{group.edges.length !== 1 ? 's' : ''} - Chunks{' '}
                    {chunkRefs}
                  </span>
                </button>
              )
            }}
          />
        </>
      )}

      {/* Unlinked mentions section */}
      {candidateCount > 0 && (
        <div
          className="ws-rail-item-meta"
          style={{ padding: '0.5rem 0.75rem', marginTop: hasLinked ? '0.75rem' : 0 }}
        >
          <WsBadge variant="info" count={candidateCount} style={{ marginRight: '0.5rem' }}>
            unlinked
          </WsBadge>
          {candidateCount} document{candidateCount !== 1 ? 's' : ''} scanned without a link to
          &quot;{docName}&quot;.
          <p className="ws-rail-item-excerpt" style={{ marginTop: '0.375rem' }}>
            Full text scanning for unlinked mentions requires fetching all document chunks and is
            planned for a future update.
          </p>
        </div>
      )}
    </div>
  )
}
