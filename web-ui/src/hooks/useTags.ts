import { useCallback, useMemo } from 'react'
import { useTags as useTagsContext, type Tag, type TagColor, type TaggedItem } from '../contexts/TagsContext'

// ============================================
// Types
// ============================================

interface UseTagsForTargetOptions {
  targetType: TaggedItem['targetType']
  targetKey: string
}

interface UseTagsForTargetResult {
  // Tags applied to this target
  appliedTags: Tag[]

  // Actions
  applyTag: (tagId: string) => void
  removeTag: (tagId: string) => void
  toggleTag: (tagId: string) => void
  createAndApplyTag: (name: string, color: TagColor) => Tag

  // Queries
  isTagApplied: (tagId: string) => boolean

  // All tags for selection
  allTags: Tag[]
  suggestions: Tag[]
}

// ============================================
// Hook for target-specific tag operations
// ============================================

export function useTagsForTarget({
  targetType,
  targetKey,
}: UseTagsForTargetOptions): UseTagsForTargetResult {
  const {
    tags: allTags,
    createTag,
    addTag,
    removeTagFromTarget,
    getTagsForTarget,
    isTagged,
    getTagSuggestions,
  } = useTagsContext()

  // Get tags applied to this target
  const appliedTags = useMemo(
    () => getTagsForTarget(targetType, targetKey),
    [getTagsForTarget, targetType, targetKey]
  )

  // Get tag suggestions
  const suggestions = useMemo(
    () => getTagSuggestions(10),
    [getTagSuggestions]
  )

  // Apply a tag to this target
  const applyTag = useCallback(
    (tagId: string) => {
      if (!isTagged(tagId, targetType, targetKey)) {
        addTag(tagId, targetType, targetKey)
      }
    },
    [addTag, isTagged, targetType, targetKey]
  )

  // Remove a tag from this target
  const removeTag = useCallback(
    (tagId: string) => {
      removeTagFromTarget(tagId, targetType, targetKey)
    },
    [removeTagFromTarget, targetType, targetKey]
  )

  // Toggle a tag on this target
  const toggleTag = useCallback(
    (tagId: string) => {
      if (isTagged(tagId, targetType, targetKey)) {
        removeTagFromTarget(tagId, targetType, targetKey)
      } else {
        addTag(tagId, targetType, targetKey)
      }
    },
    [addTag, removeTagFromTarget, isTagged, targetType, targetKey]
  )

  // Create a new tag and apply it
  const createAndApplyTag = useCallback(
    (name: string, color: TagColor): Tag => {
      const tag = createTag(name, color)
      addTag(tag.id, targetType, targetKey)
      return tag
    },
    [createTag, addTag, targetType, targetKey]
  )

  // Check if a tag is applied
  const isTagApplied = useCallback(
    (tagId: string): boolean => {
      return isTagged(tagId, targetType, targetKey)
    },
    [isTagged, targetType, targetKey]
  )

  return {
    appliedTags,
    applyTag,
    removeTag,
    toggleTag,
    createAndApplyTag,
    isTagApplied,
    allTags,
    suggestions,
  }
}

// ============================================
// Convenience hooks for specific target types
// ============================================

export function useTagsForChunk(filePath: string, chunkIndex: number) {
  return useTagsForTarget({
    targetType: 'chunk',
    targetKey: `${filePath}::${chunkIndex}`,
  })
}

export function useTagsForDocument(filePath: string) {
  return useTagsForTarget({
    targetType: 'document',
    targetKey: filePath,
  })
}

export function useTagsForHighlight(highlightId: string) {
  return useTagsForTarget({
    targetType: 'highlight',
    targetKey: highlightId,
  })
}
