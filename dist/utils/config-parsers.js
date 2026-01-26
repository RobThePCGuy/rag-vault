"use strict";
// Shared configuration parsing utilities
// Used by both MCP server (src/index.ts) and Web server (src/web/index.ts)
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGroupingMode = parseGroupingMode;
exports.parseMaxDistance = parseMaxDistance;
exports.parseHybridWeight = parseHybridWeight;
/**
 * Parse grouping mode from environment variable
 */
function parseGroupingMode(value) {
    if (!value)
        return undefined;
    const normalized = value.toLowerCase().trim();
    if (normalized === 'similar' || normalized === 'related') {
        return normalized;
    }
    console.error(`Invalid RAG_GROUPING value: "${value}". Expected "similar" or "related". Ignoring.`);
    return undefined;
}
/**
 * Parse max distance from environment variable
 */
function parseMaxDistance(value) {
    if (!value)
        return undefined;
    const parsed = Number.parseFloat(value);
    if (Number.isNaN(parsed) || parsed <= 0) {
        console.error(`Invalid RAG_MAX_DISTANCE value: "${value}". Expected positive number. Ignoring.`);
        return undefined;
    }
    return parsed;
}
/**
 * Parse hybrid weight from environment variable
 */
function parseHybridWeight(value) {
    if (!value)
        return undefined;
    const parsed = Number.parseFloat(value);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
        console.error(`Invalid RAG_HYBRID_WEIGHT value: "${value}". Expected 0.0-1.0. Using default (0.6).`);
        return undefined;
    }
    return parsed;
}
//# sourceMappingURL=config-parsers.js.map