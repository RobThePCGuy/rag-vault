"use strict";
// Advanced Query Syntax Parser
// Supports: phrases, boolean operators, field filters, exclusions
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseQuery = parseQuery;
exports.toSemanticQuery = toSemanticQuery;
exports.toFtsQuery = toFtsQuery;
exports.shouldExclude = shouldExclude;
exports.matchesFilters = matchesFilters;
/**
 * Tokenize a query string into tokens
 */
function tokenize(query) {
    const tokens = [];
    let i = 0;
    while (i < query.length) {
        // Skip whitespace
        if (/\s/.test(query[i] ?? '')) {
            i++;
            continue;
        }
        // Handle quoted phrases
        if (query[i] === '"') {
            const start = i + 1;
            i++;
            while (i < query.length && query[i] !== '"') {
                i++;
            }
            const phrase = query.slice(start, i);
            if (phrase.length > 0) {
                tokens.push({ type: 'PHRASE', value: phrase });
            }
            i++; // Skip closing quote
            continue;
        }
        // Handle parentheses
        if (query[i] === '(') {
            tokens.push({ type: 'LPAREN', value: '(' });
            i++;
            continue;
        }
        if (query[i] === ')') {
            tokens.push({ type: 'RPAREN', value: ')' });
            i++;
            continue;
        }
        // Handle exclusion prefix
        if (query[i] === '-') {
            const start = i + 1;
            i++;
            // Read the term after -
            while (i < query.length && !/[\s()"]/.test(query[i] ?? '')) {
                i++;
            }
            const term = query.slice(start, i);
            if (term.length > 0) {
                tokens.push({ type: 'EXCLUDE', value: term });
            }
            continue;
        }
        // Read a word (including potential field:value)
        const start = i;
        while (i < query.length && !/[\s()"]/.test(query[i] ?? '')) {
            i++;
        }
        const word = query.slice(start, i);
        if (word.length === 0)
            continue;
        // Check for boolean operators (case-insensitive)
        const upperWord = word.toUpperCase();
        if (upperWord === 'AND') {
            tokens.push({ type: 'AND', value: 'AND' });
            continue;
        }
        if (upperWord === 'OR') {
            tokens.push({ type: 'OR', value: 'OR' });
            continue;
        }
        // Check for field:value filter
        const colonIdx = word.indexOf(':');
        if (colonIdx > 0 && colonIdx < word.length - 1) {
            const field = word.slice(0, colonIdx);
            const value = word.slice(colonIdx + 1);
            tokens.push({ type: 'FILTER', value, field });
            continue;
        }
        // Regular term
        tokens.push({ type: 'TERM', value: word });
    }
    return tokens;
}
/**
 * Parse a query string into structured query parts
 *
 * Syntax:
 * - "exact phrase" → Match phrase exactly
 * - field:value → Filter by metadata field
 * - -term → Exclude term from results
 * - term1 AND term2 → Both terms required (default)
 * - term1 OR term2 → Either term matches
 * - (group) → Group expressions (future: for complex boolean)
 *
 * @param query - Raw query string
 * @returns Parsed query structure
 */
function parseQuery(query) {
    const result = {
        semanticTerms: [],
        phrases: [],
        filters: [],
        excludeTerms: [],
        booleanOp: 'AND',
        originalQuery: query,
    };
    if (!query || query.trim().length === 0) {
        return result;
    }
    const tokens = tokenize(query);
    // Track if we've seen OR (switches to OR mode)
    let hasOr = false;
    for (const token of tokens) {
        switch (token.type) {
            case 'PHRASE':
                result.phrases.push(token.value);
                // Also add phrase words to semantic terms for vector search
                result.semanticTerms.push(token.value);
                break;
            case 'FILTER':
                if (token.field) {
                    result.filters.push({ field: token.field, value: token.value });
                }
                break;
            case 'EXCLUDE':
                result.excludeTerms.push(token.value);
                break;
            case 'OR':
                hasOr = true;
                break;
            case 'AND':
                // AND is default, no action needed
                break;
            case 'TERM':
                result.semanticTerms.push(token.value);
                break;
            case 'LPAREN':
            case 'RPAREN':
                // Parentheses are captured for future complex boolean support
                // Currently ignored in favor of simple AND/OR detection
                break;
        }
    }
    // Set boolean mode based on presence of OR
    if (hasOr) {
        result.booleanOp = 'OR';
    }
    return result;
}
/**
 * Convert parsed query to a semantic search query string
 * Joins semantic terms and phrases for embedding
 */
function toSemanticQuery(parsed) {
    // Combine semantic terms for vector search
    const terms = [...parsed.semanticTerms];
    // Filter out excluded terms from semantic query
    const filtered = terms.filter((term) => {
        const lowerTerm = term.toLowerCase();
        return !parsed.excludeTerms.some((ex) => lowerTerm.includes(ex.toLowerCase()));
    });
    return filtered.join(' ');
}
/**
 * Convert parsed query to a full-text search query string
 * Uses FTS-compatible syntax for phrase matching
 */
function toFtsQuery(parsed) {
    const parts = [];
    // Add phrases with quotes for exact match
    for (const phrase of parsed.phrases) {
        parts.push(`"${phrase}"`);
    }
    // Add regular terms
    for (const term of parsed.semanticTerms) {
        // Skip if term is already in a phrase
        if (!parsed.phrases.some((p) => p.includes(term))) {
            parts.push(term);
        }
    }
    return parts.join(' ');
}
/**
 * Check if a result should be excluded based on exclude terms
 */
function shouldExclude(text, excludeTerms) {
    const lowerText = text.toLowerCase();
    return excludeTerms.some((term) => lowerText.includes(term.toLowerCase()));
}
/**
 * Check if a result matches the metadata filters
 */
function matchesFilters(metadata, filters) {
    if (filters.length === 0)
        return true;
    if (!metadata)
        return false;
    return filters.every((filter) => {
        const value = metadata[filter.field];
        if (value === undefined)
            return false;
        return value.toLowerCase().includes(filter.value.toLowerCase());
    });
}
//# sourceMappingURL=parser.js.map