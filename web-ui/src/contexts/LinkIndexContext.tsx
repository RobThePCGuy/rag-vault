import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLinkIndex } from '../hooks/useLinkIndex'
import type { LinkEdge, LinkIndex } from '../utils/link-index-builder'

// --------------------------------------------
// Context value
// --------------------------------------------

interface LinkIndexContextValue {
  index: LinkIndex | null
  isScanning: boolean
  rescan: () => Promise<void>
  /** Get all outgoing wiki-links from a document */
  getOutgoingLinks: (filePath: string) => LinkEdge[]
  /** Get all incoming backlinks that reference a doc title */
  getIncomingLinks: (docTitle: string) => LinkEdge[]
  /** Check whether a referenced docTitle matches an actual ingested file */
  isResolved: (docTitle: string) => boolean
}

const LinkIndexContext = createContext<LinkIndexContextValue | null>(null)

// --------------------------------------------
// Provider
// --------------------------------------------

interface LinkIndexProviderProps {
  children: ReactNode
}

export function LinkIndexProvider({ children }: LinkIndexProviderProps) {
  const { index, isScanning, rescan } = useLinkIndex()
  const queryClient = useQueryClient()

  // Auto-scan on mount
  useEffect(() => {
    void rescan()
  }, [rescan])

  // Re-scan when the files query is invalidated (new file ingested, file deleted, etc.)
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === 'updated' &&
        event.query.queryKey[0] === 'files' &&
        event.action.type === 'success'
      ) {
        void rescan()
      }
    })
    return unsubscribe
  }, [queryClient, rescan])

  // Derive a set of known file names (without extension, lowercased) for resolution checks
  const knownFileNames = useMemo(() => {
    if (!index) return new Set<string>()

    const names = new Set<string>()
    // Build from the documents that were scanned (their filePaths are in outgoing keys
    // plus any docs with zero outgoing links - use totalDocuments hint but we don't
    // have the full list here; however the outgoing + incoming source docs cover them)
    const allPaths = new Set<string>()
    if (index.outgoing) {
      for (const fp of Object.keys(index.outgoing)) {
        allPaths.add(fp)
      }
    }
    if (index.incoming) {
      for (const edges of Object.values(index.incoming)) {
        for (const edge of edges) {
          allPaths.add(edge.sourceDoc)
        }
      }
    }

    for (const fp of allPaths) {
      // Extract filename without path and extension
      const segments = fp.split('/')
      const fileName = segments[segments.length - 1] ?? fp
      const baseName = fileName.replace(/\.[^.]+$/, '')
      names.add(baseName.toLowerCase())
      // Also store the full fileName (without extension) to catch case-insensitive matches
      names.add(fileName.toLowerCase())
    }
    return names
  }, [index])

  const getOutgoingLinks = useCallback(
    (filePath: string): LinkEdge[] => {
      if (!index) return []
      return index.outgoing[filePath] ?? []
    },
    [index]
  )

  const getIncomingLinks = useCallback(
    (docTitle: string): LinkEdge[] => {
      if (!index) return []
      return index.incoming[docTitle] ?? []
    },
    [index]
  )

  const isResolved = useCallback(
    (docTitle: string): boolean => {
      return knownFileNames.has(docTitle.toLowerCase())
    },
    [knownFileNames]
  )

  const value = useMemo<LinkIndexContextValue>(
    () => ({
      index,
      isScanning,
      rescan,
      getOutgoingLinks,
      getIncomingLinks,
      isResolved,
    }),
    [index, isScanning, rescan, getOutgoingLinks, getIncomingLinks, isResolved]
  )

  return <LinkIndexContext.Provider value={value}>{children}</LinkIndexContext.Provider>
}

// --------------------------------------------
// Hook
// --------------------------------------------

export function useLinkIndexContext(): LinkIndexContextValue {
  const context = useContext(LinkIndexContext)
  if (!context) {
    throw new Error('useLinkIndexContext must be used within a LinkIndexProvider')
  }
  return context
}
