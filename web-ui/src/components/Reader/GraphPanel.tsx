import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import type { RelatedChunk } from '../../api/client'
import type { PinnedLink } from '../../contexts/LinksContext'
import { KnowledgeGraph } from '../Graph'
import { useGraphData } from '../../hooks/useGraphData'

interface GraphPanelProps {
  isOpen: boolean
  onToggle: () => void
  filePath: string
  activeChunkIndex: number | null
  relatedChunks: RelatedChunk[]
  pins: PinnedLink[]
  onNavigateToChunk: (filePath: string, chunkIndex: number) => void
}

/**
 * Collapsible graph panel at bottom of reader
 * Shows knowledge graph visualization of related content
 */
export function GraphPanel({
  isOpen,
  onToggle,
  filePath,
  activeChunkIndex,
  relatedChunks,
  pins,
  onNavigateToChunk,
}: GraphPanelProps) {
  // Build graph data
  const { graphData, currentNodeId } = useGraphData({
    filePath,
    activeChunkIndex,
    relatedChunks,
    pins,
  })

  // Build set of pinned node IDs
  const pinnedNodeIds = useMemo(() => {
    const ids = new Set<string>()
    for (const pin of pins) {
      ids.add(`${pin.sourceKey.filePath}:${pin.sourceKey.chunkIndex}`)
      ids.add(`${pin.targetKey.filePath}:${pin.targetKey.chunkIndex}`)
    }
    return ids
  }, [pins])

  const handleNodeClick = (node: { filePath: string; chunkIndex: number }) => {
    onNavigateToChunk(node.filePath, node.chunkIndex)
  }

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title={isOpen ? 'Hide knowledge graph' : 'Show knowledge graph'}
      >
        <GraphIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Graph</span>
        {graphData.nodes.length > 0 && (
          <span className="text-xs text-gray-400">({graphData.nodes.length})</span>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 300, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 z-30 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Knowledge Graph
                  {activeChunkIndex !== null && (
                    <span className="ml-2 text-gray-500 dark:text-gray-400">
                      (centered on #{activeChunkIndex})
                    </span>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={onToggle}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Graph */}
              <div className="flex-1 p-2">
                {graphData.nodes.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <GraphIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No graph data available</p>
                      <p className="text-xs mt-1">Scroll through the document to load related content</p>
                    </div>
                  </div>
                ) : (
                  <KnowledgeGraph
                    graphData={graphData}
                    currentNodeId={currentNodeId}
                    pinnedNodeIds={pinnedNodeIds}
                    onNodeClick={handleNodeClick}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function GraphIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
