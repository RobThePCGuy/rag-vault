import { type FormEvent, useState } from 'react'

interface SearchBoxProps {
  onSearch: (query: string, limit?: number) => void
  isLoading: boolean
}

export function SearchBox({ onSearch, isLoading }: SearchBoxProps) {
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(10)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim(), limit)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="query"
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--ws-text-secondary)' }}
        >
          Search Query
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your search query..."
            className="ws-input flex-1 px-4 py-2"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="ws-button px-6 py-2 font-medium rounded-lg transition-colors"
            data-variant="primary"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label htmlFor="limit" className="text-sm" style={{ color: 'var(--ws-text-secondary)' }}>
          Results limit:
        </label>
        <select
          id="limit"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="ws-select px-3 py-1.5 text-sm"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>
    </form>
  )
}
