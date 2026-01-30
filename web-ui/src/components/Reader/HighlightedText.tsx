import { useMemo } from 'react'
import type { Highlight, HighlightColor } from '../../contexts/AnnotationsContext'

interface HighlightedTextProps {
  text: string
  highlights: Highlight[]
  onHighlightClick?: (highlight: Highlight) => void
}

interface TextSegment {
  text: string
  highlight: Highlight | null
}

const COLOR_CLASSES: Record<HighlightColor, string> = {
  yellow: 'bg-yellow-200 dark:bg-yellow-800/60 hover:bg-yellow-300 dark:hover:bg-yellow-700/60',
  green: 'bg-green-200 dark:bg-green-800/60 hover:bg-green-300 dark:hover:bg-green-700/60',
  blue: 'bg-blue-200 dark:bg-blue-800/60 hover:bg-blue-300 dark:hover:bg-blue-700/60',
  pink: 'bg-pink-200 dark:bg-pink-800/60 hover:bg-pink-300 dark:hover:bg-pink-700/60',
  purple: 'bg-purple-200 dark:bg-purple-800/60 hover:bg-purple-300 dark:hover:bg-purple-700/60',
}

/**
 * Split text into segments based on highlight ranges
 * Handles non-overlapping highlights only (first highlight wins for overlaps)
 */
function splitTextByHighlights(text: string, highlights: Highlight[]): TextSegment[] {
  if (highlights.length === 0) {
    return [{ text, highlight: null }]
  }

  // Sort highlights by start offset
  const sortedHighlights = [...highlights].sort((a, b) => a.range.startOffset - b.range.startOffset)

  const segments: TextSegment[] = []
  let currentOffset = 0

  for (const highlight of sortedHighlights) {
    const { startOffset, endOffset } = highlight.range

    // Skip if this highlight overlaps with already processed text (first wins)
    if (startOffset < currentOffset) {
      continue
    }

    // Skip if highlight is outside text bounds
    if (startOffset >= text.length) {
      continue
    }

    // Add text before this highlight
    if (startOffset > currentOffset) {
      segments.push({
        text: text.slice(currentOffset, startOffset),
        highlight: null,
      })
    }

    // Add highlighted text
    const clampedEnd = Math.min(endOffset, text.length)
    segments.push({
      text: text.slice(startOffset, clampedEnd),
      highlight,
    })

    currentOffset = clampedEnd
  }

  // Add remaining text after last highlight
  if (currentOffset < text.length) {
    segments.push({
      text: text.slice(currentOffset),
      highlight: null,
    })
  }

  return segments
}

/**
 * Renders text with inline highlights
 * Highlights are clickable to open annotation panel
 */
export function HighlightedText({ text, highlights, onHighlightClick }: HighlightedTextProps) {
  const segments = useMemo(() => splitTextByHighlights(text, highlights), [text, highlights])

  // Track character offset for stable keys on non-highlighted segments
  let charOffset = 0

  return (
    <span className="whitespace-pre-wrap">
      {segments.map((segment) => {
        const segmentStart = charOffset
        charOffset += segment.text.length

        if (!segment.highlight) {
          return <span key={`text-${segmentStart}`}>{segment.text}</span>
        }

        const colorClass = COLOR_CLASSES[segment.highlight.color]

        return (
          <mark
            key={segment.highlight.id}
            className={`${colorClass} cursor-pointer rounded px-0.5 transition-colors`}
            onClick={(e) => {
              e.stopPropagation()
              onHighlightClick?.(segment.highlight!)
            }}
            data-highlight-id={segment.highlight.id}
          >
            {segment.text}
          </mark>
        )
      })}
    </span>
  )
}
