import type { GraphData, GraphNode } from '../components/Graph/types'

// ============================================
// Types
// ============================================

export type GraphExportFormat = 'json' | 'svg' | 'png'

export interface ExportedGraphData {
  version: 1
  exportedAt: string
  nodes: Array<{
    id: string
    filePath: string
    chunkIndex: number
    text: string
    position?: { x: number; y: number }
  }>
  edges: Array<{
    source: string
    target: string
    type: string
    score?: number
  }>
}

export interface GraphExportOptions {
  includePositions?: boolean
  width?: number
  height?: number
  backgroundColor?: string
}

// ============================================
// JSON Export
// ============================================

export function exportGraphAsJSON(
  graphData: GraphData,
  nodes: GraphNode[],
  options: GraphExportOptions = {}
): ExportedGraphData {
  const { includePositions = true } = options

  // Build position map
  const positionMap = new Map<string, { x: number; y: number }>()
  if (includePositions) {
    for (const node of nodes) {
      if (node.x !== undefined && node.y !== undefined) {
        positionMap.set(node.id, { x: node.x, y: node.y })
      }
    }
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    nodes: graphData.nodes.map((node) => ({
      id: node.id,
      filePath: node.filePath,
      chunkIndex: node.chunkIndex,
      text: node.text,
      position: includePositions ? positionMap.get(node.id) : undefined,
    })),
    edges: graphData.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      type: edge.type,
      score: edge.score,
    })),
  }
}

export function downloadGraphJSON(
  graphData: GraphData,
  nodes: GraphNode[],
  filename = 'knowledge-graph.json',
  options: GraphExportOptions = {}
): void {
  const data = exportGraphAsJSON(graphData, nodes, options)
  const json = JSON.stringify(data, null, 2)
  downloadBlob(new Blob([json], { type: 'application/json' }), filename)
}

// ============================================
// SVG Export
// ============================================

export function exportGraphAsSVG(
  graphData: GraphData,
  nodes: GraphNode[],
  options: GraphExportOptions = {}
): string {
  const { width = 800, height = 600, backgroundColor = '#ffffff' } = options

  // Build position map
  const positionMap = new Map<string, { x: number; y: number }>()
  for (const node of nodes) {
    if (node.x !== undefined && node.y !== undefined) {
      positionMap.set(node.id, { x: node.x, y: node.y })
    }
  }

  // Start SVG
  const svgParts: string[] = []
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`)
  svgParts.push(`  <rect width="100%" height="100%" fill="${backgroundColor}"/>`)

  // Draw edges
  svgParts.push('  <g class="edges">')
  for (const edge of graphData.edges) {
    const sourcePos = positionMap.get(edge.source)
    const targetPos = positionMap.get(edge.target)
    if (!sourcePos || !targetPos) continue

    const strokeColor = getEdgeColor(edge.type)
    const strokeWidth = edge.type === 'pinned' ? 2 : 1.5
    const dashArray = edge.type === 'semantic' ? '4,4' : 'none'

    svgParts.push(
      `    <line x1="${sourcePos.x}" y1="${sourcePos.y}" x2="${targetPos.x}" y2="${targetPos.y}" ` +
        `stroke="${strokeColor}" stroke-width="${strokeWidth}" ${dashArray !== 'none' ? `stroke-dasharray="${dashArray}"` : ''}/>`
    )
  }
  svgParts.push('  </g>')

  // Draw nodes
  svgParts.push('  <g class="nodes">')
  for (const node of graphData.nodes) {
    const pos = positionMap.get(node.id)
    if (!pos) continue

    const radius = 8
    const fill = '#9ca3af' // gray-400

    svgParts.push(`    <circle cx="${pos.x}" cy="${pos.y}" r="${radius}" fill="${fill}" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>`)

    // Add node label as title for accessibility
    svgParts.push(`    <title>${escapeXml(node.text.slice(0, 50))}</title>`)
  }
  svgParts.push('  </g>')

  svgParts.push('</svg>')
  return svgParts.join('\n')
}

export function downloadGraphSVG(
  graphData: GraphData,
  nodes: GraphNode[],
  filename = 'knowledge-graph.svg',
  options: GraphExportOptions = {}
): void {
  const svg = exportGraphAsSVG(graphData, nodes, options)
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), filename)
}

// ============================================
// PNG Export
// ============================================

export async function exportGraphAsPNG(
  canvas: HTMLCanvasElement,
  options: GraphExportOptions = {}
): Promise<Blob> {
  const { backgroundColor = '#ffffff' } = options

  return new Promise((resolve, reject) => {
    // Create a temporary canvas with background
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    const ctx = tempCanvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }

    // Draw background
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

    // Draw original canvas content
    ctx.drawImage(canvas, 0, 0)

    tempCanvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Failed to create PNG blob'))
      }
    }, 'image/png')
  })
}

export async function downloadGraphPNG(
  canvas: HTMLCanvasElement,
  filename = 'knowledge-graph.png',
  options: GraphExportOptions = {}
): Promise<void> {
  const blob = await exportGraphAsPNG(canvas, options)
  downloadBlob(blob, filename)
}

// ============================================
// Helpers
// ============================================

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function getEdgeColor(type: string): string {
  switch (type) {
    case 'pinned':
      return '#3b82f6' // blue-500
    case 'backlink':
      return '#8b5cf6' // violet-500
    case 'semantic':
    default:
      return '#d1d5db' // gray-300
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
