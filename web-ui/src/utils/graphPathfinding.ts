import type { GraphData, GraphEdge } from '../components/Graph/types'

// ============================================
// Types
// ============================================

export interface PathfindingResult {
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

/**
 * Find shortest path with weighted edges (using edge scores)
 */
export function findWeightedPath(
  graphData: GraphData,
  startId: string,
  endId: string
): PathfindingResult {
  if (startId === endId) {
    return { found: true, path: [startId], distance: 0 }
  }

  // Build weighted adjacency list
  const adjacency = buildWeightedAdjacencyList(graphData.edges)

  // Dijkstra's algorithm
  const distances = new Map<string, number>()
  const previous = new Map<string, string | null>()
  const unvisited = new Set<string>()

  // Initialize
  for (const node of graphData.nodes) {
    distances.set(node.id, Infinity)
    previous.set(node.id, null)
    unvisited.add(node.id)
  }
  distances.set(startId, 0)

  while (unvisited.size > 0) {
    // Find node with minimum distance
    let minNode: string | null = null
    let minDist = Infinity

    for (const nodeId of unvisited) {
      const dist = distances.get(nodeId) || Infinity
      if (dist < minDist) {
        minDist = dist
        minNode = nodeId
      }
    }

    if (minNode === null || minDist === Infinity) {
      break // No reachable nodes left
    }

    if (minNode === endId) {
      break // Found target
    }

    unvisited.delete(minNode)

    // Update neighbors
    const neighbors = adjacency.get(minNode) || []
    for (const { nodeId: neighbor, weight } of neighbors) {
      if (!unvisited.has(neighbor)) continue

      const newDist = minDist + weight
      if (newDist < (distances.get(neighbor) || Infinity)) {
        distances.set(neighbor, newDist)
        previous.set(neighbor, minNode)
      }
    }
  }

  // Reconstruct path
  const path: string[] = []
  let current: string | null = endId
  while (current !== null) {
    path.unshift(current)
    current = previous.get(current) || null
  }

  if (path[0] !== startId) {
    return { found: false, path: [], distance: -1 }
  }

  return {
    found: true,
    path,
    distance: distances.get(endId) || 0,
  }
}

// ============================================
// Initial State
// ============================================

export function createInitialPathState(): PathHighlightState {
  return {
    isActive: false,
    mode: 'selecting-start',
    startNode: null,
    endNode: null,
    path: [],
    pathEdges: new Set(),
  }
}

/**
 * Compute path edges set for efficient lookup during rendering
 */
export function computePathEdges(path: string[]): Set<string> {
  const edges = new Set<string>()
  for (let i = 0; i < path.length - 1; i++) {
    const source = path[i]
    const target = path[i + 1]
    // Add both directions since edges might be stored either way
    edges.add(`${source}:${target}`)
    edges.add(`${target}:${source}`)
  }
  return edges
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

function buildWeightedAdjacencyList(
  edges: GraphEdge[]
): Map<string, Array<{ nodeId: string; weight: number }>> {
  const adjacency = new Map<string, Array<{ nodeId: string; weight: number }>>()

  for (const edge of edges) {
    // Use score as weight (lower score = closer = lower weight)
    // If no score, use 1
    const weight = edge.score || 1

    // Add source -> target
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, [])
    }
    adjacency.get(edge.source)!.push({ nodeId: edge.target, weight })

    // Add target -> source (undirected graph)
    if (!adjacency.has(edge.target)) {
      adjacency.set(edge.target, [])
    }
    adjacency.get(edge.target)!.push({ nodeId: edge.source, weight })
  }

  return adjacency
}
