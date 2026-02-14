import { SearchBox, SearchResults } from '../components/Search'
import { useSearch } from '../hooks'

export function SearchPage() {
  const { results, search, isLoading, error, hasSearched } = useSearch()

  return (
    <div className="ws-page max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="ws-page-title text-2xl font-bold mb-2">Search Documents</h1>
        <p style={{ color: 'var(--ws-text-secondary)' }}>
          Search through your ingested documents using semantic and keyword matching.
        </p>
      </div>

      <div className="ws-surface p-6">
        <SearchBox onSearch={search} isLoading={isLoading} />
      </div>

      {error && (
        <div className="ws-error-box rounded-lg">
          <p className="font-medium">Search Error</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {!isLoading && !hasSearched && !error && (
        <div className="text-center py-12" style={{ color: 'var(--ws-text-muted)' }}>
          <p>Enter a search query to find relevant documents.</p>
        </div>
      )}

      <SearchResults results={results} hasSearched={hasSearched && !isLoading} />
    </div>
  )
}
