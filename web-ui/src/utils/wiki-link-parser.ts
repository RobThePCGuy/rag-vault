export interface ParsedWikiLink {
  raw: string
  docTitle: string
  heading?: string
  blockRef?: string
  alias?: string
  start: number
  end: number
}

const WIKI_LINK_RE = /\[\[([^\]|#^]+?)(?:#([^\]|^]+?))?(?:\^([^\]|]+?))?(?:\|([^\]]+?))?\]\]/g

export function parseWikiLinks(text: string): ParsedWikiLink[] {
  const links: ParsedWikiLink[] = []
  let match: RegExpExecArray | null
  // Reset lastIndex for safety
  WIKI_LINK_RE.lastIndex = 0
  while ((match = WIKI_LINK_RE.exec(text)) !== null) {
    links.push({
      raw: match[0],
      docTitle: match[1]!.trim(),
      heading: match[2]?.trim(),
      blockRef: match[3]?.trim(),
      alias: match[4]?.trim(),
      start: match.index,
      end: match.index + match[0].length,
    })
  }
  return links
}

/**
 * Get the display text for a wiki link
 */
export function getWikiLinkDisplay(link: ParsedWikiLink): string {
  if (link.alias) return link.alias
  let display = link.docTitle
  if (link.heading) display += ` > ${link.heading}`
  if (link.blockRef) display += ` (^${link.blockRef})`
  return display
}

/**
 * Check if cursor position is inside a [[ ]] block being typed
 * Returns the partial text after [[ if active, null otherwise
 */
export function getActiveWikiLinkAtCursor(
  text: string,
  cursorPosition: number
): { partial: string; start: number } | null {
  // Look backwards from cursor for [[
  const before = text.slice(0, cursorPosition)
  const openIndex = before.lastIndexOf('[[')
  if (openIndex === -1) return null

  // Check there's no ]] between [[ and cursor
  const between = before.slice(openIndex + 2)
  if (between.includes(']]')) return null

  return {
    partial: between,
    start: openIndex,
  }
}
