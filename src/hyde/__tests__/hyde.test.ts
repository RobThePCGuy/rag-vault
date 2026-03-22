import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HyDEExpander } from '../index.js'
import type { HyDEConfig } from '../index.js'

function makeConfig(overrides: Partial<HyDEConfig> = {}): HyDEConfig {
  return {
    enabled: true,
    backend: 'rule-based',
    numExpansions: 2,
    ...overrides,
  }
}

describe('HyDEExpander', () => {
  describe('when disabled', () => {
    it('returns only the original query', async () => {
      const expander = new HyDEExpander(makeConfig({ enabled: false }))
      const results = await expander.expandQuery('how does authentication work?')

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({ text: 'how does authentication work?', weight: 1.0 })
    })
  })

  describe('when enabled with rule-based backend', () => {
    it('returns original query plus expansions for question queries', async () => {
      const expander = new HyDEExpander(makeConfig())
      const results = await expander.expandQuery('how does authentication work?')

      expect(results.length).toBeGreaterThanOrEqual(2)
      expect(results[0]).toEqual({ text: 'how does authentication work?', weight: 1.0 })
      for (const expansion of results.slice(1)) {
        expect(expansion.weight).toBe(0.5)
        expect(expansion.text.length).toBeGreaterThan(0)
      }
    })

    it('returns original query plus expansions for error queries', async () => {
      const expander = new HyDEExpander(makeConfig())
      const results = await expander.expandQuery('connection error timeout in database')

      expect(results.length).toBeGreaterThanOrEqual(2)
      expect(results[0]!.weight).toBe(1.0)
      expect(results[1]!.weight).toBe(0.5)
    })

    it('returns original query plus expansions for code queries', async () => {
      const expander = new HyDEExpander(makeConfig())
      const results = await expander.expandQuery('parseJSON() method implementation details')

      expect(results.length).toBeGreaterThanOrEqual(2)
      expect(results[0]!.weight).toBe(1.0)
    })

    it('returns original query plus expansions for concept queries', async () => {
      const expander = new HyDEExpander(makeConfig())
      const results = await expander.expandQuery('database indexing strategies overview')

      expect(results.length).toBeGreaterThanOrEqual(2)
      expect(results[0]!.weight).toBe(1.0)
    })

    it('skips expansion for short queries (< 3 words)', async () => {
      const expander = new HyDEExpander(makeConfig())
      const results = await expander.expandQuery('auth setup')

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({ text: 'auth setup', weight: 1.0 })
    })

    it('respects numExpansions config', async () => {
      const expander = new HyDEExpander(makeConfig({ numExpansions: 1 }))
      const results = await expander.expandQuery('how does authentication work in this system?')

      // Original (1) + at most 1 expansion
      expect(results.length).toBeLessThanOrEqual(2)
      expect(results[0]!.weight).toBe(1.0)
    })
  })

  describe('when enabled with api backend', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleSpy.mockRestore()
      vi.restoreAllMocks()
    })

    it('falls back to rule-based when no API key is provided', async () => {
      const expander = new HyDEExpander(makeConfig({ backend: 'api' }))
      const results = await expander.expandQuery('how does vector search work?')

      // Should still produce results via rule-based fallback
      expect(results.length).toBeGreaterThanOrEqual(2)
      expect(results[0]!.weight).toBe(1.0)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No API key configured'))
    })

    it('falls back to rule-based when API call fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

      const expander = new HyDEExpander(makeConfig({ backend: 'api', apiKey: 'test-key' }))
      const results = await expander.expandQuery('how does vector search work?')

      // Should still produce results via rule-based fallback
      expect(results.length).toBeGreaterThanOrEqual(2)
      expect(results[0]!.weight).toBe(1.0)

      vi.unstubAllGlobals()
    })

    it('parses valid API response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              content: [
                {
                  type: 'text',
                  text: 'Vector search uses embedding models.\nIt compares query vectors to document vectors.',
                },
              ],
            }),
        })
      )

      const expander = new HyDEExpander(
        makeConfig({ backend: 'api', apiKey: 'test-key', numExpansions: 2 })
      )
      const results = await expander.expandQuery('how does vector search work?')

      expect(results.length).toBeGreaterThanOrEqual(2)
      expect(results[0]).toEqual({ text: 'how does vector search work?', weight: 1.0 })
      // Expansions from the API response
      for (const expansion of results.slice(1)) {
        expect(expansion.weight).toBe(0.5)
        expect(expansion.text.length).toBeGreaterThan(0)
      }

      vi.unstubAllGlobals()
    })
  })
})
