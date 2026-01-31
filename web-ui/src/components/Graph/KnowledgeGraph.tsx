import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GraphConfig, GraphData, GraphNode } from './types'
import { DEFAULT_GRAPH_CONFIG } from './types'
import { useForceSimulation } from './useForceSimulation'

interface KnowledgeGraphProps {
  graphData: GraphData
  currentNodeId: string | null
  pinnedNodeIds: Set<string>
  onNodeClick?: (node: GraphNode) => void
  config?: Partial<GraphConfig>
}

/**
 * Canvas-based knowledge graph visualization
 * Renders nodes and edges with force-directed layout
 */
export function KnowledgeGraph({
  graphData,
  currentNodeId,
  pinnedNodeIds,
  onNodeClick,
  config: configOverrides,
}: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 })
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: GraphNode } | null>(null)

  // Camera/viewport state
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const isPanningRef = useRef(false)
  const lastMousePosRef = useRef({ x: 0, y: 0 })

  const config = useMemo(() => ({ ...DEFAULT_GRAPH_CONFIG, ...configOverrides }), [configOverrides])

  // Force simulation
  const { nodes, isStable } = useForceSimulation({
    graphData,
    config: configOverrides,
    width: dimensions.width,
    height: dimensions.height,
    enabled: graphData.nodes.length > 0,
  })

  // Handle resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Transform screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }

      const rect = canvas.getBoundingClientRect()
      const x = (screenX - rect.left - pan.x) / zoom
      const y = (screenY - rect.top - pan.y) / zoom
      return { x, y }
    },
    [pan, zoom]
  )

  // Find node at position
  const findNodeAtPosition = useCallback(
    (x: number, y: number): GraphNode | null => {
      for (const node of nodes) {
        if (node.x === undefined || node.y === undefined) continue
        const dx = x - node.x
        const dy = y - node.y
        const radius = node.id === currentNodeId ? config.activeNodeRadius : config.nodeRadius
        if (dx * dx + dy * dy <= radius * radius * 1.5) {
          return node
        }
      }
      return null
    },
    [nodes, currentNodeId, config.nodeRadius, config.activeNodeRadius]
  )

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isPanningRef.current = true
    lastMousePosRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Handle panning
      if (isPanningRef.current) {
        const dx = e.clientX - lastMousePosRef.current.x
        const dy = e.clientY - lastMousePosRef.current.y
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
        lastMousePosRef.current = { x: e.clientX, y: e.clientY }
        return
      }

      // Handle hover
      const { x, y } = screenToCanvas(e.clientX, e.clientY)
      const node = findNodeAtPosition(x, y)
      setHoveredNode(node)

      if (node) {
        const canvas = canvasRef.current
        if (canvas) {
          const rect = canvas.getBoundingClientRect()
          setTooltip({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            node,
          })
        }
      } else {
        setTooltip(null)
      }
    },
    [screenToCanvas, findNodeAtPosition]
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = screenToCanvas(e.clientX, e.clientY)
      const node = findNodeAtPosition(x, y)
      if (node && onNodeClick) {
        onNodeClick(node)
      }
    },
    [screenToCanvas, findNodeAtPosition, onNodeClick]
  )

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom((prev) => Math.max(0.3, Math.min(3, prev * delta)))
  }, [])

  // Draw the graph
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = dimensions.width * window.devicePixelRatio
    canvas.height = dimensions.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height)

    // Apply transforms
    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // Create node position lookup
    const nodePositions = new Map<string, { x: number; y: number }>()
    for (const node of nodes) {
      if (node.x !== undefined && node.y !== undefined) {
        nodePositions.set(node.id, { x: node.x, y: node.y })
      }
    }

    // Draw edges
    for (const edge of graphData.edges) {
      const sourcePos = nodePositions.get(edge.source)
      const targetPos = nodePositions.get(edge.target)
      if (!sourcePos || !targetPos) continue

      ctx.beginPath()
      ctx.moveTo(sourcePos.x, sourcePos.y)
      ctx.lineTo(targetPos.x, targetPos.y)

      // Style based on type
      ctx.strokeStyle =
        edge.type === 'pinned'
          ? config.pinnedEdgeColor
          : edge.type === 'backlink'
            ? config.backlinkEdgeColor
            : config.semanticEdgeColor

      ctx.lineWidth = edge.type === 'pinned' ? config.edgeWidth * 1.5 : config.edgeWidth

      // Dashed for semantic, solid for pinned
      if (edge.type === 'semantic') {
        ctx.setLineDash([4, 4])
      } else {
        ctx.setLineDash([])
      }

      ctx.stroke()
    }

    // Reset dash
    ctx.setLineDash([])

    // Draw nodes
    for (const node of nodes) {
      if (node.x === undefined || node.y === undefined) continue

      const isCurrent = node.id === currentNodeId
      const isPinned = pinnedNodeIds.has(node.id)
      const isHovered = hoveredNode?.id === node.id

      const radius = isCurrent ? config.activeNodeRadius : config.nodeRadius
      const color = isCurrent
        ? config.currentNodeColor
        : isPinned
          ? config.pinnedNodeColor
          : config.defaultNodeColor

      // Draw node circle
      ctx.beginPath()
      ctx.arc(node.x, node.y, isHovered ? radius * 1.3 : radius, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()

      // Draw border
      ctx.strokeStyle = isHovered ? '#fff' : 'rgba(0,0,0,0.2)'
      ctx.lineWidth = isHovered ? 2 : 1
      ctx.stroke()

      // Draw label for current node
      if (isCurrent) {
        ctx.font = '10px sans-serif'
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('●', node.x, node.y)
      }
    }

    ctx.restore()
  }, [
    nodes,
    graphData.edges,
    dimensions,
    pan,
    zoom,
    currentNodeId,
    pinnedNodeIds,
    hoveredNode,
    config,
  ])

  // Extract filename from path
  const getFileName = (filePath: string) => {
    const parts = filePath.split(/[/\\]/)
    return parts[parts.length - 1] || filePath
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ width: dimensions.width, height: dimensions.height }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setHoveredNode(null)
          setTooltip(null)
          isPanningRef.current = false
        }}
        onClick={handleClick}
        onWheel={handleWheel}
      />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 max-w-xs px-3 py-2 text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg shadow-lg"
          style={{
            left: Math.min(tooltip.x + 10, dimensions.width - 200),
            top: Math.min(tooltip.y + 10, dimensions.height - 60),
          }}
        >
          <p className="font-medium truncate">{getFileName(tooltip.node.filePath)}</p>
          <p className="text-gray-300 dark:text-gray-600">Chunk #{tooltip.node.chunkIndex}</p>
          <p className="mt-1 line-clamp-2 text-gray-400 dark:text-gray-500">{tooltip.node.text}</p>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-2 right-2 flex gap-1">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(3, z * 1.2))}
          className="p-1.5 bg-white dark:bg-gray-800 rounded shadow text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          title="Zoom in"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.3, z * 0.8))}
          className="p-1.5 bg-white dark:bg-gray-800 rounded shadow text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          title="Zoom out"
        >
          <MinusIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setPan({ x: 0, y: 0 })
            setZoom(1)
          }}
          className="p-1.5 bg-white dark:bg-gray-800 rounded shadow text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          title="Reset view"
        >
          <ResetIcon className="w-4 h-4" />
        </button>
        {!isStable && (
          <span className="p-1.5 text-xs text-gray-500 dark:text-gray-400">Simulating...</span>
        )}
      </div>

      {/* Legend */}
      <div className="absolute top-2 left-2 text-xs text-gray-600 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded">
        <span className="inline-flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: config.currentNodeColor }}
          />
          Current
        </span>
        <span className="inline-flex items-center gap-1 ml-3">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: config.pinnedNodeColor }}
          />
          Pinned
        </span>
        <span className="inline-flex items-center gap-1 ml-3">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: config.defaultNodeColor }}
          />
          Related
        </span>
      </div>
    </div>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  )
}

function ResetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  )
}
