import type { GraphData, GraphEdge } from '../components/Graph/types'

// ============================================
// Types
// ============================================

interface PathfindingResult {
  found: boolean
  path: string[] // Node IDs from start to end
  distance: number
}

export interface PathHighlightState {
  isActive: boolean
  mode: 'selecting-start' | 'selecting-end' | 'complete'
  startNode: string | null
  endNode: string | null
  path: string[]
  pathEdges: Set<string> // Edge keys in format "source:target"
}

// ============================================
// Pathfinding Algorithms
// ============================================

/**
 * Find shortest path between two nodes using BFS (unweighted)
 */
export function findShortestPath(
  graphData: GraphData,
  startId: string,
  endId: string
): PathfindingResult {
  if (startId === endId) {
    return { found: true, path: [startId], distance: 0 }
  }

  // Build adjacency list
  const adjacency = buildAdjacencyList(graphData.edges)

  // BFS
  const visited = new Set<string>()
  const queue: Array<{ nodeId: string; path: string[] }> = [{ nodeId: startId, path: [startId] }]
  visited.add(startId)

  while (queue.length > 0) {
    const current = queue.shift()!

    const neighbors = adjacency.get(current.nodeId) || []
    for (const neighbor of neighbors) {
      if (neighbor === endId) {
        const fullPath = [...current.path, neighbor]
        return {
          found: true,
          path: fullPath,
          distance: fullPath.length - 1,
        }
      }

      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push({
          nodeId: neighbor,
          path: [...current.path, neighbor],
        })
      }
    }
  }

  return { found: false, path: [], distance: -1 }
}

// ============================================
// Helpers
// ============================================

function buildAdjacencyList(edges: GraphEdge[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>()

  for (const edge of edges) {
    // Add source -> target
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, [])
    }
    adjacency.get(edge.source)!.push(edge.target)

    // Add target -> source (undirected graph)
    if (!adjacency.has(edge.target)) {
      adjacency.set(edge.target, [])
    }
    adjacency.get(edge.target)!.push(edge.source)
  }

  return adjacency
}
