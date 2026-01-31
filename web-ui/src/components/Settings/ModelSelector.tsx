import type { AvailableModel } from '../../api/config'
import { Spinner } from '../ui'

interface ModelSelectorProps {
  models: AvailableModel[]
  value: string
  onChange: (modelId: string) => void
  isLoading?: boolean
  disabled?: boolean
  label?: string
  id?: string
}

export function ModelSelector({
  models,
  value,
  onChange,
  isLoading = false,
  disabled = false,
  label = 'Embedding Model',
  id = 'model-selector',
}: ModelSelectorProps) {
  const selectedModel = models.find((m) => m.id === value) || models.find((m) => m.isDefault)

  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          value={value || selectedModel?.id || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || isLoading}
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed appearance-none pr-10"
        >
          {isLoading ? (
            <option>Loading models...</option>
          ) : (
            models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} {model.isDefault ? '(default)' : ''}
              </option>
            ))
          )}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {isLoading ? (
            <Spinner size="sm" className="text-gray-400" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>
      {selectedModel && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{selectedModel.description}</p>
      )}
    </div>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}
