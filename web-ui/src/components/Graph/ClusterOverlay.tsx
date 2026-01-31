import type { DocumentCluster } from '../../hooks/useGraphClustering'
import { calculateClusterBounds } from '../../hooks/useGraphClustering'

// ============================================
// Types
// ============================================

interface ClusterLegendProps {
  clusters: DocumentCluster[]
  clusterColors: Map<string, string>
}

// ============================================
// Cluster Overlay
// ============================================

/**
 * Draws cluster boundaries as colored regions behind nodes
 * This renders directly to canvas, so it's a utility function not a component
 */
export function drawClusterOverlays(
  ctx: CanvasRenderingContext2D,
  clusters: DocumentCluster[],
  padding = 25
): void {
  for (const cluster of clusters) {
    const bounds = calculateClusterBounds(cluster, padding)
    if (!bounds) continue

    // Draw rounded rectangle
    ctx.beginPath()
    roundedRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, 12)
    ctx.fillStyle = cluster.color
    ctx.fill()

    // Draw border
    ctx.strokeStyle = cluster.color.replace('0.15)', '0.4)')
    ctx.lineWidth = 1
    ctx.stroke()

    // Draw label
    if (cluster.bounds) {
      ctx.font = '11px sans-serif'
      ctx.fillStyle = cluster.color.replace('0.15)', '0.7)')
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(truncateFileName(cluster.fileName, 20), cluster.bounds.centerX, bounds.y + 4)
    }
  }
}

// ============================================
// Cluster Legend
// ============================================

/**
 * Legend component showing document-to-color mapping
 */
export function ClusterLegend({ clusters, clusterColors }: ClusterLegendProps) {
  if (clusters.length === 0) return null

  return (
    <div className="absolute bottom-2 left-2 z-10 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-3 py-2 max-w-xs max-h-48 overflow-y-auto">
      <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
        Document Clusters
      </h4>
      <div className="space-y-1">
        {clusters.map((cluster) => (
          <div key={cluster.filePath} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded flex-shrink-0"
              style={{ backgroundColor: clusterColors.get(cluster.filePath) }}
            />
            <span
              className="text-xs text-gray-700 dark:text-gray-300 truncate"
              title={cluster.filePath}
            >
              {cluster.fileName}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              ({cluster.nodeIds.length})
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// Helpers
// ============================================

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function truncateFileName(fileName: string, maxLength: number): string {
  if (fileName.length <= maxLength) return fileName
  const ext = fileName.lastIndexOf('.')
  if (ext > 0 && fileName.length - ext < 6) {
    // Preserve extension
    const extension = fileName.slice(ext)
    const base = fileName.slice(0, ext)
    const availableLength = maxLength - extension.length - 3
    return `${base.slice(0, availableLength)}...${extension}`
  }
  return `${fileName.slice(0, maxLength - 3)}...`
}
