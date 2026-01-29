import type { SynthesisDraft } from '../hooks/useSynthesis'

/**
 * Export a synthesis draft to markdown with citations
 */
export function exportToMarkdown(draft: SynthesisDraft): string {
  let md = `# ${draft.title}\n\n`
  md += `*Created: ${new Date(draft.createdAt).toLocaleDateString()}*\n\n`
  md += `---\n\n`

  for (const item of draft.items) {
    const indent = '  '.repeat(item.indentLevel)

    switch (item.type) {
      case 'heading':
        // Use heading level based on indent
        const hLevel = Math.min(item.indentLevel + 2, 6)
        md += `${'#'.repeat(hLevel)} ${item.content}\n\n`
        break

      case 'chunk-ref':
        if (item.sourceRef) {
          const citation = `/read?path=${encodeURIComponent(item.sourceRef.filePath)}&chunk=${item.sourceRef.chunkIndex}`
          md += `${indent}> ${item.sourcePreview?.slice(0, 150) || 'No preview'}...\n`
          md += `${indent}>\n`
          md += `${indent}> — [Source](${citation})`
          if (item.sourceRef.fingerprint) {
            md += ` \`fp:${item.sourceRef.fingerprint.slice(0, 8)}\``
          }
          md += `\n\n`
        }
        break

      case 'note':
        md += `${indent}${item.content}\n\n`
        break
    }
  }

  return md
}

/**
 * Export a synthesis draft to JSON (for backup/import)
 */
export function exportToJSON(draft: SynthesisDraft): string {
  return JSON.stringify(draft, null, 2)
}

/**
 * Import a synthesis draft from JSON
 */
export function importFromJSON(json: string): SynthesisDraft | null {
  try {
    const data = JSON.parse(json)
    // Basic validation
    if (!data.id || !data.title || !Array.isArray(data.items)) {
      return null
    }
    return data as SynthesisDraft
  } catch {
    return null
  }
}

/**
 * Export draft to HTML (for richer formatting)
 */
export function exportToHTML(draft: SynthesisDraft): string {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(draft.title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
    blockquote { border-left: 4px solid #3b82f6; margin: 1rem 0; padding: 0.5rem 1rem; background: #eff6ff; }
    blockquote footer { font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem; }
    blockquote footer a { color: #3b82f6; }
    .note { margin: 1rem 0; }
    .indent-1 { margin-left: 2rem; }
    .indent-2 { margin-left: 4rem; }
    .indent-3 { margin-left: 6rem; }
  </style>
</head>
<body>
  <h1>${escapeHtml(draft.title)}</h1>
  <p><em>Created: ${new Date(draft.createdAt).toLocaleDateString()}</em></p>
  <hr>
`

  for (const item of draft.items) {
    const indentClass = item.indentLevel > 0 ? ` class="indent-${item.indentLevel}"` : ''

    switch (item.type) {
      case 'heading':
        const hLevel = Math.min(item.indentLevel + 2, 6)
        html += `  <h${hLevel}${indentClass}>${escapeHtml(item.content)}</h${hLevel}>\n`
        break

      case 'chunk-ref':
        if (item.sourceRef) {
          const citation = `/read?path=${encodeURIComponent(item.sourceRef.filePath)}&chunk=${item.sourceRef.chunkIndex}`
          html += `  <blockquote${indentClass}>
    <p>${escapeHtml(item.sourcePreview?.slice(0, 150) || 'No preview')}...</p>
    <footer><a href="${citation}">Source</a></footer>
  </blockquote>\n`
        }
        break

      case 'note':
        html += `  <p class="note${item.indentLevel > 0 ? ` indent-${item.indentLevel}` : ''}">${escapeHtml(item.content)}</p>\n`
        break
    }
  }

  html += `</body>
</html>`

  return html
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
