import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface DropZoneProps {
  onFilesSelect: (files: File[]) => void
  isUploading: boolean
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'text/html': ['.html'],
  'application/json': ['.json', '.jsonl'],
  'application/x-ndjson': ['.ndjson'],
  'application/ndjson': ['.ndjson'],
  'application/jsonl': ['.jsonl'],
}

export function DropZone({ onFilesSelect, isUploading }: DropZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFilesSelect(acceptedFiles)
      }
    },
    [onFilesSelect]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
    disabled: isUploading,
    maxSize: 100 * 1024 * 1024, // 100MB
  })

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      style={
        isDragActive
          ? { borderColor: 'var(--ws-accent)', background: 'var(--ws-accent-subtle)' }
          : { borderColor: 'var(--ws-border)' }
      }
    >
      <input {...getInputProps()} />
      <UploadIcon className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--ws-text-muted)' }} />
      {isDragActive ? (
        <p className="font-medium" style={{ color: 'var(--ws-accent)' }}>
          Drop files here...
        </p>
      ) : (
        <>
          <p className="font-medium mb-1" style={{ color: 'var(--ws-text-secondary)' }}>
            Drag and drop files here, or click to select
          </p>
          <p className="text-sm" style={{ color: 'var(--ws-text-muted)' }}>
            Supports PDF, DOCX, TXT, MD, HTML, JSON, JSONL, NDJSON (max 100MB each)
          </p>
        </>
      )}
    </div>
  )
}

function UploadIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  )
}
