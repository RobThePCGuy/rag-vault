import { useMemo } from 'react'

export interface TocEntry {
  id: string
  text: string
  level: number
  chunkIndex: number
  type: 'markdown' | 'allcaps' | 'numbered' | 'fallback'
}

interface UseTableOfContentsOptions {
  chunks: Array<{ text: string; chunkIndex: number }>
  minHeadings?: number
}

interface UseTableOfContentsResult {
  entries: TocEntry[]
  hasHeadings: boolean
  isFallback: boolean
}

// Regex patterns for heading detection
const MARKDOWN_HEADING_PATTERN = /^(#{1,6})\s+(.+)$/m
const ALL_CAPS_PATTERN = /^([A-Z][A-Z0-9\s]{4,79})$/m
const NUMBERED_SECTION_PATTERN = /^(\d+(?:\.\d+)*)\s+(.+)$/m

/**
 * Detect if a line looks like a heading
 */
function detectHeading(
  text: string
): { text: string; level: number; type: TocEntry['type'] } | null {
  // Check markdown headings first (highest priority)
  const markdownMatch = text.match(MARKDOWN_HEADING_PATTERN)
  if (markdownMatch) {
    const [, hashes, headingText] = markdownMatch
    if (hashes && headingText) {
      return {
        text: headingText.trim(),
        level: hashes.length,
        type: 'markdown',
      }
    }
  }

  // Check numbered sections (e.g., "1. Introduction", "2.1 Methods")
  const numberedMatch = text.match(NUMBERED_SECTION_PATTERN)
  if (numberedMatch) {
    const [, number, headingText] = numberedMatch
    if (number && headingText) {
      // Determine level from numbering depth
      const level = number.split('.').length
      return {
        text: `${number} ${headingText.trim()}`,
        level,
        type: 'numbered',
      }
    }
  }

  // Check ALL CAPS lines (5+ chars, max 80)
  const trimmedLine = text.trim()
  if (trimmedLine.length >= 5 && trimmedLine.length <= 80) {
    const allCapsMatch = trimmedLine.match(ALL_CAPS_PATTERN)
    if (allCapsMatch?.[1]) {
      // Make sure it has at least 2 word characters (not just symbols/numbers)
      const wordChars = allCapsMatch[1].match(/[A-Z]/g)
      if (wordChars && wordChars.length >= 3) {
        return {
          text: allCapsMatch[1].trim(),
          level: 1,
          type: 'allcaps',
        }
      }
    }
  }

  return null
}

/**
 * Extract headings from chunk text
 */
function extractHeadingsFromChunk(
  chunkText: string,
  chunkIndex: number
): Array<Omit<TocEntry, 'id'>> {
  const headings: Array<Omit<TocEntry, 'id'>> = []
  const lines = chunkText.split('\n')

  for (const line of lines) {
    const heading = detectHeading(line)
    if (heading) {
      headings.push({
        ...heading,
        chunkIndex,
        // Truncate long headings
        text: heading.text.length > 80 ? `${heading.text.slice(0, 77)}...` : heading.text,
      })
    }
  }

  return headings
}

/**
 * Generate fallback ToC entries when no headings detected
 */
function generateFallbackEntries(chunks: Array<{ chunkIndex: number }>): TocEntry[] {
  // Create entries for every 3rd chunk or so
  const step = Math.max(1, Math.floor(chunks.length / 10))
  return chunks
    .filter((_, i) => i % step === 0)
    .map((chunk, i) => ({
      id: `fallback-${chunk.chunkIndex}`,
      text: `Section ${i + 1}`,
      level: 1,
      chunkIndex: chunk.chunkIndex,
      type: 'fallback' as const,
    }))
}

/**
 * Hook for generating table of contents from document chunks
 * Detects markdown headings, ALL CAPS lines, and numbered sections
 */
export function useTableOfContents({
  chunks,
  minHeadings = 2,
}: UseTableOfContentsOptions): UseTableOfContentsResult {
  const result = useMemo(() => {
    if (chunks.length === 0) {
      return { entries: [], hasHeadings: false, isFallback: false }
    }

    // Extract headings from all chunks
    const allHeadings: Array<Omit<TocEntry, 'id'>> = []
    for (const chunk of chunks) {
      const chunkHeadings = extractHeadingsFromChunk(chunk.text, chunk.chunkIndex)
      allHeadings.push(...chunkHeadings)
    }

    // Deduplicate consecutive identical headings (can happen with overlapping chunks)
    const deduped: Array<Omit<TocEntry, 'id'>> = []
    for (const heading of allHeadings) {
      const last = deduped[deduped.length - 1]
      if (!last || last.text !== heading.text || last.chunkIndex !== heading.chunkIndex) {
        deduped.push(heading)
      }
    }

    // Check if we have enough headings
    if (deduped.length < minHeadings) {
      const fallbackEntries = generateFallbackEntries(chunks)
      return {
        entries: fallbackEntries,
        hasHeadings: false,
        isFallback: true,
      }
    }

    // Assign IDs
    const entries: TocEntry[] = deduped.map((h, i) => ({
      ...h,
      id: `toc-${i}-${h.chunkIndex}`,
    }))

    return {
      entries,
      hasHeadings: true,
      isFallback: false,
    }
  }, [chunks, minHeadings])

  return result
}
