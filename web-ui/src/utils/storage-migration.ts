// ============================================
// Types
// ============================================

export interface PinsStoreV2 {
  version: 2
  pins: Array<Record<string, unknown>>
  trails: Array<Record<string, unknown>>
  bookmarks: Array<Record<string, unknown>>
}

export interface LinkExportData {
  schemaVersion: 1
  dbId: string
  exportedAt: string
  pins: PinsStoreV2
  dismissed: string[]
  tabs?: unknown[]
  history?: unknown[]
}

// ============================================
// Helpers
// ============================================

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJson(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // localStorage may be full or unavailable; silently fail
  }
}

// ============================================
// Storage key builders
// ============================================

const v1LinksKey = (dbId: string) => `rag-vault-links-v1-${dbId}`
const v2PinsKey = (dbId: string) => `rag-vault-pins-v2-${dbId}`
const dismissedKey = (dbId: string) => `rag-vault-dismissed-v1-${dbId}`

// ============================================
// Migration
// ============================================

function emptyPinsStore(): PinsStoreV2 {
  return { version: 2, pins: [], trails: [], bookmarks: [] }
}

/**
 * Migrate v1 links data (unscoped blob) to v2 pins store (dbId-scoped).
 * If v2 already exists, returns it without re-migrating.
 * If no v1 data exists, writes and returns an empty v2 store.
 */
export function migrateLinksStore(dbId: string): PinsStoreV2 {
  // Already migrated?
  const existing = readJson<PinsStoreV2>(v2PinsKey(dbId))
  if (existing) return existing

  // Attempt to read v1
  const v1 = readJson<Record<string, unknown>>(v1LinksKey(dbId))

  const v2: PinsStoreV2 = {
    version: 2,
    pins: Array.isArray(v1?.pins) ? (v1.pins as Array<Record<string, unknown>>) : [],
    trails: Array.isArray(v1?.trails) ? (v1.trails as Array<Record<string, unknown>>) : [],
    bookmarks: Array.isArray(v1?.bookmarks) ? (v1.bookmarks as Array<Record<string, unknown>>) : [],
  }

  writeJson(v2PinsKey(dbId), v2)
  return v2
}

// ============================================
// Export / Import
// ============================================

/**
 * Export all link-related data for a given database.
 */
export function exportLinkData(dbId: string): LinkExportData {
  const pins = readJson<PinsStoreV2>(v2PinsKey(dbId)) ?? emptyPinsStore()
  const dismissed = readJson<string[]>(dismissedKey(dbId)) ?? []

  return {
    schemaVersion: 1,
    dbId,
    exportedAt: new Date().toISOString(),
    pins,
    dismissed,
  }
}

/**
 * Import previously-exported link data into a target database.
 * Rejects cross-database imports as a safety measure.
 */
export function importLinkData(
  data: LinkExportData,
  targetDbId: string
): { success: boolean; error?: string } {
  if (data.dbId !== targetDbId) {
    return {
      success: false,
      error: 'Cannot import: data is from a different database.',
    }
  }

  writeJson(v2PinsKey(targetDbId), data.pins)
  writeJson(dismissedKey(targetDbId), data.dismissed)

  return { success: true }
}
