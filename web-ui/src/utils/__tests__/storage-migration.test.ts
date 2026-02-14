import { afterEach, describe, expect, it } from 'vitest'
import {
  exportLinkData,
  importLinkData,
  migrateLinksStore,
} from '../storage-migration'
import type { PinsStoreV2 } from '../storage-migration'

describe('storage-migration', () => {
  afterEach(() => {
    localStorage.clear()
  })

  // ------------------------------------------
  // migrateLinksStore
  // ------------------------------------------

  it('migrates v1 data to v2 scoped by dbId', () => {
    const v1Data = {
      pins: [{ id: 'p1' }],
      trails: [{ id: 't1' }],
      bookmarks: [{ id: 'b1' }],
    }
    localStorage.setItem('rag-vault-links-v1-db123', JSON.stringify(v1Data))

    const result = migrateLinksStore('db123')

    expect(result).toEqual({
      version: 2,
      pins: [{ id: 'p1' }],
      trails: [{ id: 't1' }],
      bookmarks: [{ id: 'b1' }],
    })

    // Verify it was persisted under the v2 key
    const stored = JSON.parse(localStorage.getItem('rag-vault-pins-v2-db123')!)
    expect(stored.version).toBe(2)
    expect(stored.pins).toEqual([{ id: 'p1' }])
  })

  it('returns empty store when no v1 data exists', () => {
    const result = migrateLinksStore('empty-db')

    expect(result).toEqual({
      version: 2,
      pins: [],
      trails: [],
      bookmarks: [],
    })

    // Should still write the empty v2 store
    const stored = localStorage.getItem('rag-vault-pins-v2-empty-db')
    expect(stored).not.toBeNull()
  })

  it('does not re-migrate if v2 already exists', () => {
    const v2Data: PinsStoreV2 = {
      version: 2,
      pins: [{ id: 'already-migrated' }],
      trails: [],
      bookmarks: [],
    }
    localStorage.setItem('rag-vault-pins-v2-db456', JSON.stringify(v2Data))

    // Also plant v1 data that should NOT overwrite v2
    localStorage.setItem(
      'rag-vault-links-v1-db456',
      JSON.stringify({ pins: [{ id: 'stale-v1' }], trails: [], bookmarks: [] })
    )

    const result = migrateLinksStore('db456')
    expect(result.pins).toEqual([{ id: 'already-migrated' }])
  })

  // ------------------------------------------
  // exportLinkData / importLinkData round-trip
  // ------------------------------------------

  it('round-trips pin data through export and import', () => {
    // Seed v2 pins + dismissed data
    const pins: PinsStoreV2 = {
      version: 2,
      pins: [{ id: 'pin1' }],
      trails: [{ id: 'trail1' }],
      bookmarks: [{ id: 'bm1' }],
    }
    localStorage.setItem('rag-vault-pins-v2-roundtrip', JSON.stringify(pins))
    localStorage.setItem(
      'rag-vault-dismissed-v1-roundtrip',
      JSON.stringify(['chunk-a', 'chunk-b'])
    )

    const exported = exportLinkData('roundtrip')

    expect(exported.schemaVersion).toBe(1)
    expect(exported.dbId).toBe('roundtrip')
    expect(exported.pins).toEqual(pins)
    expect(exported.dismissed).toEqual(['chunk-a', 'chunk-b'])
    expect(exported.exportedAt).toBeTruthy()

    // Clear storage, then import
    localStorage.clear()

    const importResult = importLinkData(exported, 'roundtrip')
    expect(importResult).toEqual({ success: true })

    // Verify data was written back
    const restoredPins = JSON.parse(localStorage.getItem('rag-vault-pins-v2-roundtrip')!)
    expect(restoredPins).toEqual(pins)

    const restoredDismissed = JSON.parse(
      localStorage.getItem('rag-vault-dismissed-v1-roundtrip')!
    )
    expect(restoredDismissed).toEqual(['chunk-a', 'chunk-b'])
  })

  // ------------------------------------------
  // importLinkData cross-db guard
  // ------------------------------------------

  it('blocks cross-db import', () => {
    const exported = exportLinkData('source-db')
    const result = importLinkData(exported, 'different-db')

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/different database/)
  })
})
