import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SearchResult } from '../../api/client'
import { EmptyState } from '../ui'
import { DocumentPreview } from './DocumentPreview'

interface SearchResultsProps {
  results: SearchResult[]
  hasSearched: boolean
}

export function SearchResults({ results, hasSearched }: SearchResultsProps) {
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
  const navigate = useNavigate()

  const handleRead = (result: SearchResult) => {
    const params = new URLSearchParams({ path: result.filePath })
    params.set('chunk', String(result.chunkIndex))
    navigate(`/read?${params.toString()}`)
  }

  if (!hasSearched) {
    return null
  }

  if (results.length === 0) {
    return (
      <EmptyState
        icon={<SearchIcon />}
        title="No results found"
        description="Try different keywords or a broader query."
      />
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium" style={{ color: 'var(--ws-text)' }}>
        Results ({results.length})
      </h2>
      <div className="space-y-3">
        {results.map((result, index) => (
          <ResultCard
            key={`${result.filePath}-${result.chunkIndex}`}
            result={result}
            rank={index + 1}
            onView={() => setSelectedResult(result)}
            onRead={() => handleRead(result)}
          />
        ))}
      </div>

      {selectedResult && (
        <DocumentPreview
          result={selectedResult}
          isOpen={true}
          onClose={() => setSelectedResult(null)}
        />
      )}
    </div>
  )
}

interface ResultCardProps {
  result: SearchResult
  rank: number
  onView: () => void
  onRead: () => void
}

function ResultCard({ result, rank, onView, onRead }: ResultCardProps) {
  const displaySource = result.source || result.filePath
  const scoreColor = getScoreColor(result.score)

  return (
    <div className="ws-surface p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--ws-text-faint)' }}>
            #{rank}
          </span>
          <h3
            className="font-medium truncate"
            style={{ color: 'var(--ws-text)' }}
            title={displaySource}
          >
            {formatSource(displaySource)}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${scoreColor}`}
            title={`Distance score: ${result.score.toFixed(4)}`}
          >
            {formatScore(result.score)}
          </span>
          <button
            type="button"
            onClick={onRead}
            className="px-2 py-1 text-xs font-medium rounded transition-colors"
            style={{ color: 'var(--ws-success)' }}
          >
            Read
          </button>
          <button
            type="button"
            onClick={onView}
            className="px-2 py-1 text-xs font-medium rounded transition-colors"
            style={{ color: 'var(--ws-accent)' }}
          >
            View
          </button>
        </div>
      </div>

      <p
        className="text-sm whitespace-pre-wrap line-clamp-4"
        style={{ color: 'var(--ws-text-secondary)' }}
      >
        {result.text}
      </p>

      <div
        className="mt-2 flex items-center gap-3 text-xs"
        style={{ color: 'var(--ws-text-faint)' }}
      >
        <span>Chunk #{result.chunkIndex}</span>
        {result.source && (
          <span className="truncate" title={result.filePath}>
            {result.filePath.split('/').pop()}
          </span>
        )}
      </div>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  )
}

function formatSource(source: string): string {
  // For file paths, show just the filename
  if (source.startsWith('/') || source.includes('\\')) {
    return source.split(/[/\\]/).pop() || source
  }
  // For URLs, show shortened version
  if (source.startsWith('http')) {
    try {
      const url = new URL(source)
      return url.hostname + url.pathname.slice(0, 30) + (url.pathname.length > 30 ? '...' : '')
    } catch {
      return `${source.slice(0, 40)}...`
    }
  }
  return source
}

function formatScore(score: number): string {
  // Lower score = better match (distance metric)
  if (score < 0.3) return 'Excellent'
  if (score < 0.5) return 'Good'
  if (score < 0.7) return 'Fair'
  return 'Low'
}

function getScoreColor(score: number): string {
  if (score < 0.3) return 'bg-green-100 text-green-800'
  if (score < 0.5) return 'bg-blue-100 text-blue-800'
  if (score < 0.7) return 'bg-yellow-100 text-yellow-800'
  return 'bg-gray-100 text-gray-800'
}
