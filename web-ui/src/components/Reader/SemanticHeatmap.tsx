import { Fragment, useMemo } from 'react'
import type { KeyphraseConnection } from '../../hooks/useSemanticHeatmap'

interface SemanticHeatmapProps {
  /** Original text to render */
  text: string
  /** Keyphrase connections with positions */
  connections: KeyphraseConnection[]
  /** Callback when a connection is clicked */
  onConnectionClick?: (phrase: string) => void
}

interface TextSegment {
  text: string
  start: number
  end: number
  connection?: KeyphraseConnection
}

/**
 * Get underline intensity class based on document count
 */
function getUnderlineIntensity(docCount: number): string {
  if (docCount >= 5) return 'decoration-purple-500/80 decoration-2'
  if (docCount >= 3) return 'decoration-purple-400/60 decoration-[1.5px]'
  if (docCount >= 2) return 'decoration-purple-300/50 decoration-1'
  return 'decoration-purple-200/40 decoration-1'
}

/**
 * Semantic heatmap renderer
 * Highlights keyphrases with underlines indicating vault connectivity
 */
export function SemanticHeatmap({
  text,
  connections,
  onConnectionClick,
}: SemanticHeatmapProps) {
  // Build a map of all highlighted positions
  const segments = useMemo(() => {
    if (connections.length === 0) {
      return [{ text, start: 0, end: text.length }]
    }

    // Flatten all positions with their connections
    const positions: Array<{
      start: number
      end: number
      connection: KeyphraseConnection
    }> = []

    for (const conn of connections) {
      for (const pos of conn.positions) {
        positions.push({ ...pos, connection: conn })
      }
    }

    // Sort by start position
    positions.sort((a, b) => a.start - b.start)

    // Build non-overlapping segments
    const result: TextSegment[] = []
    let lastEnd = 0

    for (const pos of positions) {
      // Skip if overlapping with previous
      if (pos.start < lastEnd) continue

      // Add plain text before this position
      if (pos.start > lastEnd) {
        result.push({
          text: text.slice(lastEnd, pos.start),
          start: lastEnd,
          end: pos.start,
        })
      }

      // Add highlighted segment
      result.push({
        text: text.slice(pos.start, pos.end),
        start: pos.start,
        end: pos.end,
        connection: pos.connection,
      })

      lastEnd = pos.end
    }

    // Add remaining text
    if (lastEnd < text.length) {
      result.push({
        text: text.slice(lastEnd),
        start: lastEnd,
        end: text.length,
      })
    }

    return result
  }, [text, connections])

  return (
    <span className="whitespace-pre-wrap">
      {segments.map((segment, idx) => {
        if (!segment.connection) {
          return <Fragment key={idx}>{segment.text}</Fragment>
        }

        const intensity = getUnderlineIntensity(segment.connection.documentCount)

        return (
          <span
            key={idx}
            className={`underline underline-offset-2 ${intensity} cursor-help transition-all hover:decoration-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20`}
            title={`Connected to ${segment.connection.documentCount} document${segment.connection.documentCount > 1 ? 's' : ''}`}
            onClick={() => onConnectionClick?.(segment.connection!.phrase)}
          >
            {segment.text}
          </span>
        )
      })}
    </span>
  )
}

/**
 * Stats badge showing heatmap analysis progress
 */
export function HeatmapStats({
  isLoading,
  connectionCount,
}: {
  isLoading: boolean
  connectionCount: number
}) {
  if (isLoading) {
    return (
      <span className="text-xs text-purple-500 dark:text-purple-400 animate-pulse">
        Analyzing...
      </span>
    )
  }

  if (connectionCount === 0) {
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">
        No connections found
      </span>
    )
  }

  return (
    <span className="text-xs text-purple-600 dark:text-purple-400">
      {connectionCount} connected term{connectionCount > 1 ? 's' : ''}
    </span>
  )
}
