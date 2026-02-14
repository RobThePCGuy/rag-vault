import { useMemo } from 'react'
import type { Highlight, HighlightColor } from '../../contexts/AnnotationsContext'

// ============================================
// Types
// ============================================

export interface TextRange {
  startOffset: number
  endOffset: number
  type: 'annotation' | 'search-match' | 'search-current'
  highlightId?: string
  color?: HighlightColor
}

export interface SearchMatch {
  chunkIndex: number
  startOffset: number
  endOffset: number
  context: string
}

interface UnifiedTextRendererProps {
  text: string
  highlights: Highlight[]
  searchMatches?: SearchMatch[]
  currentSearchIndex?: number
  chunkIndex: number
  onHighlightClick?: (highlight: Highlight) => void
}

interface RenderSegment {
  text: string
  types: TextRange[]
}

// ============================================
// Color Classes
// ============================================

const HIGHLIGHT_COLOR_CLASSES: Record<HighlightColor, string> = {
  yellow: 'bg-yellow-200 dark:bg-yellow-800/60',
  green: 'bg-green-200 dark:bg-green-800/60',
  blue: 'bg-blue-200 dark:bg-blue-800/60',
  pink: 'bg-pink-200 dark:bg-pink-800/60',
  purple: 'bg-purple-200 dark:bg-purple-800/60',
}

const HIGHLIGHT_HOVER_CLASSES: Record<HighlightColor, string> = {
  yellow: 'hover:bg-yellow-300 dark:hover:bg-yellow-700/60',
  green: 'hover:bg-green-300 dark:hover:bg-green-700/60',
  blue: 'hover:bg-blue-300 dark:hover:bg-blue-700/60',
  pink: 'hover:bg-pink-300 dark:hover:bg-pink-700/60',
  purple: 'hover:bg-purple-300 dark:hover:bg-purple-700/60',
}

// ============================================
// Range Merging Logic
// ============================================

/**
 * Merge annotation and search ranges, handling overlaps
 * Priority: Annotation background wins, search gets outline/underline
 */
function mergeRanges(
  text: string,
  annotationRanges: TextRange[],
  searchRanges: TextRange[]
): RenderSegment[] {
  // Collect all boundary points
  const boundaries = new Set<number>()
  boundaries.add(0)
  boundaries.add(text.length)

  const allRanges = [...annotationRanges, ...searchRanges]
  for (const range of allRanges) {
    if (range.startOffset >= 0 && range.startOffset <= text.length) {
      boundaries.add(range.startOffset)
    }
    if (range.endOffset >= 0 && range.endOffset <= text.length) {
      boundaries.add(range.endOffset)
    }
  }

  // Sort boundary points
  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b)

  // Create segments between each pair of boundaries
  const segments: RenderSegment[] = []

  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const start = sortedBoundaries[i]!
    const end = sortedBoundaries[i + 1]!

    if (start >= end) continue

    // Find all ranges that cover this segment
    const activeRanges = allRanges.filter((r) => r.startOffset <= start && r.endOffset >= end)

    segments.push({
      text: text.slice(start, end),
      types: activeRanges,
    })
  }

  return segments
}

/**
 * Convert highlights to TextRange format
 */
function highlightsToRanges(highlights: Highlight[]): TextRange[] {
  return highlights.map((h) => ({
    startOffset: h.range.startOffset,
    endOffset: h.range.endOffset,
    type: 'annotation' as const,
    highlightId: h.id,
    color: h.color,
  }))
}

/**
 * Convert search matches to TextRange format
 */
function searchMatchesToRanges(
  matches: SearchMatch[],
  chunkIndex: number,
  currentIndex: number
): TextRange[] {
  let matchIndexInChunk = 0
  const ranges: TextRange[] = []

  // Find the global start index for matches in this chunk
  let globalIndexOffset = 0
  for (const match of matches) {
    if (match.chunkIndex < chunkIndex) {
      globalIndexOffset++
    }
  }

  for (const match of matches) {
    if (match.chunkIndex !== chunkIndex) continue

    const globalIndex = globalIndexOffset + matchIndexInChunk
    ranges.push({
      startOffset: match.startOffset,
      endOffset: match.endOffset,
      type: globalIndex === currentIndex ? 'search-current' : 'search-match',
    })
    matchIndexInChunk++
  }

  return ranges
}

