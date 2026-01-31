import { motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import type { Annotation, Highlight, HighlightColor } from '../../contexts/AnnotationsContext'

interface AnnotationNoteProps {
  highlight: Highlight
  annotation: Annotation | undefined
  onUpdateNote: (note: string) => void
  onDeleteNote: () => void
  onDeleteHighlight: () => void
  onChangeColor: (color: HighlightColor) => void
}

const COLORS: { color: HighlightColor; bg: string; ring: string; label: string }[] = [
  { color: 'yellow', bg: 'bg-yellow-300', ring: 'ring-yellow-400', label: 'Yellow' },
  { color: 'green', bg: 'bg-green-300', ring: 'ring-green-400', label: 'Green' },
  { color: 'blue', bg: 'bg-blue-300', ring: 'ring-blue-400', label: 'Blue' },
  { color: 'pink', bg: 'bg-pink-300', ring: 'ring-pink-400', label: 'Pink' },
  { color: 'purple', bg: 'bg-purple-300', ring: 'ring-purple-400', label: 'Purple' },
]

/**
 * Annotation note card for the margin
 * Shows highlighted text preview, editable note, and color picker
 */
export function AnnotationNote({
  highlight,
  annotation,
  onUpdateNote,
  onDeleteNote,
  onDeleteHighlight,
  onChangeColor,
}: AnnotationNoteProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [noteText, setNoteText] = useState(annotation?.note || '')
  const [showColorPicker, setShowColorPicker] = useState(false)

  const handleSaveNote = useCallback(() => {
    if (noteText.trim()) {
      onUpdateNote(noteText.trim())
    }
    setIsEditing(false)
  }, [noteText, onUpdateNote])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSaveNote()
      }
      if (e.key === 'Escape') {
        setIsEditing(false)
        setNoteText(annotation?.note || '')
      }
    },
    [handleSaveNote, annotation?.note]
  )

  const currentColor = COLORS.find((c) => c.color === highlight.color)

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
    >
      {/* Header with highlighted text preview */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 italic line-clamp-2">
          "{highlight.text.length > 60 ? `${highlight.text.slice(0, 60)}...` : highlight.text}"
        </p>
      </div>

      {/* Note content */}
      <div className="p-3">
        {isEditing ? (
          <div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveNote}
              placeholder="Add a note..."
              className="w-full px-2 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded border-0 resize-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setNoteText(annotation?.note || '')
                }}
                className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div>
            {annotation?.note ? (
              <button
                type="button"
                className="text-left text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                onClick={() => setIsEditing(true)}
              >
                {annotation.note}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 italic"
              >
                + Add note...
              </button>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-gray-700/50">
        {/* Color picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={`w-5 h-5 rounded-full ${currentColor?.bg} ring-1 ring-gray-300 dark:ring-gray-600`}
            title="Change color"
          />
          {showColorPicker && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowColorPicker(false)}
                onKeyDown={(e) => e.key === 'Escape' && setShowColorPicker(false)}
                role="button"
                tabIndex={0}
                aria-label="Close color picker"
              />
              <div className="absolute bottom-full left-0 mb-2 z-20 flex gap-1 p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                {COLORS.map(({ color, bg, ring }) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      onChangeColor(color)
                      setShowColorPicker(false)
                    }}
                    className={`w-5 h-5 rounded-full ${bg} hover:ring-2 ${ring} transition-all ${
                      color === highlight.color ? 'ring-2' : ''
                    }`}
                    title={color}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Delete actions */}
        <div className="flex items-center gap-2">
          {annotation && (
            <button
              type="button"
              onClick={onDeleteNote}
              className="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
              title="Delete note"
            >
              Remove note
            </button>
          )}
          <button
            type="button"
            onClick={onDeleteHighlight}
            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
            title="Delete highlight"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
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
