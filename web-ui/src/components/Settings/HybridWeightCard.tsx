import { useCallback, useEffect, useState } from 'react'
import { useHybridWeight, useSetHybridWeight } from '../../hooks'
import { Spinner } from '../ui'

export function HybridWeightCard() {
  const { weight, isLoading: isFetching } = useHybridWeight()
  const { setWeight, isLoading: isSetting } = useSetHybridWeight()

  const [localWeight, setLocalWeight] = useState(weight)
  const [isDirty, setIsDirty] = useState(false)

  // Sync local state when server value changes (and not dirty)
  useEffect(() => {
    if (!isDirty) {
      setLocalWeight(weight)
    }
  }, [weight, isDirty])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    setLocalWeight(newValue)
    setIsDirty(true)
  }, [])

  const handleApply = useCallback(() => {
    setWeight(localWeight)
    setIsDirty(false)
  }, [localWeight, setWeight])

  const handleReset = useCallback(() => {
    setLocalWeight(weight)
    setIsDirty(false)
  }, [weight])

  // Determine the description based on the weight
  const getWeightDescription = (w: number): string => {
    if (w === 0) return 'Vector-only search (pure semantic similarity)'
    if (w < 0.3) return 'Minimal keyword boost, semantic-focused'
    if (w < 0.5) return 'Balanced toward semantic meaning'
    if (w < 0.7) return 'Balanced hybrid search (recommended)'
    if (w < 0.9) return 'Balanced toward keyword matching'
    if (w < 1) return 'Strong keyword boost, keyword-focused'
    return 'Maximum keyword influence'
  }

  return (
    <div
      className="border rounded-lg p-6"
      style={{ background: 'var(--ws-surface-raised)', borderColor: 'var(--ws-border)' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg">
          <SearchIcon className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-medium" style={{ color: 'var(--ws-text)' }}>
            Hybrid Search Weight
          </h2>
          <p className="text-sm" style={{ color: 'var(--ws-text-muted)' }}>
            Balance between semantic and keyword matching
          </p>
        </div>
      </div>

      {isFetching ? (
        <div className="flex items-center justify-center py-8">
          <Spinner style={{ color: 'var(--ws-text-muted)' }} />
          <span className="ml-3" style={{ color: 'var(--ws-text-muted)' }}>
            Loading settings...
          </span>
        </div>
      ) : (
        <>
          {/* Weight slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--ws-text-secondary)' }}>
                Semantic
              </span>
              <span className="text-sm font-mono" style={{ color: 'var(--ws-text)' }}>
                {localWeight.toFixed(2)}
              </span>
              <span className="text-sm" style={{ color: 'var(--ws-text-secondary)' }}>
                Keyword
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localWeight}
              onChange={handleChange}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-600"
              style={{ background: 'var(--ws-surface-2)' }}
            />

            {/* Description */}
            <p className="text-sm text-center" style={{ color: 'var(--ws-text-secondary)' }}>
              {getWeightDescription(localWeight)}
            </p>
          </div>

          {/* Apply/Reset buttons */}
          {isDirty && (
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleApply}
                disabled={isSetting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSetting ? (
                  <>
                    <Spinner size="sm" />
                    Saving...
                  </>
                ) : (
                  'Apply'
                )}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isSetting}
                className="px-4 py-2 text-sm rounded-lg transition-colors"
                style={{ color: 'var(--ws-text-secondary)' }}
              >
                Reset
              </button>
            </div>
          )}
        </>
      )}

      {/* Help text */}
      <div className="mt-4 p-3 rounded-lg" style={{ background: 'var(--ws-surface-1)' }}>
        <p className="text-xs space-y-1" style={{ color: 'var(--ws-text-secondary)' }}>
          <span className="block">
            <strong style={{ color: 'var(--ws-text-secondary)' }}>Lower values (0.0-0.4):</strong>{' '}
            Better for conceptual questions, finding related ideas
          </span>
          <span className="block">
            <strong style={{ color: 'var(--ws-text-secondary)' }}>Higher values (0.6-1.0):</strong>{' '}
            Better for exact terms, code, error messages
          </span>
        </p>
      </div>
    </div>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  )
}
