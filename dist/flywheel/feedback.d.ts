/**
 * Types of user feedback events
 */
export type FeedbackEventType = 'pin' | 'unpin' | 'dismiss_inferred' | 'click_related';
/**
 * Reference to a chunk (using fingerprint for resilience)
 */
export interface ChunkRef {
    filePath: string;
    chunkIndex: number;
    fingerprint?: string;
}
/**
 * A feedback event from user interaction
 */
interface FeedbackEvent {
    type: FeedbackEventType;
    source: ChunkRef;
    target: ChunkRef;
    timestamp: Date;
}
/**
 * Search result with score
 */
interface ScoredResult {
    filePath: string;
    chunkIndex: number;
    fingerprint?: string;
    score: number;
}
/**
 * Flywheel configuration
 */
interface FlywheelConfig {
    /** Boost multiplier for pinned targets (default: 1.3) */
    pinBoost: number;
    /** Boost multiplier for co-pinned patterns (default: 1.15) */
    coPinBoost: number;
    /** Penalty multiplier for dismissed suggestions (default: 0.5) */
    dismissPenalty: number;
    /** Maximum age for feedback events in ms (default: 30 days) */
    maxEventAge: number;
}
/**
 * FeedbackStore: In-memory store for feedback events
 * Can be persisted to disk for long-term learning
 */
export declare class FeedbackStore {
    private events;
    private config;
    private pinnedPairs;
    private dismissedPairs;
    private coPinnedWith;
    constructor(config?: Partial<FlywheelConfig>);
    /**
     * Record a feedback event
     */
    recordEvent(event: FeedbackEvent): void;
    /**
     * Update index structures based on event
     */
    private updateIndices;
    /**
     * Check if a source-target pair is pinned
     */
    isPinned(source: ChunkRef, target: ChunkRef): boolean;
    /**
     * Check if a source-target pair was dismissed
     */
    wasDismissed(source: ChunkRef, target: ChunkRef): boolean;
    /**
     * Check if target matches a co-pinned pattern with source
     */
    matchesCoPinnedPattern(source: ChunkRef, target: ChunkRef): boolean;
    /**
     * Re-rank results based on feedback
     */
    rerankResults<T extends ScoredResult>(results: T[], source: ChunkRef): T[];
    /**
     * Clean up old events
     */
    pruneOldEvents(): number;
    /**
     * Export events for persistence
     */
    exportEvents(): FeedbackEvent[];
    /**
     * Import events (e.g., from disk)
     * Validates timestamps and skips invalid events
     */
    importEvents(events: FeedbackEvent[]): void;
    /**
     * Get statistics about feedback store
     */
    getStats(): {
        eventCount: number;
        pinnedPairs: number;
        dismissedPairs: number;
    };
    /**
     * Save feedback events to disk
     * @param dbPath - Path to the database directory
     */
    saveToDisk(dbPath: string): Promise<void>;
    /**
     * Load feedback events from disk
     * @param dbPath - Path to the database directory
     */
    loadFromDisk(dbPath: string): Promise<void>;
}
/**
 * Get the global feedback store
 */
export declare function getFeedbackStore(): FeedbackStore;
export {};
//# sourceMappingURL=feedback.d.ts.map