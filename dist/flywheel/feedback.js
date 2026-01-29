"use strict";
// Curatorial Flywheel v1: Feedback-based Re-ranking
// Tracks user actions (pins, dismissals) to improve retrieval quality
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackStore = void 0;
exports.getFeedbackStore = getFeedbackStore;
exports.initializeFeedbackStore = initializeFeedbackStore;
const DEFAULT_CONFIG = {
    pinBoost: 1.3,
    coPinBoost: 1.15,
    dismissPenalty: 0.5,
    maxEventAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};
/**
 * Create a unique key for a chunk reference
 */
function chunkKey(ref) {
    // Prefer fingerprint for resilient matching
    if (ref.fingerprint) {
        return `fp:${ref.fingerprint}`;
    }
    return `${ref.filePath}:${ref.chunkIndex}`;
}
/**
 * FeedbackStore: In-memory store for feedback events
 * Can be persisted to disk for long-term learning
 */
class FeedbackStore {
    constructor(config = {}) {
        this.events = [];
        // Index structures for fast lookup
        this.pinnedPairs = new Map(); // source -> targets
        this.dismissedPairs = new Map(); // source -> targets
        this.coPinnedWith = new Map(); // target -> co-targets -> count
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Record a feedback event
     */
    recordEvent(event) {
        this.events.push(event);
        this.updateIndices(event);
    }
    /**
     * Update index structures based on event
     */
    updateIndices(event) {
        const sourceKey = chunkKey(event.source);
        const targetKey = chunkKey(event.target);
        switch (event.type) {
            case 'pin': {
                // Track pinned pairs
                if (!this.pinnedPairs.has(sourceKey)) {
                    this.pinnedPairs.set(sourceKey, new Set());
                }
                this.pinnedPairs.get(sourceKey).add(targetKey);
                // Update co-pinned patterns
                const existingPins = this.pinnedPairs.get(sourceKey);
                for (const existingTarget of existingPins) {
                    if (existingTarget !== targetKey) {
                        // Increment co-pin count
                        if (!this.coPinnedWith.has(existingTarget)) {
                            this.coPinnedWith.set(existingTarget, new Map());
                        }
                        const coMap = this.coPinnedWith.get(existingTarget);
                        coMap.set(targetKey, (coMap.get(targetKey) || 0) + 1);
                        if (!this.coPinnedWith.has(targetKey)) {
                            this.coPinnedWith.set(targetKey, new Map());
                        }
                        const reverseCoMap = this.coPinnedWith.get(targetKey);
                        reverseCoMap.set(existingTarget, (reverseCoMap.get(existingTarget) || 0) + 1);
                    }
                }
                break;
            }
            case 'unpin': {
                // Remove from pinned pairs
                this.pinnedPairs.get(sourceKey)?.delete(targetKey);
                break;
            }
            case 'dismiss_inferred': {
                // Track dismissed pairs
                if (!this.dismissedPairs.has(sourceKey)) {
                    this.dismissedPairs.set(sourceKey, new Set());
                }
                this.dismissedPairs.get(sourceKey).add(targetKey);
                break;
            }
            // click_related is tracked but doesn't affect indices yet
        }
    }
    /**
     * Check if a source-target pair is pinned
     */
    isPinned(source, target) {
        const sourceKey = chunkKey(source);
        const targetKey = chunkKey(target);
        return this.pinnedPairs.get(sourceKey)?.has(targetKey) ?? false;
    }
    /**
     * Check if a source-target pair was dismissed
     */
    wasDismissed(source, target) {
        const sourceKey = chunkKey(source);
        const targetKey = chunkKey(target);
        return this.dismissedPairs.get(sourceKey)?.has(targetKey) ?? false;
    }
    /**
     * Check if target matches a co-pinned pattern with source
     */
    matchesCoPinnedPattern(source, target) {
        // Get all targets pinned with source
        const sourceKey = chunkKey(source);
        const sourcePins = this.pinnedPairs.get(sourceKey);
        if (!sourcePins || sourcePins.size === 0)
            return false;
        // Check if target is frequently co-pinned with any of source's pins
        const targetKey = chunkKey(target);
        for (const pinnedTarget of sourcePins) {
            const coPins = this.coPinnedWith.get(pinnedTarget);
            if (coPins?.has(targetKey) && (coPins.get(targetKey) || 0) >= 2) {
                return true;
            }
        }
        return false;
    }
    /**
     * Re-rank results based on feedback
     */
    rerankResults(results, source) {
        const sourceRef = source;
        const boostedResults = results.map((result) => {
            const targetRef = {
                filePath: result.filePath,
                chunkIndex: result.chunkIndex,
                ...(result.fingerprint && { fingerprint: result.fingerprint }),
            };
            let boost = 1.0;
            // Boost pinned targets
            if (this.isPinned(sourceRef, targetRef)) {
                boost *= this.config.pinBoost;
            }
            // Boost co-pinned patterns
            if (this.matchesCoPinnedPattern(sourceRef, targetRef)) {
                boost *= this.config.coPinBoost;
            }
            // Penalize dismissed suggestions
            if (this.wasDismissed(sourceRef, targetRef)) {
                boost *= this.config.dismissPenalty;
            }
            // Lower score = more similar, so divide by boost
            return {
                ...result,
                score: result.score / boost,
            };
        });
        // Sort by boosted score (ascending = better)
        return boostedResults.sort((a, b) => a.score - b.score);
    }
    /**
     * Clean up old events
     */
    pruneOldEvents() {
        const cutoff = Date.now() - this.config.maxEventAge;
        const before = this.events.length;
        this.events = this.events.filter((e) => e.timestamp.getTime() > cutoff);
        return before - this.events.length;
    }
    /**
     * Export events for persistence
     */
    exportEvents() {
        return [...this.events];
    }
    /**
     * Import events (e.g., from disk)
     */
    importEvents(events) {
        for (const event of events) {
            // Ensure timestamp is a Date object
            const e = {
                ...event,
                timestamp: new Date(event.timestamp),
            };
            this.events.push(e);
            this.updateIndices(e);
        }
    }
    /**
     * Get statistics about feedback store
     */
    getStats() {
        let pinnedCount = 0;
        for (const targets of this.pinnedPairs.values()) {
            pinnedCount += targets.size;
        }
        let dismissedCount = 0;
        for (const targets of this.dismissedPairs.values()) {
            dismissedCount += targets.size;
        }
        return {
            eventCount: this.events.length,
            pinnedPairs: pinnedCount,
            dismissedPairs: dismissedCount,
        };
    }
}
exports.FeedbackStore = FeedbackStore;
// Global feedback store instance
let globalFeedbackStore = null;
/**
 * Get or create the global feedback store
 */
function getFeedbackStore() {
    if (!globalFeedbackStore) {
        globalFeedbackStore = new FeedbackStore();
    }
    return globalFeedbackStore;
}
/**
 * Initialize feedback store with saved events
 */
function initializeFeedbackStore(events) {
    globalFeedbackStore = new FeedbackStore();
    globalFeedbackStore.importEvents(events);
}
//# sourceMappingURL=feedback.js.map