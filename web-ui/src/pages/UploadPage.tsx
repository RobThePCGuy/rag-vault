import { useCallback, useState } from 'react'
import { ContentPaste, DropZone } from '../components/Upload'
import { Spinner } from '../components/ui'
import { useUpload } from '../hooks'

type TabType = 'file' | 'content'

interface FileUploadStatus {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  chunkCount?: number
}

export function UploadPage() {
  const [activeTab, setActiveTab] = useState<TabType>('file')
  const [uploadQueue, setUploadQueue] = useState<FileUploadStatus[]>([])
  const [isProcessingQueue, setIsProcessingQueue] = useState(false)
  const { uploadFile, ingestData, isIngesting, ingestError, ingestResult, reset } = useUpload()

  const processQueue = useCallback(
    async (files: File[]) => {
      const queue: FileUploadStatus[] = files.map((file) => ({
        file,
        status: 'pending' as const,
      }))
      setUploadQueue(queue)
      setIsProcessingQueue(true)

      for (let i = 0; i < queue.length; i++) {
        const currentFile = queue[i]
        if (!currentFile) continue

        setUploadQueue((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, status: 'uploading' } : item))
        )

        await new Promise<void>((resolve) => {
          uploadFile(currentFile.file, {
            onSuccess: (result) => {
              setUploadQueue((prev) =>
                prev.map((item, idx) =>
                  idx === i ? { ...item, status: 'success', chunkCount: result.chunkCount } : item
                )
              )
              resolve()
            },
            onError: (error) => {
              setUploadQueue((prev) =>
                prev.map((item, idx) =>
                  idx === i ? { ...item, status: 'error', error: error.message } : item
                )
              )
              resolve() // Continue with next file even on error
            },
          })
        })
      }

      setIsProcessingQueue(false)
    },
    [uploadFile]
  )

  const handleFilesSelect = (files: File[]) => {
    reset()
    setUploadQueue([])
    processQueue(files)
  }

  const handleIngest = (content: string, source: string, format: 'text' | 'html' | 'markdown') => {
    reset()
    setUploadQueue([])
    ingestData({ content, source, format })
  }

  const clearQueue = () => {
    setUploadQueue([])
  }

  const successCount = uploadQueue.filter((f) => f.status === 'success').length
  const errorCount = uploadQueue.filter((f) => f.status === 'error').length
  const totalChunks = uploadQueue.reduce((sum, f) => sum + (f.chunkCount || 0), 0)
  const isProcessing = isProcessingQueue || isIngesting

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Upload Content</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Add documents to your knowledge base for semantic search.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'file'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Upload Files
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'content'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Paste Content
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {activeTab === 'file' ? (
          <DropZone onFilesSelect={handleFilesSelect} isUploading={isProcessingQueue} />
        ) : (
          <ContentPaste onIngest={handleIngest} isIngesting={isIngesting} />
        )}
      </div>

      {/* File upload queue */}
      {uploadQueue.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Upload Progress ({successCount}/{uploadQueue.length})
            </h3>
            {!isProcessingQueue && (
              <button
                type="button"
                onClick={clearQueue}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Clear
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {uploadQueue.map((item, idx) => (
              <div
                key={`${item.file.name}-${idx}`}
                className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-900"
              >
                <div className="flex-shrink-0">
                  {item.status === 'pending' && (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                  )}
                  {item.status === 'uploading' && <Spinner className="w-5 h-5 text-blue-600" />}
                  {item.status === 'success' && <CheckIcon className="w-5 h-5 text-green-600" />}
                  {item.status === 'error' && <ErrorIcon className="w-5 h-5 text-red-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.file.name}
                  </p>
                  {item.status === 'success' && item.chunkCount && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.chunkCount} chunks created
                    </p>
                  )}
                  {item.status === 'error' && item.error && (
                    <p className="text-xs text-red-600 dark:text-red-400">{item.error}</p>
                  )}
                </div>
                <div className="text-xs text-gray-400">{(item.file.size / 1024).toFixed(0)} KB</div>
              </div>
            ))}
          </div>
          {/* Summary when done */}
          {!isProcessingQueue && uploadQueue.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {successCount > 0 && (
                  <span className="text-green-600 dark:text-green-400">
                    {successCount} file{successCount !== 1 ? 's' : ''} uploaded ({totalChunks}{' '}
                    chunks)
                  </span>
                )}
                {successCount > 0 && errorCount > 0 && ' • '}
                {errorCount > 0 && (
                  <span className="text-red-600 dark:text-red-400">{errorCount} failed</span>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Processing indicator for content paste */}
      {isIngesting && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center gap-3">
          <Spinner className="text-blue-600" />
          <span className="text-blue-700 dark:text-blue-300">Processing content...</span>
        </div>
      )}

      {/* Error message for content paste */}
      {ingestError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
          <p className="font-medium">Error</p>
          <p className="text-sm">{ingestError.message}</p>
        </div>
      )}

      {/* Success message for content paste */}
      {ingestResult && !isProcessing && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-green-700 dark:text-green-300">
          <p className="font-medium">Content Ingested Successfully</p>
          <div className="text-sm mt-1 space-y-1">
            <p>Chunks created: {ingestResult.chunkCount}</p>
            <p className="text-gray-500 dark:text-gray-400 truncate">{ingestResult.filePath}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
