import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import type { OutlineItem } from '../../hooks/useSynthesis'

interface OutlineItemComponentProps {
  item: OutlineItem
  index: number
  totalItems: number
  onUpdate: (updates: Partial<Omit<OutlineItem, 'id'>>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onIndent: () => void
  onOutdent: () => void
}

/**
 * Single item in the synthesis outline
 * Supports headings, notes, and chunk references with citations
 */
export function OutlineItemComponent({
  item,
  index,
  totalItems,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onIndent,
  onOutdent,
}: OutlineItemComponentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(item.content)

  // Track previous item.id to detect identity changes
  const prevItemIdRef = useRef(item.id)

  useEffect(() => {
    const itemIdChanged = prevItemIdRef.current !== item.id
    prevItemIdRef.current = item.id

    if (itemIdChanged) {
      // Different item - reset editing state and sync content
      setIsEditing(false)
      setEditContent(item.content)
    } else if (!isEditing) {
      // Same item, content may have changed externally - sync if not editing
      setEditContent(item.content)
    }
  }, [item.id, item.content, isEditing])

  const handleSave = () => {
    onUpdate({ content: editContent })
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      setEditContent(item.content)
      setIsEditing(false)
    }
    // Keyboard shortcuts for reordering
    if (e.altKey) {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        onMoveUp()
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        onMoveDown()
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        onIndent()
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onOutdent()
      }
    }
  }

  const indentPadding = item.indentLevel * 24

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group relative"
      style={{ marginLeft: indentPadding }}
    >
      <div
        className={`
          flex items-start gap-2 p-2 rounded-lg border transition-colors
          ${
            item.type === 'heading'
              ? 'bg-gray-50 dark:bg-gray-750 border-gray-200 dark:border-gray-700'
              : item.type === 'chunk-ref'
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }
        `}
      >
        {/* Type indicator */}
        <div
          className={`
            flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs
            ${
              item.type === 'heading'
                ? 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                : item.type === 'chunk-ref'
                  ? 'bg-blue-200 dark:bg-blue-800 text-blue-600 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }
          `}
        >
          {item.type === 'heading' ? 'H' : item.type === 'chunk-ref' ? 'C' : 'N'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {item.type === 'chunk-ref' ? (
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                {item.sourcePreview || 'No preview available'}
              </p>
              {item.sourceRef && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {formatPath(item.sourceRef.filePath)} #{item.sourceRef.chunkIndex}
                </p>
              )}
            </div>
          ) : isEditing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className={`
                w-full bg-transparent border-0 p-0 focus:outline-none resize-none
                ${
                  item.type === 'heading'
                    ? 'text-base font-medium text-gray-900 dark:text-gray-100'
                    : 'text-sm text-gray-700 dark:text-gray-300'
                }
              `}
              rows={item.type === 'heading' ? 1 : 3}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className={`
                text-left w-full
                ${
                  item.type === 'heading'
                    ? 'text-base font-medium text-gray-900 dark:text-gray-100'
                    : 'text-sm text-gray-700 dark:text-gray-300'
                }
              `}
            >
              {item.content || <span className="italic text-gray-400">Click to edit...</span>}
            </button>
          )}
        </div>

        {/* Actions - visible on hover */}
        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
            title="Move up (Alt+Up)"
          >
            <ChevronUpIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === totalItems - 1}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
            title="Move down (Alt+Down)"
          >
            <ChevronDownIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onOutdent}
            disabled={item.indentLevel === 0}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
            title="Outdent (Alt+Left)"
          >
            <OutdentIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onIndent}
            disabled={item.indentLevel >= 3}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
            title="Indent (Alt+Right)"
          >
            <IndentIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
            title="Remove"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function formatPath(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function IndentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function OutdentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}
