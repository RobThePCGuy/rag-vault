import { useMemo } from 'react'
import type { RelatedChunk } from '../api/client'
import type { PinnedLink } from '../contexts/LinksContext'
import type { GraphData, GraphNode, GraphEdge } from '../components/Graph/types'

interface UseGraphDataOptions {
  filePath: string
  activeChunkIndex: number | null
  relatedChunks: RelatedChunk[]
  pins: PinnedLink[]
  maxNodes?: number
}

interface UseGraphDataResult {
  graphData: GraphData
  currentNodeId: string | null
}

/**
 * Generates graph data from related chunks and pinned links
 */
export function useGraphData({
  filePath,
  activeChunkIndex,
  relatedChunks,
  pins,
  maxNodes = 150,
}: UseGraphDataOptions): UseGraphDataResult {
  const graphData = useMemo<GraphData>(() => {
    const nodes = new Map<string, GraphNode>()
    const edges: GraphEdge[] = []
    const currentNodeId = activeChunkIndex !== null ? `${filePath}:${activeChunkIndex}` : null

    // Add current node
    if (currentNodeId) {
      nodes.set(currentNodeId, {
        id: currentNodeId,
        filePath,
        chunkIndex: activeChunkIndex!,
        text: '(current chunk)',
      })
    }

    // Add related chunks as nodes and edges
    for (const related of relatedChunks) {
      const nodeId = `${related.filePath}:${related.chunkIndex}`

      // Add node if not exists
      if (!nodes.has(nodeId)) {
        nodes.set(nodeId, {
          id: nodeId,
          filePath: related.filePath,
          chunkIndex: related.chunkIndex,
          text: related.text.slice(0, 100) + (related.text.length > 100 ? '...' : ''),
        })
      }

      // Add edge from current to related
      if (currentNodeId && currentNodeId !== nodeId) {
        edges.push({
          source: currentNodeId,
          target: nodeId,
          score: related.score,
          type: 'semantic',
          label: related.connectionReason,
        })
      }
    }

    // Add pinned links
    for (const pin of pins) {
      const sourceId = `${pin.sourceKey.filePath}:${pin.sourceKey.chunkIndex}`
      const targetId = `${pin.targetKey.filePath}:${pin.targetKey.chunkIndex}`

      // Add source node if not exists
      if (!nodes.has(sourceId)) {
        nodes.set(sourceId, {
          id: sourceId,
          filePath: pin.sourceKey.filePath,
          chunkIndex: pin.sourceKey.chunkIndex,
          text: pin.sourceText.slice(0, 100) + (pin.sourceText.length > 100 ? '...' : ''),
        })
      }

      // Add target node if not exists
      if (!nodes.has(targetId)) {
        nodes.set(targetId, {
          id: targetId,
          filePath: pin.targetKey.filePath,
          chunkIndex: pin.targetKey.chunkIndex,
          text: pin.targetText.slice(0, 100) + (pin.targetText.length > 100 ? '...' : ''),
        })
      }

      // Check if this edge already exists (as semantic)
      const existingEdgeIndex = edges.findIndex(
        (e) => e.source === sourceId && e.target === targetId
      )

      if (existingEdgeIndex >= 0) {
        // Upgrade to pinned type
        const existingEdge = edges[existingEdgeIndex]
        if (existingEdge) {
          edges[existingEdgeIndex] = {
            ...existingEdge,
            type: 'pinned',
            label: pin.label || existingEdge.label,
          }
        }
      } else {
        // Add new pinned edge
        edges.push({
          source: sourceId,
          target: targetId,
          score: pin.originalScore ?? 0.5,
          type: 'pinned',
          label: pin.label,
        })
      }
    }

    // Convert to arrays and limit nodes
    let nodeArray = Array.from(nodes.values())
    if (nodeArray.length > maxNodes) {
      // Keep current node, pinned nodes, and highest scored related
      const pinnedNodeIds = new Set(
        pins.flatMap((p) => [
          `${p.sourceKey.filePath}:${p.sourceKey.chunkIndex}`,
          `${p.targetKey.filePath}:${p.targetKey.chunkIndex}`,
        ])
      )

      const keptNodes = nodeArray.filter((n) => n.id === currentNodeId || pinnedNodeIds.has(n.id))
      const remainingCapacity = Math.max(0, maxNodes - keptNodes.length)
      const otherNodes = nodeArray
        .filter((n) => n.id !== currentNodeId && !pinnedNodeIds.has(n.id))
        .slice(0, remainingCapacity)
      nodeArray = keptNodes.concat(otherNodes)
    }

    // Filter edges to only include nodes we're showing
    const nodeIds = new Set(nodeArray.map((n) => n.id))
    const filteredEdges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))

    return {
      nodes: nodeArray,
      edges: filteredEdges,
    }
  }, [filePath, activeChunkIndex, relatedChunks, pins, maxNodes])

  const currentNodeId = activeChunkIndex !== null ? `${filePath}:${activeChunkIndex}` : null

  return { graphData, currentNodeId }
}
