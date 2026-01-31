import { useCallback, useEffect, useState } from 'react'

interface SelectionRange {
  startOffset: number
  endOffset: number
  text: string
  contextBefore: string
  contextAfter: string
  rect: DOMRect
}

interface UseTextSelectionOptions {
  containerRef: React.RefObject<HTMLElement | null>
  chunkText: string
  enabled?: boolean
}

interface UseTextSelectionResult {
  selection: SelectionRange | null
  clearSelection: () => void
}

/**
 * Calculate text offsets relative to raw chunk text, not DOM
 */
function calculateOffsetsInChunkText(
  selection: Selection,
  container: HTMLElement,
  chunkText: string
): { startOffset: number; endOffset: number } | null {
  const range = selection.getRangeAt(0)

  // Get all text nodes in the container in order
  const textNodes: Text[] = []
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode() as Text | null
  while (node !== null) {
    textNodes.push(node)
    node = walker.nextNode() as Text | null
  }

  // Find the start offset
  let startOffset = 0
  let foundStart = false
  for (const textNode of textNodes) {
    if (textNode === range.startContainer) {
      startOffset += range.startOffset
      foundStart = true
      break
    }
    startOffset += textNode.textContent?.length ?? 0
  }

  if (!foundStart) return null

  // Find the end offset
  let endOffset = 0
  let foundEnd = false
  for (const textNode of textNodes) {
    if (textNode === range.endContainer) {
      endOffset += range.endOffset
      foundEnd = true
      break
    }
    endOffset += textNode.textContent?.length ?? 0
  }

  if (!foundEnd) return null

  // Validate offsets are within chunk text bounds
  if (startOffset < 0 || endOffset > chunkText.length || startOffset >= endOffset) {
    return null
  }

  return { startOffset, endOffset }
}

/**
 * Hook for handling text selection within a chunk
 * Returns selection info with offsets relative to the raw chunk text
 */
export function useTextSelection({
  containerRef,
  chunkText,
  enabled = true,
}: UseTextSelectionOptions): UseTextSelectionResult {
  const [selection, setSelection] = useState<SelectionRange | null>(null)

  const clearSelection = useCallback(() => {
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }, [])

  useEffect(() => {
    if (!enabled) return

    const handleSelectionChange = () => {
      const sel = window.getSelection()

      // No selection
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setSelection(null)
        return
      }

      const container = containerRef.current
      if (!container) {
        setSelection(null)
        return
      }

      // Check if selection is within our container
      const range = sel.getRangeAt(0)
      if (!container.contains(range.commonAncestorContainer)) {
        setSelection(null)
        return
      }

      // Get selected text
      const text = sel.toString().trim()
      if (!text) {
        setSelection(null)
        return
      }

      // Calculate offsets relative to chunk text
      const offsets = calculateOffsetsInChunkText(sel, container, chunkText)
      if (!offsets) {
        setSelection(null)
        return
      }

      // Get position for popover
      const rect = range.getBoundingClientRect()

      // Extract context before and after
      const contextBefore = chunkText.slice(
        Math.max(0, offsets.startOffset - 30),
        offsets.startOffset
      )
      const contextAfter = chunkText.slice(offsets.endOffset, offsets.endOffset + 30)

      setSelection({
        startOffset: offsets.startOffset,
        endOffset: offsets.endOffset,
        text,
        contextBefore,
        contextAfter,
        rect,
      })
    }

    // Debounce selection changes to avoid rapid updates
    let timeoutId: ReturnType<typeof setTimeout>
    const debouncedHandler = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(handleSelectionChange, 100)
    }

    document.addEventListener('selectionchange', debouncedHandler)

    return () => {
      document.removeEventListener('selectionchange', debouncedHandler)
      clearTimeout(timeoutId)
    }
  }, [enabled, containerRef, chunkText])

  return { selection, clearSelection }
}
