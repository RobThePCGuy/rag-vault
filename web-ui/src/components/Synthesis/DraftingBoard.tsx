import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import type { OutlineItem, SynthesisDraft } from '../../hooks/useSynthesis'
import { OutlineItemComponent } from './OutlineItem'

interface DraftingBoardProps {
  draft: SynthesisDraft
  onUpdateTitle: (title: string) => void
  onAddItem: (item: Omit<OutlineItem, 'id'>) => void
  onRemoveItem: (itemId: string) => void
  onUpdateItem: (itemId: string, updates: Partial<Omit<OutlineItem, 'id'>>) => void
  onMoveUp: (itemId: string) => void
  onMoveDown: (itemId: string) => void
  onIndent: (itemId: string) => void
  onOutdent: (itemId: string) => void
  onExportMarkdown: () => string
  onExportJSON: () => string
  onClose: () => void
  isOpen: boolean
}

/**
 * Synthesis drafting board for building cited outlines
 */
export function DraftingBoard({
  draft,
  onUpdateTitle,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onMoveUp,
  onMoveDown,
  onIndent,
  onOutdent,
  onExportMarkdown,
  onExportJSON,
  onClose,
  isOpen,
}: DraftingBoardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [newItemType, setNewItemType] = useState<'heading' | 'note'>('note')
  const [newItemContent, setNewItemContent] = useState('')
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)

  const handleAddItem = () => {
    if (!newItemContent.trim()) return

    onAddItem({
      type: newItemType,
      content: newItemContent.trim(),
      indentLevel: 0,
    })

    setNewItemContent('')
  }

  const handleExport = (format: 'markdown' | 'json') => {
    setExportDropdownOpen(false)
    const content = format === 'markdown' ? onExportMarkdown() : onExportJSON()
    const blob = new Blob([content], {
      type: format === 'markdown' ? 'text/markdown' : 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${draft.title.replace(/\s+/g, '-').toLowerCase()}.${format === 'markdown' ? 'md' : 'json'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col"
        style={{ background: 'var(--ws-surface-raised)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--ws-border)' }}
        >
          {isEditingTitle ? (
            <input
              type="text"
              value={draft.title}
              onChange={(e) => onUpdateTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
              className="text-lg font-semibold bg-transparent focus:outline-none"
              style={{ color: 'var(--ws-text)', borderBottom: '1px solid var(--ws-accent)' }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingTitle(true)}
              className="text-lg font-semibold"
              style={{ color: 'var(--ws-text)' }}
            >
              {draft.title}
            </button>
          )}

          <div className="flex items-center gap-2">
            {/* Export dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                style={{ color: 'var(--ws-text-secondary)' }}
              >
                Export
              </button>
              {exportDropdownOpen && (
                <div
                  className="absolute right-0 mt-1 w-32 rounded-lg shadow-lg py-1"
                  style={{
                    background: 'var(--ws-surface-raised)',
                    border: '1px solid var(--ws-border)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleExport('markdown')}
                    className="w-full text-left px-3 py-1.5 text-sm"
                    style={{ color: 'var(--ws-text)' }}
                  >
                    Markdown
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('json')}
                    className="w-full text-left px-3 py-1.5 text-sm"
                    style={{ color: 'var(--ws-text)' }}
                  >
                    JSON
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--ws-text-muted)' }}
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {draft.items.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--ws-text-muted)' }}>
              <DocumentIcon />
              <p className="mt-2">No items yet</p>
              <p className="text-sm mt-1">Add content using "Send to Draft" or the form below</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-2">
                {draft.items.map((item, index) => (
                  <OutlineItemComponent
                    key={item.id}
                    item={item}
                    index={index}
                    totalItems={draft.items.length}
                    onUpdate={(updates) => onUpdateItem(item.id, updates)}
                    onRemove={() => onRemoveItem(item.id)}
                    onMoveUp={() => onMoveUp(item.id)}
                    onMoveDown={() => onMoveDown(item.id)}
                    onIndent={() => onIndent(item.id)}
                    onOutdent={() => onOutdent(item.id)}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* Add item form */}
        <div className="p-4" style={{ borderTop: '1px solid var(--ws-border)' }}>
          <div className="flex gap-2">
            <select
              value={newItemType}
              onChange={(e) => setNewItemType(e.target.value as 'heading' | 'note')}
              className="px-2 py-1.5 text-sm rounded-lg"
              style={{
                border: '1px solid var(--ws-border)',
                background: 'var(--ws-surface-raised)',
                color: 'var(--ws-text-secondary)',
              }}
            >
              <option value="note">Note</option>
              <option value="heading">Heading</option>
            </select>
            <input
              type="text"
              value={newItemContent}
              onChange={(e) => setNewItemContent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              placeholder={newItemType === 'heading' ? 'Section heading...' : 'Add a note...'}
              className="flex-1 px-3 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2"
              style={{
                border: '1px solid var(--ws-border)',
                background: 'var(--ws-surface-raised)',
                color: 'var(--ws-text-secondary)',
              }}
            />
            <button
              type="button"
              onClick={handleAddItem}
              disabled={!newItemContent.trim()}
              className="px-3 py-1.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ background: 'var(--ws-accent)' }}
            >
              Add
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg
      className="mx-auto h-10 w-10"
      style={{ color: 'var(--ws-text-muted)' }}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}
