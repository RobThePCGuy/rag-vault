import { type FormEvent, useState } from 'react'

interface ContentPasteProps {
  onIngest: (content: string, source: string, format: 'text' | 'html' | 'markdown') => void
  isIngesting: boolean
}

export function ContentPaste({ onIngest, isIngesting }: ContentPasteProps) {
  const [content, setContent] = useState('')
  const [source, setSource] = useState('')
  const [format, setFormat] = useState<'text' | 'html' | 'markdown'>('text')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (content.trim() && source.trim()) {
      onIngest(content.trim(), source.trim(), format)
    }
  }

  const generateSource = () => {
    const date = new Date().toISOString().split('T')[0]
    if (format === 'html') {
      setSource(`page://${date}`)
    } else if (format === 'markdown') {
      setSource(`note://${date}`)
    } else {
      setSource(`clipboard://${date}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="source"
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--ws-text-secondary)' }}
        >
          Source Identifier
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            id="source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g., https://example.com or clipboard://2024-01-15"
            className="flex-1 px-4 py-2 rounded-lg focus:ring-2 outline-none"
            style={{
              border: '1px solid var(--ws-border)',
              background: 'var(--ws-surface-raised)',
              color: 'var(--ws-text)',
            }}
            disabled={isIngesting}
          />
          <button
            type="button"
            onClick={generateSource}
            className="px-3 py-2 text-sm rounded-lg transition-colors"
            style={{ color: 'var(--ws-text-secondary)', background: 'var(--ws-surface-1)' }}
          >
            Generate
          </button>
        </div>
      </div>

      <div>
        <label
          htmlFor="format"
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--ws-text-secondary)' }}
        >
          Content Format
        </label>
        <select
          id="format"
          value={format}
          onChange={(e) => setFormat(e.target.value as 'text' | 'html' | 'markdown')}
          className="w-full px-4 py-2 rounded-lg focus:ring-2 outline-none"
          style={{
            border: '1px solid var(--ws-border)',
            background: 'var(--ws-surface-raised)',
            color: 'var(--ws-text)',
          }}
          disabled={isIngesting}
        >
          <option value="text">Plain Text</option>
          <option value="html">HTML</option>
          <option value="markdown">Markdown</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="content"
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--ws-text-secondary)' }}
        >
          Content
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your content here..."
          rows={10}
          className="w-full px-4 py-2 rounded-lg focus:ring-2 outline-none resize-y"
          style={{
            border: '1px solid var(--ws-border)',
            background: 'var(--ws-surface-raised)',
            color: 'var(--ws-text)',
          }}
          disabled={isIngesting}
        />
      </div>

      <button
        type="submit"
        disabled={isIngesting || !content.trim() || !source.trim()}
        className="w-full px-6 py-2 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        style={{ background: 'var(--ws-accent)' }}
      >
        {isIngesting ? 'Ingesting...' : 'Ingest Content'}
      </button>
    </form>
  )
}
