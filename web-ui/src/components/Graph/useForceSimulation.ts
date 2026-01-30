import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GraphConfig, GraphData, GraphNode } from './types'
import { DEFAULT_GRAPH_CONFIG } from './types'

interface UseForceSimulationOptions {
  graphData: GraphData
  config?: Partial<GraphConfig>
  width: number
  height: number
  enabled?: boolean
}

interface UseForceSimulationResult {
  nodes: GraphNode[]
  isStable: boolean
  reheat: () => void
}

/**
 * Simple force-directed graph simulation without D3 dependency
 * Implements repulsion between nodes, attraction on edges, and center gravity
 */
export function useForceSimulation({
  graphData,
  config: configOverrides,
  width,
  height,
  enabled = true,
}: UseForceSimulationOptions): UseForceSimulationResult {
  const config = useMemo(
    () => ({ ...DEFAULT_GRAPH_CONFIG, ...configOverrides }),
    [configOverrides]
  )

  // Store nodes with positions and velocities
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [isStable, setIsStable] = useState(false)
  const animationRef = useRef<number | null>(null)
  const iterationRef = useRef(0)

  // Initialize node positions
  useEffect(() => {
    const centerX = width / 2
    const centerY = height / 2

    // Initialize nodes with random positions around center
    const initializedNodes = graphData.nodes.map((node, i) => {
      // Check if we already have this node with position
      const existingNode = nodes.find((n) => n.id === node.id)
      if (existingNode && existingNode.x !== undefined && existingNode.y !== undefined) {
        return { ...node, x: existingNode.x, y: existingNode.y, vx: 0, vy: 0 }
      }

      // Random position in a circle around center
      const angle = (i / graphData.nodes.length) * Math.PI * 2
      const radius = Math.min(width, height) * 0.3
      return {
        ...node,
        x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
        y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0,
      }
    })

    setNodes(initializedNodes)
    setIsStable(false)
    iterationRef.current = 0
  }, [graphData.nodes.length, width, height]) // Only reinitialize on node count change

  // Build edge lookup for faster simulation
  const edgeLookup = useRef(new Map<string, string[]>())
  useEffect(() => {
    const lookup = new Map<string, string[]>()
    for (const edge of graphData.edges) {
      // Add bidirectional connections
      const sourceNeighbors = lookup.get(edge.source) || []
      sourceNeighbors.push(edge.target)
      lookup.set(edge.source, sourceNeighbors)

      const targetNeighbors = lookup.get(edge.target) || []
      targetNeighbors.push(edge.source)
      lookup.set(edge.target, targetNeighbors)
    }
    edgeLookup.current = lookup
  }, [graphData.edges])

  // Simulation tick
  const tick = useCallback(() => {
    if (!enabled || nodes.length === 0) return false

    const centerX = width / 2
    const centerY = height / 2

    let maxMovement = 0

    // Update nodes
    const updatedNodes = nodes.map((node) => {
      let fx = 0
      let fy = 0

      // Skip fixed nodes
      if (node.fx !== undefined && node.fx !== null && node.fy !== undefined && node.fy !== null) {
        return { ...node, x: node.fx, y: node.fy }
      }

      // Repulsion from all other nodes
      for (const other of nodes) {
        if (other.id === node.id) continue

        const dx = (node.x ?? 0) - (other.x ?? 0)
        const dy = (node.y ?? 0) - (other.y ?? 0)
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = config.repulsionStrength / (dist * dist)

        fx += (dx / dist) * force
        fy += (dy / dist) * force
      }

      // Attraction to connected nodes
      const neighbors = edgeLookup.current.get(node.id) || []
      for (const neighborId of neighbors) {
        const neighbor = nodes.find((n) => n.id === neighborId)
        if (!neighbor) continue

        const dx = (neighbor.x ?? 0) - (node.x ?? 0)
        const dy = (neighbor.y ?? 0) - (node.y ?? 0)

        fx += dx * config.attractionStrength
        fy += dy * config.attractionStrength
      }

      // Center gravity
      fx += (centerX - (node.x ?? 0)) * config.centerGravity
      fy += (centerY - (node.y ?? 0)) * config.centerGravity

      // Apply velocity decay and update velocity
      const vx = ((node.vx ?? 0) + fx) * (1 - config.velocityDecay)
      const vy = ((node.vy ?? 0) + fy) * (1 - config.velocityDecay)

      // Update position
      const newX = (node.x ?? 0) + vx
      const newY = (node.y ?? 0) + vy

      // Constrain to canvas with padding
      const padding = 40
      const constrainedX = Math.max(padding, Math.min(width - padding, newX))
      const constrainedY = Math.max(padding, Math.min(height - padding, newY))

      const movement = Math.sqrt(vx * vx + vy * vy)
      maxMovement = Math.max(maxMovement, movement)

      return {
        ...node,
        x: constrainedX,
        y: constrainedY,
        vx,
        vy,
      }
    })

    setNodes(updatedNodes)
    iterationRef.current++

    // Check if simulation is stable (low movement or max iterations)
    return maxMovement > 0.5 && iterationRef.current < 300
  }, [nodes, enabled, width, height, config])

  // Run simulation loop
  useEffect(() => {
    if (!enabled) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }

    const animate = () => {
      const shouldContinue = tick()
      if (shouldContinue) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsStable(true)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [tick, enabled])

  // Reheat simulation (restart movement)
  const reheat = useCallback(() => {
    setIsStable(false)
    iterationRef.current = 0
    setNodes((prev) =>
      prev.map((node) => ({
        ...node,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
      }))
    )
  }, [])

  return { nodes, isStable, reheat }
}
