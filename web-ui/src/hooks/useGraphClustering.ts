import { useMemo } from 'react'
import type { GraphNode } from '../components/Graph/types'

// ============================================
// Types
// ============================================

export interface DocumentCluster {
  filePath: string
  fileName: string
  nodeIds: string[]
  color: string
  bounds?: {
    minX: number
    maxX: number
    minY: number
    maxY: number
    centerX: number
    centerY: number
  }
}

interface UseGraphClusteringOptions {
  nodes: GraphNode[]
  enabled: boolean
}

interface UseGraphClusteringResult {
  clusters: DocumentCluster[]
  getClusterForNode: (nodeId: string) => DocumentCluster | undefined
  clusterColors: Map<string, string>
}

// ============================================
// Color Palette
// ============================================

const CLUSTER_COLORS = [
  'rgba(59, 130, 246, 0.15)', // blue
  'rgba(16, 185, 129, 0.15)', // emerald
  'rgba(245, 158, 11, 0.15)', // amber
  'rgba(239, 68, 68, 0.15)', // red
  'rgba(139, 92, 246, 0.15)', // violet
  'rgba(236, 72, 153, 0.15)', // pink
  'rgba(34, 197, 94, 0.15)', // green
  'rgba(6, 182, 212, 0.15)', // cyan
  'rgba(249, 115, 22, 0.15)', // orange
  'rgba(99, 102, 241, 0.15)', // indigo
]

// Solid colors for legend
const CLUSTER_LEGEND_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#22c55e', // green
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
]

// ============================================
// Hook
// ============================================

/**
 * Hook for clustering graph nodes by document
 */
export function useGraphClustering({
  nodes,
  enabled,
}: UseGraphClusteringOptions): UseGraphClusteringResult {
  const clusters = useMemo(() => {
    if (!enabled || nodes.length === 0) return []

    // Group nodes by file path
    const groupedNodes = new Map<string, GraphNode[]>()

    for (const node of nodes) {
      if (!groupedNodes.has(node.filePath)) {
        groupedNodes.set(node.filePath, [])
      }
      groupedNodes.get(node.filePath)!.push(node)
    }

    // Build clusters with colors
    const result: DocumentCluster[] = []
    let colorIndex = 0

    for (const [filePath, fileNodes] of groupedNodes) {
      const color = CLUSTER_COLORS[colorIndex % CLUSTER_COLORS.length] ?? CLUSTER_COLORS[0]!
      colorIndex++

      // Extract filename
      const parts = filePath.split(/[/\\]/)
      const fileName = parts[parts.length - 1] ?? filePath

      const cluster: DocumentCluster = {
        filePath,
        fileName,
        nodeIds: fileNodes.map((n) => n.id),
        color,
      }

      // Calculate bounds if nodes have positions
      const nodesWithPos = fileNodes.filter((n) => n.x !== undefined && n.y !== undefined)

      if (nodesWithPos.length > 0) {
        const xs = nodesWithPos.map((n) => n.x!)
        const ys = nodesWithPos.map((n) => n.y!)

        cluster.bounds = {
          minX: Math.min(...xs),
          maxX: Math.max(...xs),
          minY: Math.min(...ys),
          maxY: Math.max(...ys),
          centerX: (Math.min(...xs) + Math.max(...xs)) / 2,
          centerY: (Math.min(...ys) + Math.max(...ys)) / 2,
        }
      }

      result.push(cluster)
    }

    return result
  }, [nodes, enabled])

  const getClusterForNode = useMemo(() => {
    const nodeToCluster = new Map<string, DocumentCluster>()
    for (const cluster of clusters) {
      for (const nodeId of cluster.nodeIds) {
        nodeToCluster.set(nodeId, cluster)
      }
    }
    return (nodeId: string) => nodeToCluster.get(nodeId)
  }, [clusters])

  const clusterColors = useMemo(() => {
    const map = new Map<string, string>()
    let colorIndex = 0
    for (const cluster of clusters) {
      const legendColor =
        CLUSTER_LEGEND_COLORS[colorIndex % CLUSTER_LEGEND_COLORS.length] ??
        CLUSTER_LEGEND_COLORS[0]!
      map.set(cluster.filePath, legendColor)
      colorIndex++
    }
    return map
  }, [clusters])

  return {
    clusters,
    getClusterForNode,
    clusterColors,
  }
}

// ============================================
// Cluster Bounds Calculation
// ============================================

/**
 * Calculate padded bounds for cluster overlay
 */
export function calculateClusterBounds(
  cluster: DocumentCluster,
  padding = 20
): { x: number; y: number; width: number; height: number } | null {
  if (!cluster.bounds) return null

  const { minX, maxX, minY, maxY } = cluster.bounds

  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  }
}

/**
 * Get cluster color for a node
 */
export function getClusterColorForNode(nodeId: string, clusters: DocumentCluster[]): string | null {
  for (const cluster of clusters) {
    if (cluster.nodeIds.includes(nodeId)) {
      return cluster.color
    }
  }
  return null
}
