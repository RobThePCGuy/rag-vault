import { useCallback, useMemo, useState } from 'react'
import {
  useLinks,
  type ChunkKey,
  type Trail,
  type TrailNode,
  type TrailStep,
} from '../contexts/LinksContext'

export interface UseTrailResult {
  currentTrail: Trail | null
  savedTrails: Trail[]
  isRecording: boolean
  stepCount: number
  startNewTrail: () => void
  addStep: (key: ChunkKey, reason?: string) => void
  saveTrail: (name: string) => Trail
  loadTrail: (trailId: string) => Trail | null
  deleteTrail: (trailId: string) => void
  clearCurrentTrail: () => void
  // Folgezettel branching support
  currentNodeId: string | null
  setCurrentNodeId: (nodeId: string | null) => void
  addBranch: (key: ChunkKey, reason?: string) => string | null
  getTrailTree: () => TrailNode | null
  flattenTrail: () => TrailStep[]
}

/**
 * Generate a unique ID for trail nodes
 */
function generateNodeId(): string {
  return crypto.randomUUID()
}

/**
 * Generate branch label based on sibling count
 * First branch: 1a, second: 1b, etc.
 */
function generateBranchLabel(parentLabel: string | undefined, siblingIndex: number): string {
  const base = parentLabel || '1'
  const suffix = String.fromCharCode(97 + siblingIndex) // 'a', 'b', 'c', ...
  return `${base}${suffix}`
}

/**
 * Build a tree from linear steps (for backwards compatibility)
 */
function stepsToTree(steps: TrailStep[]): TrailNode | null {
  if (steps.length === 0) return null

  const firstStep = steps[0]
  if (!firstStep) return null

  const root: TrailNode = {
    id: generateNodeId(),
    chunkKey: firstStep.chunkKey,
    visitedAt: firstStep.visitedAt,
    connectionReason: firstStep.connectionReason,
    branchLabel: '1',
    children: [],
  }

  let current = root
  for (let i = 1; i < steps.length; i++) {
    const step = steps[i]
    if (!step) continue

    const node: TrailNode = {
      id: generateNodeId(),
      chunkKey: step.chunkKey,
      visitedAt: step.visitedAt,
      connectionReason: step.connectionReason,
      branchLabel: String(i + 1),
      children: [],
    }
    current.children.push(node)
    current = node
  }

  return root
}

/**
 * Flatten a tree back to linear steps (depth-first)
 */
function treeToSteps(node: TrailNode | null, steps: TrailStep[] = []): TrailStep[] {
  if (!node) return steps

  steps.push({
    chunkKey: node.chunkKey,
    visitedAt: node.visitedAt,
    connectionReason: node.connectionReason,
  })

  // Follow first child (main branch)
  if (node.children.length > 0) {
    treeToSteps(node.children[0] || null, steps)
  }

  return steps
}

/**
 * Find a node by ID in the tree
 */
function findNodeById(node: TrailNode | null, nodeId: string): TrailNode | null {
  if (!node) return null
  if (node.id === nodeId) return node

  for (const child of node.children) {
    const found = findNodeById(child, nodeId)
    if (found) return found
  }

  return null
}

/**
 * Hook for managing exploration trails with Folgezettel branching
 * Records navigation steps and allows saving/loading trails
 */
export function useTrail(): UseTrailResult {
  const links = useLinks()
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)

  const addStep = useCallback(
    (key: ChunkKey, reason?: string) => {
      links.addToTrail(key, reason)
    },
    [links]
  )

  /**
   * Get the trail as a tree structure
   */
  const getTrailTree = useCallback((): TrailNode | null => {
    if (!links.currentTrail) return null

    // If trail has a root, use it
    if (links.currentTrail.root) {
      return links.currentTrail.root
    }

    // Otherwise convert linear steps to tree
    return stepsToTree(links.currentTrail.steps)
  }, [links.currentTrail])

  /**
   * Flatten the trail tree to linear steps
   */
  const flattenTrail = useCallback((): TrailStep[] => {
    return treeToSteps(getTrailTree())
  }, [getTrailTree])

  /**
   * Add a branch from the current node (Folgezettel)
   * Returns the new node ID, or null if failed
   */
  const addBranch = useCallback(
    (key: ChunkKey, reason?: string): string | null => {
      if (!links.currentTrail) return null

      const tree = getTrailTree()
      if (!tree) return null

      // Find the node to branch from
      const targetId = currentNodeId || tree.id
      const parentNode = findNodeById(tree, targetId)
      if (!parentNode) return null

      // Create new branch node
      const newNode: TrailNode = {
        id: generateNodeId(),
        chunkKey: key,
        visitedAt: new Date().toISOString(),
        connectionReason: reason,
        branchLabel: generateBranchLabel(parentNode.branchLabel, parentNode.children.length),
        children: [],
      }

      // Add to parent's children
      parentNode.children.push(newNode)

      // Update the current node to the new branch
      setCurrentNodeId(newNode.id)

      return newNode.id
    },
    [links.currentTrail, currentNodeId, getTrailTree]
  )

  const stepCount = useMemo(() => {
    if (!links.currentTrail) return 0
    // Count all nodes in tree if present
    const tree = getTrailTree()
    if (!tree) return links.currentTrail.steps.length

    let count = 0
    const countNodes = (node: TrailNode) => {
      count++
      node.children.forEach(countNodes)
    }
    countNodes(tree)
    return count
  }, [links.currentTrail, getTrailTree])

  return {
    currentTrail: links.currentTrail,
    savedTrails: links.trails,
    isRecording: links.currentTrail !== null,
    stepCount,
    startNewTrail: links.startNewTrail,
    addStep,
    saveTrail: links.saveTrail,
    loadTrail: links.loadTrail,
    deleteTrail: links.deleteTrail,
    clearCurrentTrail: links.clearCurrentTrail,
    // Folgezettel branching
    currentNodeId,
    setCurrentNodeId,
    addBranch,
    getTrailTree,
    flattenTrail,
  }
}
