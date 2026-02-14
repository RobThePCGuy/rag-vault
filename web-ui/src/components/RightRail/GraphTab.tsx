import { useMemo } from 'react'
import { KnowledgeGraph } from '../Graph'
import { useSelection } from '../../contexts/SelectionContext'
import { useRelatedChunks, usePins, useGraphData } from '../../hooks'
import type { GraphNode } from '../Graph'
import { RailEmptyState } from './EmptyState'

export function GraphTab() {
  const { selection, select } = useSelection()
  const docId = selection.docId ?? null
  const chunkIndex = selection.chunkIndex ?? null

  const { related, isLoading } = useRelatedChunks(docId, chunkIndex)
  const { pins } = usePins()

  const { graphData, currentNodeId } = useGraphData({
    filePath: docId ?? '',
    activeChunkIndex: chunkIndex,
    relatedChunks: related,
    pins,
  })

  // Build set of pinned node IDs for highlighting
  const pinnedNodeIds = useMemo(() => {
    const ids = new Set<string>()
    for (const pin of pins) {
      ids.add(`${pin.sourceKey.filePath}:${pin.sourceKey.chunkIndex}`)
      ids.add(`${pin.targetKey.filePath}:${pin.targetKey.chunkIndex}`)
    }
    return ids
  }, [pins])

  const handleNodeClick = (node: GraphNode) => {
    select({
      docId: node.filePath,
      chunkIndex: node.chunkIndex,
      source: 'graph',
    })
  }

  if (!docId) return <RailEmptyState message="Select a document to see its graph" />
  if (isLoading) return <div className="ws-rail-loading">Loading graph...</div>
  if (graphData.nodes.length === 0) return <RailEmptyState message="No graph data available" />

  return (
    <div style={{ height: '100%', minHeight: 300 }}>
      <KnowledgeGraph
        graphData={graphData}
        currentNodeId={currentNodeId}
        pinnedNodeIds={pinnedNodeIds}
        onNodeClick={handleNodeClick}
      />
    </div>
  )
}
