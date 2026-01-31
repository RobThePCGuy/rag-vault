import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import type { Trail } from '../../contexts/LinksContext'
import { copyToClipboard, generateTrailUrl } from '../../utils/shareTrail'

interface ShareTrailDialogProps {
  isOpen: boolean
  onClose: () => void
  trail: Trail | null
  vaultId: string
}

/**
 * Dialog for sharing a trail via URL
 */
export function ShareTrailDialog({ isOpen, onClose, trail, vaultId }: ShareTrailDialogProps) {
  const [shareUrl, setShareUrl] = useState('')
  const [isTooLarge, setIsTooLarge] = useState(false)
  const [copied, setCopied] = useState(false)

  // Generate URL when dialog opens
  useEffect(() => {
    if (isOpen && trail) {
      const { url, tooLarge } = generateTrailUrl(trail, vaultId)
      setShareUrl(url)
      setIsTooLarge(tooLarge)
      setCopied(false)
    }
  }, [isOpen, trail, vaultId])

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return

    const success = await copyToClipboard(shareUrl)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [shareUrl])

  if (!trail) return null

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
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <ShareIcon className="w-5 h-5 text-blue-500" />
                Share Trail
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Trail Info */}
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-750 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                {trail.name || 'Untitled Trail'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {trail.steps.length} step{trail.steps.length !== 1 ? 's' : ''}
              </p>
            </div>

            {isTooLarge ? (
              // Trail too large warning
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <WarningIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                      Trail too large for URL
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      This trail has too many steps to share via URL. Consider exporting it as JSON
                      instead.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Share URL
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="share-link-input"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Share Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="share-link-input"
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        copied
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Anyone with this link can import the trail into their vault. The link does not
                  contain document content, only file paths and chunk numbers.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Icons
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
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

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  )
}
