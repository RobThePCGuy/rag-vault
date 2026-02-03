import { describe, expect, it } from 'vitest'
import {
  matchesFilters,
  parseQuery,
  shouldExclude,
  toFtsQuery,
  toSemanticQuery,
} from '../parser.js'

describe('Query Parser', () => {
  describe('parseQuery', () => {
    it('parses simple terms', () => {
      const result = parseQuery('hello world')
      expect(result.semanticTerms).toEqual(['hello', 'world'])
      expect(result.booleanOp).toBe('AND')
    })

    it('parses quoted phrases', () => {
      const result = parseQuery('"exact phrase" other')
      expect(result.phrases).toEqual(['exact phrase'])
      expect(result.semanticTerms).toContain('exact phrase')
      expect(result.semanticTerms).toContain('other')
    })

    it('parses field filters', () => {
      const result = parseQuery('search domain:legal author:john')
      expect(result.filters).toEqual([
        { field: 'domain', value: 'legal' },
        { field: 'author', value: 'john' },
      ])
      expect(result.semanticTerms).toEqual(['search'])
    })

    it('parses exclusion terms', () => {
      const result = parseQuery('search -exclude -another')
      expect(result.excludeTerms).toEqual(['exclude', 'another'])
      expect(result.semanticTerms).toEqual(['search'])
    })

    it('parses AND operator (default)', () => {
      const result = parseQuery('term1 AND term2')
      expect(result.semanticTerms).toEqual(['term1', 'term2'])
      expect(result.booleanOp).toBe('AND')
    })

    it('parses OR operator', () => {
      const result = parseQuery('term1 OR term2')
      expect(result.semanticTerms).toEqual(['term1', 'term2'])
      expect(result.booleanOp).toBe('OR')
    })

    it('handles case-insensitive operators', () => {
      const result1 = parseQuery('a or b')
      expect(result1.booleanOp).toBe('OR')

      const result2 = parseQuery('a Or b')
      expect(result2.booleanOp).toBe('OR')
    })

    it('handles complex queries', () => {
      const result = parseQuery('"exact match" term1 OR term2 domain:legal -excluded')
      expect(result.phrases).toEqual(['exact match'])
      expect(result.semanticTerms).toContain('exact match')
      expect(result.semanticTerms).toContain('term1')
      expect(result.semanticTerms).toContain('term2')
      expect(result.filters).toEqual([{ field: 'domain', value: 'legal' }])
      expect(result.excludeTerms).toEqual(['excluded'])
      expect(result.booleanOp).toBe('OR')
    })

    it('handles empty query', () => {
      const result = parseQuery('')
      expect(result.semanticTerms).toEqual([])
      expect(result.phrases).toEqual([])
      expect(result.filters).toEqual([])
      expect(result.excludeTerms).toEqual([])
    })

    it('handles parentheses (captured but not processed)', () => {
      const result = parseQuery('(group1) AND (group2)')
      expect(result.semanticTerms).toEqual(['group1', 'group2'])
    })

    it('preserves original query', () => {
      const query = 'original query here'
      const result = parseQuery(query)
      expect(result.originalQuery).toBe(query)
    })
  })

  describe('toSemanticQuery', () => {
    it('joins semantic terms', () => {
      const parsed = parseQuery('hello world')
      expect(toSemanticQuery(parsed)).toBe('hello world')
    })

    it('excludes terms from semantic query', () => {
      const parsed = parseQuery('search results -excluded')
      const semantic = toSemanticQuery(parsed)
      expect(semantic).not.toContain('excluded')
      expect(semantic).toContain('search')
      expect(semantic).toContain('results')
    })

    it('includes phrases', () => {
      const parsed = parseQuery('"exact phrase" other')
      const semantic = toSemanticQuery(parsed)
      expect(semantic).toContain('exact phrase')
      expect(semantic).toContain('other')
    })
  })

  describe('toFtsQuery', () => {
    it('quotes phrases', () => {
      const parsed = parseQuery('"exact phrase"')
      expect(toFtsQuery(parsed)).toBe('"exact phrase"')
    })

    it('includes terms not in phrases', () => {
      const parsed = parseQuery('term1 term2')
      expect(toFtsQuery(parsed)).toBe('term1 term2')
    })
  })

  describe('shouldExclude', () => {
    it('returns true when text contains excluded term', () => {
      expect(shouldExclude('This contains excluded content', ['excluded'])).toBe(true)
    })

    it('returns false when text does not contain excluded term', () => {
      expect(shouldExclude('This is clean content', ['excluded'])).toBe(false)
    })

    it('handles case-insensitive matching', () => {
      expect(shouldExclude('Contains EXCLUDED term', ['excluded'])).toBe(true)
    })

    it('handles multiple exclude terms', () => {
      expect(shouldExclude('Has first bad term', ['first', 'second'])).toBe(true)
      expect(shouldExclude('Has second bad term', ['first', 'second'])).toBe(true)
      expect(shouldExclude('Clean content here', ['first', 'second'])).toBe(false)
    })

    it('returns false for empty exclude list', () => {
      expect(shouldExclude('Any content', [])).toBe(false)
    })
  })

  describe('matchesFilters', () => {
    it('returns true when all filters match', () => {
      const metadata = { domain: 'legal', author: 'john' }
      const filters = [
        { field: 'domain', value: 'legal' },
        { field: 'author', value: 'john' },
      ]
      expect(matchesFilters(metadata, filters)).toBe(true)
    })

    it('returns false when filter does not match', () => {
      const metadata = { domain: 'legal' }
      const filters = [{ field: 'domain', value: 'medical' }]
      expect(matchesFilters(metadata, filters)).toBe(false)
    })

    it('returns false when metadata field is missing', () => {
      const metadata = { domain: 'legal' }
      const filters = [{ field: 'author', value: 'john' }]
      expect(matchesFilters(metadata, filters)).toBe(false)
    })

    it('returns false when metadata is undefined', () => {
      const filters = [{ field: 'domain', value: 'legal' }]
      expect(matchesFilters(undefined, filters)).toBe(false)
    })

    it('returns true for empty filter list', () => {
      expect(matchesFilters({ domain: 'any' }, [])).toBe(true)
      expect(matchesFilters(undefined, [])).toBe(true)
    })

    it('handles partial matches (case-insensitive)', () => {
      const metadata = { domain: 'Legal Documents' }
      const filters = [{ field: 'domain', value: 'legal' }]
      expect(matchesFilters(metadata, filters)).toBe(true)
    })
  })
})
