import { useMemo } from 'react'

// ============================================
// Types
// ============================================

export interface SkimSection {
  chunkIndex: number
  heading: string | null
  firstSentence: string
  hasMoreContent: boolean
  originalText: string
}

interface UseSkimModeOptions {
  chunks: Array<{ text: string; chunkIndex?: number }>
  enabled: boolean
}

interface UseSkimModeResult {
  sections: SkimSection[]
  getSectionForChunk: (chunkIndex: number) => SkimSection | undefined
}

// ============================================
// Heading detection patterns
// ============================================

// Markdown headings: # ## ### etc.
const MARKDOWN_HEADING_PATTERN = /^(#{1,6})\s+(.+)$/m

// ALL CAPS headings (at least 3 consecutive uppercase words)
const ALL_CAPS_PATTERN = /^([A-Z][A-Z\s]{5,}[A-Z])$/m

// Numbered headings: 1. Section or 1.1 Section
const NUMBERED_HEADING_PATTERN = /^(\d+\.[\d.]*)\s+(.+)$/m

// ============================================
// Hook
// ============================================

/**
 * Hook for generating skim mode sections from document chunks
 * Extracts headings and first sentences for quick overview
 */
export function useSkimMode({ chunks, enabled }: UseSkimModeOptions): UseSkimModeResult {
  const sections = useMemo(() => {
    if (!enabled) return []

    return chunks.map((chunk, index): SkimSection => {
      const chunkIndex = chunk.chunkIndex ?? index
      const text = chunk.text.trim()
      const lines = text.split('\n').filter((line) => line.trim().length > 0)

      // Try to detect heading
      const heading = detectHeading(lines)

      // Get first sentence (after heading if present)
      const firstSentence = extractFirstSentence(text, heading)

      // Check if there's more content
      const hasMoreContent = text.length > (heading?.length ?? 0) + firstSentence.length + 20

      return {
        chunkIndex,
        heading,
        firstSentence,
        hasMoreContent,
        originalText: text,
      }
    })
  }, [chunks, enabled])

  const getSectionForChunk = useMemo(() => {
    const map = new Map<number, SkimSection>()
    for (const section of sections) {
      map.set(section.chunkIndex, section)
    }
    return (chunkIndex: number) => map.get(chunkIndex)
  }, [sections])

  return {
    sections,
    getSectionForChunk,
  }
}

// ============================================
// Helpers
// ============================================

function detectHeading(lines: string[]): string | null {
  if (lines.length === 0) return null

  const firstLineRaw = lines[0]
  if (!firstLineRaw) return null
  const firstLine = firstLineRaw.trim()

  // Check markdown heading
  const markdownMatch = firstLine.match(MARKDOWN_HEADING_PATTERN)
  if (markdownMatch && markdownMatch[2]) {
    return markdownMatch[2].trim()
  }

  // Check ALL CAPS heading (must be on its own line and relatively short)
  if (firstLine.length < 60) {
    const capsMatch = firstLine.match(ALL_CAPS_PATTERN)
    if (capsMatch) {
      return firstLine
    }
  }

  // Check numbered heading
  const numberedMatch = firstLine.match(NUMBERED_HEADING_PATTERN)
  if (numberedMatch) {
    return `${numberedMatch[1]} ${numberedMatch[2]}`.trim()
  }

  // Check if first line looks like a title (short, no period at end)
  if (firstLine.length < 80 && !firstLine.endsWith('.') && lines.length > 1) {
    // Additional heuristics for title-like lines
    const words = firstLine.split(/\s+/)
    const capitalizedWords = words.filter((w) => /^[A-Z]/.test(w))
    // If most words are capitalized and it's short, treat as heading
    if (capitalizedWords.length >= words.length * 0.6 && words.length <= 10) {
      return firstLine
    }
  }

  return null
}

function extractFirstSentence(text: string, heading: string | null): string {
  // Remove the heading from text if present
  let processedText = text
  if (heading) {
    // Try to remove the heading line
    const lines = text.split('\n')
    const headingIndex = lines.findIndex(
      (line) =>
        line.includes(heading) ||
        line.replace(/^#+\s*/, '').trim() === heading
    )
    if (headingIndex !== -1) {
      processedText = lines.slice(headingIndex + 1).join('\n')
    }
  }

  processedText = processedText.trim()
  if (!processedText) return ''

  // Find end of first sentence
  // Match period, exclamation, or question mark followed by space or end of string
  const sentenceEndMatch = processedText.match(/[.!?](?:\s|$)/)
  if (sentenceEndMatch && sentenceEndMatch.index !== undefined) {
    const endIndex = sentenceEndMatch.index + 1
    const sentence = processedText.slice(0, endIndex).trim()
    // Limit length for display
    if (sentence.length > 200) {
      return sentence.slice(0, 200) + '...'
    }
    return sentence
  }

  // No sentence end found, take first 200 chars
  if (processedText.length > 200) {
    // Try to break at a word boundary
    const truncated = processedText.slice(0, 200)
    const lastSpace = truncated.lastIndexOf(' ')
    if (lastSpace > 150) {
      return truncated.slice(0, lastSpace) + '...'
    }
    return truncated + '...'
  }

  return processedText
}
