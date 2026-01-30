import type { Annotation, Highlight } from '../contexts/AnnotationsContext'
import type { PinnedLink } from '../contexts/LinksContext'

// ============================================
// Types
// ============================================

export interface ExportOptions {
  format: 'markdown' | 'json' | 'html'
  includeAnnotations?: boolean
  includePins?: boolean
  includeTrails?: boolean
  includeProvenance?: boolean
}

export interface DocumentExportData {
  filePath: string
  title: string
  chunks: Array<{
    chunkIndex: number
    text: string
  }>
  highlights: Highlight[]
  annotations: Annotation[]
  pins: PinnedLink[]
  backlinks: PinnedLink[]
}

// ============================================
// Markdown Export
// ============================================

/**
 * Escape == in text to prevent false highlight markers
 */
function escapeHighlightMarkers(text: string): string {
  return text.replace(/==/g, '\\==')
}

/**
 * Export document with annotations as Markdown
 */
export function exportAsMarkdown(
  data: DocumentExportData,
  options: ExportOptions
): string {
  const lines: string[] = []

  // Title
  lines.push(`# ${data.title}`)
  lines.push('')

  // Process each chunk
  for (const chunk of data.chunks) {
    // Chunk header with anchor
    if (options.includeProvenance) {
      lines.push(`## Chunk ${chunk.chunkIndex} [[${data.filePath}::${chunk.chunkIndex}]]`)
    } else {
      lines.push(`## Chunk ${chunk.chunkIndex}`)
    }
    lines.push('')

    // Get highlights for this chunk, sorted by position
    const chunkHighlights = data.highlights
      .filter((h) => h.chunkKey.chunkIndex === chunk.chunkIndex)
      .sort((a, b) => a.range.startOffset - b.range.startOffset)

    // Apply highlights to text
    let processedText = chunk.text
    if (options.includeAnnotations && chunkHighlights.length > 0) {
      processedText = applyHighlightsToText(chunk.text, chunkHighlights)
    } else {
      processedText = escapeHighlightMarkers(chunk.text)
    }

    lines.push(processedText)
    lines.push('')

    // Add notes for this chunk
    if (options.includeAnnotations) {
      for (const highlight of chunkHighlights) {
        const annotation = data.annotations.find((a) => a.highlightId === highlight.id)
        if (annotation?.note) {
          lines.push(`> **Note:** ${annotation.note}`)
          lines.push('')
        }
      }
    }

    lines.push('---')
    lines.push('')
  }

  // Metadata section
  lines.push('## Metadata')
  lines.push('')
  lines.push(`- Exported: ${new Date().toISOString().split('T')[0]}`)

  if (options.includeAnnotations) {
    lines.push(`- Highlights: ${data.highlights.length}`)
    const notesCount = data.annotations.filter((a) => a.note).length
    lines.push(`- Notes: ${notesCount}`)
  }

  if (options.includePins) {
    lines.push(`- Pinned Links: ${data.pins.length}`)
    lines.push(`- Backlinks: ${data.backlinks.length}`)
  }

  return lines.join('\n')
}

/**
 * Apply highlight markers to text
 */
function applyHighlightsToText(text: string, highlights: Highlight[]): string {
  // Process from end to start to maintain positions
  const sortedHighlights = [...highlights].sort(
    (a, b) => b.range.startOffset - a.range.startOffset
  )

  let result = text

  for (const highlight of sortedHighlights) {
    const { startOffset, endOffset } = highlight.range
    if (startOffset >= result.length || endOffset > result.length) continue

    const before = result.slice(0, startOffset)
    const highlighted = result.slice(startOffset, endOffset)
    const after = result.slice(endOffset)

    // Escape any == in the highlighted text
    const escapedHighlighted = escapeHighlightMarkers(highlighted)

    result = `${escapeHighlightMarkers(before)}==${escapedHighlighted}==${after}`
    // Note: 'after' is not escaped here as it will be processed by subsequent highlights
  }

  return result
}

// ============================================
// JSON Export
// ============================================

/**
 * Export document with full metadata as JSON
 */
export function exportAsJson(
  data: DocumentExportData,
  options: ExportOptions
): string {
  const exportData: Record<string, unknown> = {
    version: 1,
    exportedAt: new Date().toISOString(),
    document: {
      filePath: data.filePath,
      title: data.title,
      chunkCount: data.chunks.length,
    },
  }

  if (options.includeAnnotations) {
    exportData.highlights = data.highlights
    exportData.annotations = data.annotations
  }

  if (options.includePins) {
    exportData.pins = data.pins
    exportData.backlinks = data.backlinks
  }

  return JSON.stringify(exportData, null, 2)
}

// ============================================
// HTML Export
// ============================================

const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: '#fef08a',
  green: '#bbf7d0',
  blue: '#bfdbfe',
  pink: '#fbcfe8',
  purple: '#e9d5ff',
}

/**
 * Export document as styled HTML with <mark> highlights
 */
