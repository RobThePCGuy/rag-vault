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
    <div className="ws-page max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="ws-page-title text-2xl font-bold mb-2">Upload Content</h1>
        <p style={{ color: 'var(--ws-text-secondary)' }}>
          Add documents to your knowledge base for semantic search.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--ws-border)' }}>
        <nav className="-mb-px flex gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className="py-3 px-1 border-b-2 font-medium text-sm transition-colors"
            style={
              activeTab === 'file'
                ? { borderColor: 'var(--ws-accent)', color: 'var(--ws-accent)' }
                : { borderColor: 'transparent', color: 'var(--ws-text-muted)' }
            }
          >
            Upload Files
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className="py-3 px-1 border-b-2 font-medium text-sm transition-colors"
            style={
              activeTab === 'content'
                ? { borderColor: 'var(--ws-accent)', color: 'var(--ws-accent)' }
                : { borderColor: 'transparent', color: 'var(--ws-text-muted)' }
            }
          >
            Paste Content
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="ws-surface p-6">
        {activeTab === 'file' ? (
          <DropZone onFilesSelect={handleFilesSelect} isUploading={isProcessingQueue} />
        ) : (
          <ContentPaste onIngest={handleIngest} isIngesting={isIngesting} />
        )}
      </div>

      {/* File upload queue */}
      {uploadQueue.length > 0 && (
        <div className="ws-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium" style={{ color: 'var(--ws-text)' }}>
              Upload Progress ({successCount}/{uploadQueue.length})
            </h3>
            {!isProcessingQueue && (
              <button
                type="button"
                onClick={clearQueue}
                className="text-sm"
                style={{ color: 'var(--ws-text-muted)' }}
              >
                Clear
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {uploadQueue.map((item, idx) => (
              <div
                key={`${item.file.name}-${idx}`}
                className="flex items-center gap-3 p-2 rounded-lg"
                style={{ background: 'var(--ws-surface-1)' }}
              >
                <div className="flex-shrink-0">
                  {item.status === 'pending' && (
                    <div
                      className="w-5 h-5 rounded-full border-2"
                      style={{ borderColor: 'var(--ws-border-strong)' }}
                    />
                  )}
                  {item.status === 'uploading' && (
                    <span style={{ color: 'var(--ws-accent)' }}>
                      <Spinner className="w-5 h-5" />
                    </span>
                  )}
                  {item.status === 'success' && (
                    <CheckIcon className="w-5 h-5" style={{ color: 'var(--ws-success)' }} />
                  )}
                  {item.status === 'error' && (
                    <ErrorIcon className="w-5 h-5" style={{ color: 'var(--ws-danger)' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--ws-text)' }}>
                    {item.file.name}
                  </p>
                  {item.status === 'success' && item.chunkCount && (
                    <p className="text-xs" style={{ color: 'var(--ws-text-muted)' }}>
                      {item.chunkCount} chunks created
                    </p>
                  )}
                  {item.status === 'error' && item.error && (
                    <p className="text-xs" style={{ color: 'var(--ws-danger)' }}>
                      {item.error}
                    </p>
                  )}
                </div>
                <div className="text-xs" style={{ color: 'var(--ws-text-faint)' }}>
                  {(item.file.size / 1024).toFixed(0)} KB
                </div>
              </div>
            ))}
          </div>
          {/* Summary when done */}
          {!isProcessingQueue && uploadQueue.length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--ws-border)' }}>
              <p className="text-sm" style={{ color: 'var(--ws-text-secondary)' }}>
                {successCount > 0 && (
                  <span style={{ color: 'var(--ws-success)' }}>
                    {successCount} file{successCount !== 1 ? 's' : ''} uploaded ({totalChunks}{' '}
                    chunks)
                  </span>
                )}
                {successCount > 0 && errorCount > 0 && ' \u2022 '}
                {errorCount > 0 && (
                  <span style={{ color: 'var(--ws-danger)' }}>{errorCount} failed</span>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Processing indicator for content paste */}
      {isIngesting && (
        <div className="ws-info-box rounded-lg flex items-center gap-3">
          <span style={{ color: 'var(--ws-info)' }}>
            <Spinner />
          </span>
          <span style={{ color: 'var(--ws-info)' }}>Processing content...</span>
        </div>
      )}

      {/* Error message for content paste */}
      {ingestError && (
        <div className="ws-error-box rounded-lg">
          <p className="font-medium">Error</p>
          <p className="text-sm">{ingestError.message}</p>
        </div>
      )}

      {/* Success message for content paste */}
      {ingestResult && !isProcessing && (
        <div className="ws-success-box rounded-lg">
          <p className="font-medium">Content Ingested Successfully</p>
          <div className="text-sm mt-1 space-y-1">
            <p>Chunks created: {ingestResult.chunkCount}</p>
            <p className="truncate" style={{ color: 'var(--ws-text-muted)' }}>
              {ingestResult.filePath}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function CheckIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ErrorIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
