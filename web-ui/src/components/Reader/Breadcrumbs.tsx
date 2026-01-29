import { motion } from 'framer-motion'

export interface BreadcrumbItem {
  filePath: string
  chunkIndex?: number
  label: string
  connectionReason?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  onNavigate: (item: BreadcrumbItem) => void
  onSaveTrail?: () => void
  canSaveTrail?: boolean
}

/**
 * Navigation breadcrumbs showing the path through documents
 * Allows quick navigation back to previously visited chunks
 */
export function Breadcrumbs({ items, onNavigate, onSaveTrail, canSaveTrail }: BreadcrumbsProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <nav
      className="flex items-center gap-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-x-auto"
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center gap-1">
        {/* Home */}
        <li>
          <button
            type="button"
            onClick={() => onNavigate({ filePath: '', label: 'Search', chunkIndex: undefined })}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <HomeIcon />
          </button>
        </li>

        {items.map((item, index) => (
          <motion.li
            key={`${item.filePath}-${item.chunkIndex ?? 'doc'}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center"
          >
            {/* Separator with connection reason */}
            <span className="mx-1 text-gray-400 dark:text-gray-500">/</span>
            {item.connectionReason && (
              <span className="text-xs text-gray-400 dark:text-gray-500 italic mr-1">
                via "{item.connectionReason}"
              </span>
            )}

            {/* Breadcrumb item */}
            <button
              type="button"
              onClick={() => onNavigate(item)}
              disabled={index === items.length - 1}
              className={`
                text-sm truncate max-w-[150px] px-2 py-0.5 rounded
                ${
                  index === items.length - 1
                    ? 'text-gray-900 dark:text-gray-100 font-medium bg-gray-100 dark:bg-gray-700'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
                transition-colors
              `}
              title={`${item.label}${item.chunkIndex !== undefined ? ` #${item.chunkIndex}` : ''}`}
            >
              {item.label}
              {item.chunkIndex !== undefined && (
                <span className="ml-1 text-gray-400 dark:text-gray-500">#{item.chunkIndex}</span>
              )}
            </button>
          </motion.li>
        ))}
      </ol>

      {/* Save Trail button */}
      {onSaveTrail && canSaveTrail && items.length > 1 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          type="button"
          onClick={onSaveTrail}
          className="ml-auto px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors whitespace-nowrap"
        >
          Save Trail
        </motion.button>
      )}
    </nav>
  )
}

function HomeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  )
}