export function exportAsHtml(
  data: DocumentExportData,
  options: ExportOptions
): string {
  const lines: string[] = []

  // HTML header with embedded styles
  lines.push('<!DOCTYPE html>')
  lines.push('<html lang="en">')
  lines.push('<head>')
  lines.push('<meta charset="UTF-8">')
  lines.push('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
  lines.push(`<title>${escapeHtml(data.title)}</title>`)
  lines.push('<style>')
  lines.push(`
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.6;
      color: #1f2937;
    }
    h1 { font-size: 1.875rem; margin-bottom: 1rem; }
    h2 { font-size: 1.25rem; color: #6b7280; margin-top: 2rem; }
    .chunk { margin-bottom: 2rem; padding: 1rem; background: #f9fafb; border-radius: 0.5rem; }
    .chunk-header { font-size: 0.875rem; color: #9ca3af; margin-bottom: 0.5rem; }
    .chunk-text { white-space: pre-wrap; }
    mark { border-radius: 0.125rem; padding: 0 0.125rem; }
    .mark-yellow { background-color: ${HIGHLIGHT_COLORS.yellow}; }
    .mark-green { background-color: ${HIGHLIGHT_COLORS.green}; }
    .mark-blue { background-color: ${HIGHLIGHT_COLORS.blue}; }
    .mark-pink { background-color: ${HIGHLIGHT_COLORS.pink}; }
    .mark-purple { background-color: ${HIGHLIGHT_COLORS.purple}; }
    .note { margin-top: 0.5rem; padding: 0.5rem; background: #fef3c7; border-left: 3px solid #f59e0b; font-size: 0.875rem; }
    .metadata { margin-top: 2rem; padding: 1rem; background: #f3f4f6; border-radius: 0.5rem; font-size: 0.875rem; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 1rem 0; }
  `)
  lines.push('</style>')
  lines.push('</head>')
  lines.push('<body>')

  // Title
  lines.push(`<h1>${escapeHtml(data.title)}</h1>`)

  // Process each chunk
  for (const chunk of data.chunks) {
    lines.push('<div class="chunk">')

    // Chunk header
    const anchor = options.includeProvenance
      ? ` <a id="chunk-${chunk.chunkIndex}"></a>`
      : ''
    lines.push(`<div class="chunk-header">Chunk ${chunk.chunkIndex}${anchor}</div>`)

    // Get highlights for this chunk
    const chunkHighlights = data.highlights
      .filter((h) => h.chunkKey.chunkIndex === chunk.chunkIndex)
      .sort((a, b) => a.range.startOffset - b.range.startOffset)

    // Apply highlights to text
    let processedText = escapeHtml(chunk.text)
    if (options.includeAnnotations && chunkHighlights.length > 0) {
      processedText = applyHighlightsToHtml(chunk.text, chunkHighlights)
    }

    lines.push(`<div class="chunk-text">${processedText}</div>`)

    // Add notes
    if (options.includeAnnotations) {
      for (const highlight of chunkHighlights) {
        const annotation = data.annotations.find((a) => a.highlightId === highlight.id)
        if (annotation?.note) {
          lines.push(`<div class="note"><strong>Note:</strong> ${escapeHtml(annotation.note)}</div>`)
        }
      }
    }

    lines.push('</div>')
  }

  // Metadata
  lines.push('<div class="metadata">')
  lines.push('<strong>Metadata</strong>')
  lines.push(`<p>Exported: ${new Date().toISOString().split('T')[0]}</p>`)

  if (options.includeAnnotations) {
    lines.push(`<p>Highlights: ${data.highlights.length}</p>`)
    const notesCount = data.annotations.filter((a) => a.note).length
    lines.push(`<p>Notes: ${notesCount}</p>`)
  }

  if (options.includePins) {
    lines.push(`<p>Pinned Links: ${data.pins.length}</p>`)
    lines.push(`<p>Backlinks: ${data.backlinks.length}</p>`)
  }

  lines.push('</div>')

  lines.push('</body>')
  lines.push('</html>')

  return lines.join('\n')
}

/**
 * Apply highlight markers to HTML
 */
function applyHighlightsToHtml(text: string, highlights: Highlight[]): string {
  // Process from end to start to maintain positions
  const sortedHighlights = [...highlights].sort(
    (a, b) => b.range.startOffset - a.range.startOffset
  )

  let result = text

  for (const highlight of sortedHighlights) {
    const { startOffset, endOffset } = highlight.range
    // Validate bounds - skip invalid offsets
    if (startOffset < 0 || endOffset < 0) continue
    if (startOffset >= result.length || endOffset > result.length) continue
    if (startOffset >= endOffset) continue

    const before = result.slice(0, startOffset)
    const highlighted = result.slice(startOffset, endOffset)
    const after = result.slice(endOffset)

    const colorClass = `mark-${highlight.color}`
    result = `${escapeHtml(before)}<mark class="${colorClass}">${escapeHtml(highlighted)}</mark>${escapeHtml(after)}`
  }

  return result
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ============================================
// Main Export Function
// ============================================

/**
 * Export document in the specified format
 */
export function exportDocument(
  data: DocumentExportData,
  options: ExportOptions
): { content: string; filename: string; mimeType: string } {
  const baseName = data.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)
  const date = new Date().toISOString().split('T')[0]

  switch (options.format) {
    case 'markdown':
      return {
        content: exportAsMarkdown(data, options),
        filename: `${baseName}_${date}.md`,
        mimeType: 'text/markdown',
      }
    case 'json':
      return {
        content: exportAsJson(data, options),
        filename: `${baseName}_${date}.json`,
        mimeType: 'application/json',
      }
    case 'html':
      return {
        content: exportAsHtml(data, options),
        filename: `${baseName}_${date}.html`,
        mimeType: 'text/html',
      }
  }
}

/**
 * Trigger a file download in the browser
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
