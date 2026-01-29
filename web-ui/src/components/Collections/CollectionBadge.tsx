import { COLLECTION_COLOR_CLASSES, type Collection } from '../../contexts/CollectionsContext'

interface CollectionBadgeProps {
  collection: Collection
  size?: 'sm' | 'md'
  onClick?: () => void
  showRemove?: boolean
  onRemove?: () => void
}

/**
 * Colored pill badge for displaying a collection
 */
export function CollectionBadge({
  collection,
  size = 'sm',
  onClick,
  showRemove,
  onRemove,
}: CollectionBadgeProps) {
  const colorClasses = COLLECTION_COLOR_CLASSES[collection.color]
  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'

  const content = (
    <>
      <FolderIcon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span className="truncate max-w-[100px]">{collection.name}</span>
      {showRemove && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
        >
          <CloseIcon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
        </button>
      )}
    </>
  )

  const className = `
    inline-flex items-center gap-1 rounded-full font-medium
    ${sizeClasses}
    ${colorClasses.bg}
    ${colorClasses.text}
    ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
  `

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    )
  }

  return <span className={className}>{content}</span>
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
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
