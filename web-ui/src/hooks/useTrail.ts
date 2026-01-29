import { useCallback } from 'react'
import { useLinks, type ChunkKey, type Trail } from '../contexts/LinksContext'

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
}

/**
 * Hook for managing exploration trails
 * Records navigation steps and allows saving/loading trails
 */
export function useTrail(): UseTrailResult {
  const links = useLinks()

  const addStep = useCallback(
    (key: ChunkKey, reason?: string) => {
      links.addToTrail(key, reason)
    },
    [links]
  )

  return {
    currentTrail: links.currentTrail,
    savedTrails: links.trails,
    isRecording: links.currentTrail !== null,
    stepCount: links.currentTrail?.steps.length ?? 0,
    startNewTrail: links.startNewTrail,
    addStep,
    saveTrail: links.saveTrail,
    loadTrail: links.loadTrail,
    deleteTrail: links.deleteTrail,
    clearCurrentTrail: links.clearCurrentTrail,
  }
}