// ============================================
// Component
// ============================================

/**
 * Renders text with merged highlights and search matches
 * Annotation highlights get background color
 * Current search match gets orange outline/ring
 * Non-current search matches get dotted underline
 */
export function UnifiedTextRenderer({
  text,
  highlights,
  searchMatches = [],
  currentSearchIndex = -1,
  chunkIndex,
  onHighlightClick,
}: UnifiedTextRendererProps) {
  // Convert to TextRange format
  const annotationRanges = useMemo(() => highlightsToRanges(highlights), [highlights])

  const searchRanges = useMemo(
    () => searchMatchesToRanges(searchMatches, chunkIndex, currentSearchIndex),
    [searchMatches, chunkIndex, currentSearchIndex]
  )

  // Merge ranges into segments
  const segments = useMemo(
    () => mergeRanges(text, annotationRanges, searchRanges),
    [text, annotationRanges, searchRanges]
  )

  // Create a map for quick highlight lookup
  const highlightMap = useMemo(() => {
    const map = new Map<string, Highlight>()
    for (const h of highlights) {
      map.set(h.id, h)
    }
    return map
  }, [highlights])

  return (
    <span className="whitespace-pre-wrap">
      {segments.map((segment, index) => {
        // Find annotation and search types in this segment
        const annotationType = segment.types.find((t) => t.type === 'annotation')
        const searchCurrentType = segment.types.find((t) => t.type === 'search-current')
        const searchMatchType = segment.types.find((t) => t.type === 'search-match')

        // Build class names based on active types
        const classNames: string[] = ['rounded', 'transition-colors']

        // Annotation background (priority)
        if (annotationType?.color) {
          classNames.push(HIGHLIGHT_COLOR_CLASSES[annotationType.color])
          classNames.push(HIGHLIGHT_HOVER_CLASSES[annotationType.color])
          classNames.push('cursor-pointer', 'px-0.5')
        }

        // Current search match: orange ring/outline (doesn't override annotation bg)
        if (searchCurrentType) {
          classNames.push(
            'ring-2',
            'ring-orange-500',
            'dark:ring-orange-400',
            'ring-offset-1',
            'ring-offset-white'
          )
          // If no annotation, add subtle background
          if (!annotationType) {
            classNames.push('bg-orange-100', 'dark:bg-orange-900/30')
          }
        }

        // Non-current search match: dotted underline
        if (searchMatchType && !searchCurrentType) {
          classNames.push(
            'underline',
            'decoration-dotted',
            'decoration-orange-500',
            'dark:decoration-orange-400',
            'underline-offset-2'
          )
        }

        // If this segment has an annotation, make it clickable
        if (annotationType?.highlightId) {
          const highlight = highlightMap.get(annotationType.highlightId)
          return (
            <span
              key={`highlight-${annotationType.highlightId}-${index}`}
              className={classNames.join(' ')}
              onClick={(e) => {
                e.stopPropagation()
                if (highlight && onHighlightClick) {
                  onHighlightClick(highlight)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (highlight && onHighlightClick) {
                    onHighlightClick(highlight)
                  }
                }
              }}
              role="button"
              tabIndex={0}
              data-highlight-id={annotationType.highlightId}
            >
              {segment.text}
            </span>
          )
        }

        // Non-annotation segment (may still have search styling)
        if (searchCurrentType || searchMatchType) {
          return (
            <span
              key={`search-${index}-${segment.text.length}`}
              className={classNames.join(' ')}
              data-search-match="true"
            >
              {segment.text}
            </span>
          )
        }

        // Plain text segment
        return <span key={`text-${index}-${segment.text.length}`}>{segment.text}</span>
      })}
    </span>
  )
}
