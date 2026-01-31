import type { Trail, TrailStep } from '../contexts/LinksContext'

// ============================================
// Types
// ============================================

export interface ShareableTrail {
  v: 1 // version
  vault: string // vaultId for verification
  steps: Array<{
    p: string // filePath
    c: number // chunkIndex
  }>
}

export interface TrailImportResult {
  success: boolean
  trail?: Trail
  warnings: string[]
  errors: string[]
}

// ============================================
// Encoding/Decoding
// ============================================

/**
 * Encode a trail for URL sharing
 */
export function encodeTrail(trail: Trail, vaultId: string): string {
  const shareable: ShareableTrail = {
    v: 1,
    vault: vaultId,
    steps: trail.steps.map((step) => ({
      p: step.chunkKey.filePath,
      c: step.chunkKey.chunkIndex,
    })),
  }

  const json = JSON.stringify(shareable)
  // Use base64url encoding (URL-safe base64)
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Decode a trail from URL
 */
export function decodeTrail(encoded: string): ShareableTrail | null {
  try {
    // Restore base64 padding and characters
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')

    // Add padding if needed
    const padding = base64.length % 4
    if (padding > 0) {
      base64 += '='.repeat(4 - padding)
    }

    const json = atob(base64)
    const data = JSON.parse(json) as ShareableTrail

    // Validate structure
    if (data.v !== 1) {
      console.error('Unsupported trail version:', data.v)
      return null
    }

    if (!data.vault || !Array.isArray(data.steps)) {
      console.error('Invalid trail structure')
      return null
    }

    // Validate each step has required fields with correct types
    for (const step of data.steps) {
      if (typeof step.p !== 'string' || typeof step.c !== 'number') {
        console.error('Invalid step structure: each step must have p (string) and c (number)')
        return null
      }
    }

    return data
  } catch (e) {
    console.error('Failed to decode trail:', e)
    return null
  }
}

// ============================================
// URL Generation
// ============================================

/**
 * Generate a shareable URL for a trail
 * Uses hash fragment to avoid server logging
 */
export function generateTrailUrl(
  trail: Trail,
  vaultId: string,
  baseUrl?: string
): { url: string; tooLarge: boolean } {
  const encoded = encodeTrail(trail, vaultId)

  // Check size limit (2000 chars for URL safety)
  const MAX_TRAIL_LENGTH = 2000
  if (encoded.length > MAX_TRAIL_LENGTH) {
    return { url: '', tooLarge: true }
  }

  const base = baseUrl || window.location.origin
  const url = `${base}/read#trail=${encoded}`

  return { url, tooLarge: false }
}

/**
 * Parse trail parameter from URL hash
 */
export function parseTrailFromUrl(): string | null {
  const hash = window.location.hash
  if (!hash.startsWith('#trail=')) {
    return null
  }
  return hash.slice(7) // Remove '#trail='
}

// ============================================
// Import/Validation
// ============================================

export interface TrailValidationOptions {
  currentVaultId: string
  checkFileExists?: (filePath: string) => boolean
}

/**
 * Validate and import a decoded trail
 */
export function validateTrail(
  shareable: ShareableTrail,
  options: TrailValidationOptions
): TrailImportResult {
  const warnings: string[] = []
  const errors: string[] = []

  // Check vault ID match
  const vaultMismatch = shareable.vault !== options.currentVaultId
  if (vaultMismatch) {
    warnings.push(
      `This trail was created in a different vault (${shareable.vault}). Some steps may not be available.`
    )
  }

  // Check for empty trail
  if (shareable.steps.length === 0) {
    errors.push('Trail has no steps')
    return { success: false, warnings, errors }
  }

  // Validate each step
  const validSteps: TrailStep[] = []
  const missingFiles: string[] = []

  for (const step of shareable.steps) {
    if (!step.p || typeof step.c !== 'number') {
      continue
    }

    // Check if file exists (if checker provided)
    if (options.checkFileExists && !options.checkFileExists(step.p)) {
      missingFiles.push(step.p)
      continue
    }

    validSteps.push({
      chunkKey: {
        filePath: step.p,
        chunkIndex: step.c,
      },
      visitedAt: new Date().toISOString(),
    })
  }

  // Report missing files
  if (missingFiles.length > 0) {
    const uniqueMissing = [...new Set(missingFiles)]
    warnings.push(
      `${uniqueMissing.length} file(s) not found and will be skipped: ${uniqueMissing.slice(0, 3).join(', ')}${uniqueMissing.length > 3 ? '...' : ''}`
    )
  }

  // Check if we have any valid steps
  if (validSteps.length === 0) {
    errors.push('No valid steps found in trail')
    return { success: false, warnings, errors }
  }

  // Create the trail
  const trail: Trail = {
    id: crypto.randomUUID(),
    name: 'Imported Trail',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    steps: validSteps,
  }

  return {
    success: true,
    trail,
    warnings,
    errors,
  }
}

// ============================================
// Utility
// ============================================

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      return true
    } catch {
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }
}
