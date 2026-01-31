"use strict";
// Explainability utilities for chunk similarity
// Provides keyword/phrase extraction without LLM dependencies
Object.defineProperty(exports, "__esModule", { value: true });
exports.explainChunkSimilarity = explainChunkSimilarity;
// Common English stopwords to filter out
const STOPWORDS = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'by',
    'for',
    'from',
    'has',
    'have',
    'he',
    'in',
    'is',
    'it',
    'its',
    'of',
    'on',
    'or',
    'that',
    'the',
    'to',
    'was',
    'were',
    'will',
    'with',
    'this',
    'but',
    'they',
    'had',
    'what',
    'when',
    'where',
    'who',
    'which',
    'can',
    'could',
    'would',
    'should',
    'their',
    'there',
    'been',
    'being',
    'do',
    'does',
    'did',
    'doing',
    'these',
    'those',
    'then',
    'than',
    'so',
    'if',
    'not',
    'no',
    'nor',
    'only',
    'own',
    'same',
    'such',
    'too',
    'very',
    'just',
    'also',
    'any',
    'each',
    'few',
    'more',
    'most',
    'other',
    'some',
    'all',
    'both',
    'into',
    'out',
    'up',
    'down',
    'about',
    'after',
    'before',
    'over',
    'under',
    'again',
    'further',
    'once',
    'here',
    'why',
    'how',
    'our',
    'your',
    'my',
    'his',
    'her',
    'am',
    'him',
    'me',
    'we',
    'you',
    'she',
    'us',
    'them',
]);
/**
 * Tokenize text into words, filtering out stopwords and short words
 */
function tokenize(text, minLength = 3) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length >= minLength && !STOPWORDS.has(word));
}
/**
 * Extract word frequency map from text
 */
function getWordFrequency(text) {
    const words = tokenize(text);
    const freq = new Map();
    for (const word of words) {
        freq.set(word, (freq.get(word) || 0) + 1);
    }
    return freq;
}
/**
 * Generate n-grams from text
 */
function getNgrams(text, n) {
    const words = tokenize(text, 2);
    const ngrams = [];
    for (let i = 0; i <= words.length - n; i++) {
        ngrams.push(words.slice(i, i + n).join(' '));
    }
    return ngrams;
}
/**
 * Get n-gram frequency map
 */
function getNgramFrequency(text, n) {
    const ngrams = getNgrams(text, n);
    const freq = new Map();
    for (const ngram of ngrams) {
        freq.set(ngram, (freq.get(ngram) || 0) + 1);
    }
    return freq;
}
/**
 * Find shared keywords between two texts
 * Returns keywords sorted by combined frequency
 */
function findSharedKeywords(text1, text2, maxCount = 5) {
    const freq1 = getWordFrequency(text1);
    const freq2 = getWordFrequency(text2);
    const shared = [];
    for (const [word, count1] of freq1.entries()) {
        const count2 = freq2.get(word);
        if (count2) {
            // Score by combined frequency
            shared.push({ word, score: count1 + count2 });
        }
    }
    // Sort by score descending, then alphabetically
    shared.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));
    return shared.slice(0, maxCount).map((s) => s.word);
}
/**
 * Find shared phrases (bigrams and trigrams) between two texts
 * Returns phrases sorted by combined frequency
 */
function findSharedPhrases(text1, text2, maxCount = 3) {
    const phrases = [];
    // Check bigrams
    const bigrams1 = getNgramFrequency(text1, 2);
    const bigrams2 = getNgramFrequency(text2, 2);
    for (const [phrase, count1] of bigrams1.entries()) {
        const count2 = bigrams2.get(phrase);
        if (count2) {
            phrases.push({ phrase, score: (count1 + count2) * 2 }); // Weight bigrams
        }
    }
    // Check trigrams (higher weight)
    const trigrams1 = getNgramFrequency(text1, 3);
    const trigrams2 = getNgramFrequency(text2, 3);
    for (const [phrase, count1] of trigrams1.entries()) {
        const count2 = trigrams2.get(phrase);
        if (count2) {
            phrases.push({ phrase, score: (count1 + count2) * 3 }); // Weight trigrams higher
        }
    }
    // Sort by score descending
    phrases.sort((a, b) => b.score - a.score);
    return phrases.slice(0, maxCount).map((p) => p.phrase);
}
/**
 * Determine relationship reason based on heuristics
 * - High lexical overlap → "very_similar"
 * - Low lexical overlap + context → "related_topic"
 * - Same document → "same_doc"
 */
function determineReasonLabel(text1, text2, isSameDocument, similarityScore) {
    if (isSameDocument) {
        return 'same_doc';
    }
    // Calculate lexical overlap ratio
    const words1 = new Set(tokenize(text1));
    const words2 = new Set(tokenize(text2));
    const intersection = [...words1].filter((w) => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;
    const jaccard = union > 0 ? intersection / union : 0;
    // High similarity score (low distance) with high lexical overlap
    if (similarityScore < 0.3 && jaccard > 0.3) {
        return 'very_similar';
    }
    // Moderate similarity with some lexical overlap
    if (similarityScore < 0.5 || jaccard > 0.15) {
        return 'related_topic';
    }
    return 'loosely_related';
}
/**
 * Generate explanation for chunk relationship
 */
function explainChunkSimilarity(sourceText, targetText, isSameDocument, similarityScore) {
    return {
        sharedKeywords: findSharedKeywords(sourceText, targetText),
        sharedPhrases: findSharedPhrases(sourceText, targetText),
        reasonLabel: determineReasonLabel(sourceText, targetText, isSameDocument, similarityScore),
    };
}
//# sourceMappingURL=keywords.js.map