import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import type { Annotation, Highlight } from '../../contexts/AnnotationsContext'
import type { PinnedLink } from '../../contexts/LinksContext'
import { downloadFile, exportDocument, type ExportOptions } from '../../utils/exportAnnotations'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  documentData: {
    filePath: string
    title: string
    chunks: Array<{ chunkIndex: number; text: string }>
    highlights: Highlight[]
    annotations: Annotation[]
    pins: PinnedLink[]
    backlinks: PinnedLink[]
  } | null
}

type ExportFormat = 'markdown' | 'json' | 'html'

/**
 * Dialog for exporting document with annotations
 */
export function ExportDialog({ isOpen, onClose, documentData }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('markdown')
  const [includeAnnotations, setIncludeAnnotations] = useState(true)
  const [includePins, setIncludePins] = useState(true)
  const [includeProvenance, setIncludeProvenance] = useState(true)

  const handleExport = useCallback(() => {
    if (!documentData) return

    const options: ExportOptions = {
      format,
      includeAnnotations,
      includePins,
      includeProvenance,
    }

    const { content, filename, mimeType } = exportDocument(documentData, options)
    downloadFile(content, filename, mimeType)
    onClose()
  }, [documentData, format, includeAnnotations, includePins, includeProvenance, onClose])

  if (!documentData) return null

  const hasAnnotations = documentData.highlights.length > 0
  const hasPins = documentData.pins.length > 0 || documentData.backlinks.length > 0

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <ExportIcon className="w-5 h-5 text-blue-500" />
                Export Document
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Document Info */}
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {documentData.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {documentData.chunks.length} chunks
                {hasAnnotations && ` • ${documentData.highlights.length} highlights`}
                {hasPins && ` • ${documentData.pins.length + documentData.backlinks.length} links`}
              </p>
            </div>

            {/* Format Selection */}
            <div className="mb-4">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Export Format
              </span>
              <div className="flex gap-2" role="group" aria-label="Export format">
                {(['markdown', 'json', 'html'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      format === f
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {f === 'markdown' ? 'Markdown' : f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="mb-6 space-y-3">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Include
              </span>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAnnotations}
                  onChange={(e) => setIncludeAnnotations(e.target.checked)}
                  disabled={!hasAnnotations}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span
                  className={`text-sm ${!hasAnnotations ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  Highlights & annotations
                  {hasAnnotations && (
                    <span className="text-gray-400 ml-1">({documentData.highlights.length})</span>
                  )}
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePins}
                  onChange={(e) => setIncludePins(e.target.checked)}
                  disabled={!hasPins}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span
                  className={`text-sm ${!hasPins ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  Pins & backlinks
                  {hasPins && (
                    <span className="text-gray-400 ml-1">
                      ({documentData.pins.length + documentData.backlinks.length})
                    </span>
                  )}
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeProvenance}
                  onChange={(e) => setIncludeProvenance(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Chunk anchors
                  <span className="text-gray-400 ml-1">(file::chunk references)</span>
                </span>
              </label>
            </div>

            {/* Format hints */}
            <div className="mb-6 text-xs text-gray-500 dark:text-gray-400">
              {format === 'markdown' && <p>Highlights will be marked with ==text== syntax.</p>}
              {format === 'json' && <p>Full structured data with all metadata.</p>}
              {format === 'html' && <p>Styled document with &lt;mark&gt; highlights.</p>}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Export
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Icons
function ExportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
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
