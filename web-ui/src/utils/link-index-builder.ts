// Pure function that builds a wiki-link index from document chunks.
// Used by the web worker and directly in tests.

// --------------------------------------------
// Types
// --------------------------------------------

export interface ScanDocument {
  filePath: string
  chunks: Array<{ chunkIndex: number; text: string }>
}

export interface LinkEdge {
  sourceDoc: string
  targetTitle: string
  heading?: string
  blockRef?: string
  alias?: string
  chunkIndex: number
  position: { start: number; end: number }
}

export interface LinkIndex {
  /** Map from source doc filePath to outgoing links */
  outgoing: Record<string, LinkEdge[]>
  /** Map from target docTitle to incoming links (backlinks) */
  incoming: Record<string, LinkEdge[]>
  /** All unique doc titles referenced by wiki links */
  referencedTitles: string[]
  /** Total number of wiki links found */
  totalLinks: number
  /** Total number of documents scanned */
  totalDocuments: number
}

// --------------------------------------------
// Inline wiki-link regex (duplicated from wiki-link-parser.ts
// so the web worker can use it without importing from the main bundle)
// --------------------------------------------

const WIKI_LINK_RE = /\[\[([^\]|#^]+?)(?:#([^\]|^]+?))?(?:\^([^\]|]+?))?(?:\|([^\]]+?))?\]\]/g

interface ParsedLink {
  docTitle: string
  heading?: string
  blockRef?: string
  alias?: string
  start: number
  end: number
}

function parseWikiLinksInline(text: string): ParsedLink[] {
  const links: ParsedLink[] = []
  let match: RegExpExecArray | null
  WIKI_LINK_RE.lastIndex = 0
  while ((match = WIKI_LINK_RE.exec(text)) !== null) {
    links.push({
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

// --------------------------------------------
// Builder
// --------------------------------------------

export function buildLinkIndex(documents: ScanDocument[]): LinkIndex {
  const outgoing: Record<string, LinkEdge[]> = {}
  const incoming: Record<string, LinkEdge[]> = {}
  const referencedTitleSet = new Set<string>()
  let totalLinks = 0

  for (const doc of documents) {
    const docEdges: LinkEdge[] = []

    for (const chunk of doc.chunks) {
      const parsed = parseWikiLinksInline(chunk.text)

      for (const link of parsed) {
        const edge: LinkEdge = {
          sourceDoc: doc.filePath,
          targetTitle: link.docTitle,
          heading: link.heading,
          blockRef: link.blockRef,
          alias: link.alias,
          chunkIndex: chunk.chunkIndex,
          position: { start: link.start, end: link.end },
        }

        docEdges.push(edge)
        referencedTitleSet.add(link.docTitle)

        // Build incoming map keyed by target title
        const incomingList = incoming[link.docTitle]
        if (incomingList) {
          incomingList.push(edge)
        } else {
          incoming[link.docTitle] = [edge]
        }

        totalLinks++
      }
    }

    if (docEdges.length > 0) {
      outgoing[doc.filePath] = docEdges
    }
  }

  return {
    outgoing,
    incoming,
    referencedTitles: Array.from(referencedTitleSet).sort(),
    totalLinks,
    totalDocuments: documents.length,
  }
}
