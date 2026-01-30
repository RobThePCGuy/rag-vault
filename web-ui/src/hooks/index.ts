export { usePreferences } from '../contexts/PreferencesContext'
export { useToast } from '../contexts/ToastContext'
export {
  useAddAllowedRoot,
  useAllowedRoots,
  useAvailableModels,
  useBrowseDirectory,
  useCreateDatabase,
  useCurrentConfig,
  useDeleteDatabase,
  useExportConfig,
  useHybridWeight,
  useImportConfig,
  useRecentDatabases,
  useRemoveAllowedRoot,
  useScanDatabases,
  useSetHybridWeight,
  useSwitchDatabase,
} from './useConfig'
export { useFiles } from './useFiles'
export { useLocalStorage } from './useLocalStorage'
export { useSearch } from './useSearch'
export { useStatus } from './useStatus'
export { useUpload } from './useUpload'

// Reader hooks
export { useDocumentChunks } from './useDocumentChunks'
export { useViewportChunks } from './useViewportChunks'
export { useDebouncedRelated } from './useDebouncedRelated'
export { useRelatedChunks } from './useRelatedChunks'

// Phase 2: Links and Trails
export { usePins } from './usePins'
export { useBacklinks } from './useBacklinks'
export { useTrail } from './useTrail'

// Phase 3: Reader Enhancements
export { useKeyboardNav } from './useKeyboardNav'
export { useReadingProgress } from './useReadingProgress'
export { useTableOfContents } from './useTableOfContents'
export type { TocEntry } from './useTableOfContents'

// Phase 5: Annotations & Highlights
export { useAnnotationsForChunk, useAnnotationsStore } from './useAnnotations'
export { useTextSelection } from './useTextSelection'

// Phase 4: Knowledge Graph
export { useGraphData } from './useGraphData'

// Phase 6: Search
export { useDocumentSearch } from './useDocumentSearch'
export type { SearchState } from './useDocumentSearch'

// Phase 7: Bookmarks, Tags, Collections
export { useBookmarks } from './useBookmarks'
export { useTagsForTarget, useTagsForChunk, useTagsForDocument, useTagsForHighlight } from './useTags'
export { useCollectionsForDocument, useCollectionManagement } from './useCollections'

// Phase 9: Reader UI Enhancements
export { useDocumentAnnotations, type AnnotationSummaryItem } from './useDocumentAnnotations'
export { useSkimMode, type SkimSection } from './useSkimMode'
export { useChunkComparison, computeWordDiff, type ComparisonChunk, type DiffSegment } from './useChunkComparison'

// Phase 10: Graph Evolution
export { useGraphStatePersistence } from './useGraphStatePersistence'
export { useGraphClustering, calculateClusterBounds, getClusterColorForNode, type DocumentCluster } from './useGraphClustering'

// Phase 11: Cross-Document Intelligence
export { useInferredBacklinks, type InferredBacklink } from './useInferredBacklinks'
export { useCrossDocumentRelated, type CrossDocumentGroup } from './useCrossDocumentRelated'
export { useReadingStats, formatReadingTime } from './useReadingStats'
export { useDiscoveryMode, getSuggestionReasonText, type DiscoverySuggestion, type DiscoveryStep } from './useDiscoveryMode'

// Zettelkasten Reader
export { useAutoSelectionSearch } from './useAutoSelectionSearch'
export { useSemanticHeatmap, type KeyphraseConnection } from './useSemanticHeatmap'
