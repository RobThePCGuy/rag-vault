export interface GraphNode {
  id: string // `${filePath}:${chunkIndex}`
  filePath: string
  chunkIndex: number
  text: string // Preview (100 chars)
  x?: number
  y?: number
  vx?: number // Velocity for simulation
  vy?: number
  fx?: number | null // Fixed position (for dragging)
  fy?: number | null
  radius?: number
}

export interface GraphEdge {
  source: string
  target: string
  score: number
  type: 'semantic' | 'pinned' | 'same-doc' | 'backlink'
  label?: string // Human-readable reason
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface GraphConfig {
  // Node appearance
  nodeRadius: number
  activeNodeRadius: number
  currentNodeColor: string
  defaultNodeColor: string
  pinnedNodeColor: string

  // Edge appearance
  edgeWidth: number
  pinnedEdgeColor: string
  semanticEdgeColor: string
  backlinkedgeColor: string

  // Simulation parameters
  repulsionStrength: number
  attractionStrength: number
  centerGravity: number
  velocityDecay: number

  // Limits
  maxNodes: number
  neighborsToShow: number
}

export const DEFAULT_GRAPH_CONFIG: GraphConfig = {
  nodeRadius: 8,
  activeNodeRadius: 12,
  currentNodeColor: '#3b82f6', // blue-500
  defaultNodeColor: '#9ca3af', // gray-400
  pinnedNodeColor: '#10b981', // emerald-500

  edgeWidth: 1.5,
  pinnedEdgeColor: '#3b82f6', // blue-500
  semanticEdgeColor: '#d1d5db', // gray-300
  backlinkedgeColor: '#8b5cf6', // violet-500

  repulsionStrength: 150,
  attractionStrength: 0.3,
  centerGravity: 0.05,
  velocityDecay: 0.4,

  maxNodes: 150,
  neighborsToShow: 10,
}
