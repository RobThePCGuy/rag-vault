import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import type { GraphData, GraphNode } from './types'
import {
  downloadGraphJSON,
  downloadGraphSVG,
  downloadGraphPNG,
  type GraphExportFormat,
} from '../../utils/graphExport'

// ============================================
// Types
// ============================================

interface GraphExportMenuProps {
  isOpen: boolean
  onClose: () => void
  graphData: GraphData
  nodes: GraphNode[]
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}

// ============================================
// Component
// ============================================

/**
 * Dropdown menu for exporting knowledge graph in various formats
 */
export function GraphExportMenu({
  isOpen,
  onClose,
  graphData,
  nodes,
  canvasRef,
}: GraphExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [includePositions, setIncludePositions] = useState(true)

  const handleExport = async (format: GraphExportFormat) => {
    setIsExporting(true)

    try {
      const timestamp = new Date().toISOString().slice(0, 10)
      const baseFilename = `knowledge-graph-${timestamp}`

      switch (format) {
        case 'json':
          downloadGraphJSON(graphData, nodes, `${baseFilename}.json`, { includePositions })
          break
        case 'svg':
          downloadGraphSVG(graphData, nodes, `${baseFilename}.svg`)
          break
        case 'png':
          if (canvasRef.current) {
            await downloadGraphPNG(canvasRef.current, `${baseFilename}.png`)
          }
          break
      }

      onClose()
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={onClose}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
            role="button"
            tabIndex={0}
            aria-label="Close menu"
          />

          {/* Menu */}
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg shadow-lg overflow-hidden"
            style={{
              background: 'var(--ws-surface-raised)',
              borderColor: 'var(--ws-border)',
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
          >
            {/* Header */}
            <div
              className="px-3 py-2"
              style={{
                borderBottom: '1px solid var(--ws-border)',
                background: 'var(--ws-surface-1)',
              }}
            >
              <h4 className="text-sm font-medium" style={{ color: 'var(--ws-text-secondary)' }}>
                Export Graph
              </h4>
            </div>

            {/* Options */}
            <div className="p-2">
              {/* Include positions toggle (for JSON) */}
              <label
                className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer"
                style={{ color: 'var(--ws-text-secondary)' }}
              >
                <input
                  type="checkbox"
                  checked={includePositions}
                  onChange={(e) => setIncludePositions(e.target.checked)}
                  className="rounded"
                  style={{ borderColor: 'var(--ws-border)', accentColor: 'var(--ws-accent)' }}
                />
                Include node positions
              </label>
            </div>

            {/* Export buttons */}
            <div className="p-2" style={{ borderTop: '1px solid var(--ws-border)' }}>
              <ExportButton
                icon={<JSONIcon className="w-4 h-4" />}
                label="Export as JSON"
                description="Graph data with edges & positions"
                onClick={() => handleExport('json')}
                disabled={isExporting}
              />
              <ExportButton
                icon={<SVGIcon className="w-4 h-4" />}
                label="Export as SVG"
                description="Vector graphic for editing"
                onClick={() => handleExport('svg')}
                disabled={isExporting}
              />
              <ExportButton
                icon={<PNGIcon className="w-4 h-4" />}
                label="Export as PNG"
                description="Current view as image"
                onClick={() => handleExport('png')}
                disabled={isExporting || !canvasRef.current}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ============================================
// Export Button
// ============================================

interface ExportButtonProps {
  icon: React.ReactNode
  label: string
  description: string
  onClick: () => void
  disabled?: boolean
}

function ExportButton({ icon, label, description, onClick, disabled }: ExportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-start gap-3 px-2 py-2 rounded-lg text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="mt-0.5" style={{ color: 'var(--ws-text-muted)' }}>
        {icon}
      </span>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--ws-text-secondary)' }}>
          {label}
        </p>
        <p className="text-xs" style={{ color: 'var(--ws-text-muted)' }}>
          {description}
        </p>
      </div>
    </button>
  )
}

// ============================================
// Icons
// ============================================

function JSONIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h7"
      />
    </svg>
  )
}

function SVGIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
      />
    </svg>
  )
}

function PNGIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )
}
