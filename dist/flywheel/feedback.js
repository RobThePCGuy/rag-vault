// Curatorial Flywheel v1: Feedback-based Re-ranking
// Tracks user actions (pins, dismissals) to improve retrieval quality
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { atomicWriteFile } from '../utils/file-utils.js';
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
export class FeedbackStore {
    events = [];
    config;
    // Index structures for fast lookup
    pinnedPairs = new Map(); // source -> targets
    dismissedPairs = new Map(); // source -> targets
    coPinnedWith = new Map(); // target -> co-targets -> count
    constructor(config = {}) {
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
     * Validates timestamps and skips invalid events
     */
    importEvents(events) {
        for (const event of events) {
            // Ensure timestamp is a valid Date object
            const timestamp = new Date(event.timestamp);
            if (Number.isNaN(timestamp.getTime())) {
                console.warn('FeedbackStore: Skipping event with invalid timestamp:', event);
                continue;
            }
            const e = {
                ...event,
                timestamp,
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
    /**
     * Save feedback events to disk
     * @param dbPath - Path to the database directory
     */
    async saveToDisk(dbPath) {
        const filePath = join(dbPath, 'feedback.json');
        const data = {
            version: 1,
            events: this.events.map((e) => ({
                ...e,
                timestamp: e.timestamp.toISOString(),
            })),
        };
        await atomicWriteFile(filePath, JSON.stringify(data, null, 2));
        console.error(`FeedbackStore: Saved ${this.events.length} events to ${filePath}`);
    }
    /**
     * Load feedback events from disk
     * @param dbPath - Path to the database directory
     */
    async loadFromDisk(dbPath) {
        const filePath = join(dbPath, 'feedback.json');
        try {
            const content = await readFile(filePath, 'utf-8');
            const data = JSON.parse(content);
            // Validate JSON structure before importing
            if (data.version !== 1) {
                console.warn(`FeedbackStore: Unsupported version ${data.version} in ${filePath}, starting fresh`);
                return;
            }
            if (!Array.isArray(data.events)) {
                console.warn(`FeedbackStore: Invalid format (events not an array) in ${filePath}, starting fresh`);
                return;
            }
            this.importEvents(data.events);
            console.error(`FeedbackStore: Loaded ${data.events.length} events from ${filePath}`);
        }
        catch (error) {
            const nodeError = error;
            // File doesn't exist - this is normal for new databases
            if (nodeError.code === 'ENOENT') {
                return;
            }
            // JSON parse error or other issues - log warning and start fresh
            console.warn(`FeedbackStore: Could not load from ${filePath}:`, error);
        }
    }
}
// Global feedback store instance (eager initialization to prevent race conditions)
// Using eager init instead of lazy init avoids the check-then-act race where
// concurrent requests could create separate instances and lose feedback events.
const globalFeedbackStore = new FeedbackStore();
/**
 * Get the global feedback store
 */
export function getFeedbackStore() {
    return globalFeedbackStore;
}
//# sourceMappingURL=feedback.js.map