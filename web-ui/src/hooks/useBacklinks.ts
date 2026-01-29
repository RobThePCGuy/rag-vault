import { useMemo } from 'react'
import { useLinks, type PinnedLink } from '../contexts/LinksContext'

export interface UseBacklinksResult {
  backlinks: PinnedLink[]
  hasBacklinks: boolean
  backlinkCount: number
}

/**
 * Hook for getting backlinks to a specific chunk
 * Shows "what links here" for a given chunk
 */
export function useBacklinks(filePath: string | null, chunkIndex: number | null): UseBacklinksResult {
  const links = useLinks()

  const backlinks = useMemo(() => {
    if (!filePath || chunkIndex === null) {
      return []
    }
    return links.getBacklinks({ filePath, chunkIndex })
  }, [links, filePath, chunkIndex])

  return {
    backlinks,
    hasBacklinks: backlinks.length > 0,
    backlinkCount: backlinks.length,
  }
}
