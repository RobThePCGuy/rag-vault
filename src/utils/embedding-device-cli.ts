const DEVICE_VALUE_FLAGS = ['--embedding-device', '--device'] as const
const AUTO_DEVICE_FLAGS = ['--gpu-auto'] as const

function setEmbeddingDevice(value: string, source: string): void {
  const normalized = value.trim()
  if (normalized.length === 0) {
    throw new Error(`Empty value for ${source}.`)
  }

  process.env['RAG_EMBEDDING_DEVICE'] = normalized
  console.error(`Embedding device override from CLI: ${normalized}`)
}

function parseInlineFlagValue(arg: string, prefix: string): string | null {
  if (!arg.startsWith(prefix)) {
    return null
  }
  return arg.slice(prefix.length)
}

/**
 * Apply CLI overrides for embedding device and return remaining args.
 *
 * Supported flags:
 * - --embedding-device <value>
 * - --embedding-device=<value>
 * - --device <value>
 * - --device=<value>
 * - --gpu-auto
 */
export function applyEmbeddingDeviceCliOverride(args: string[]): string[] {
  const remaining: string[] = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === undefined) {
      continue
    }

    if (AUTO_DEVICE_FLAGS.includes(arg as (typeof AUTO_DEVICE_FLAGS)[number])) {
      setEmbeddingDevice('auto', arg)
      continue
    }

    const deviceFromLongEquals = parseInlineFlagValue(arg, '--embedding-device=')
    if (deviceFromLongEquals !== null) {
      setEmbeddingDevice(deviceFromLongEquals, '--embedding-device')
      continue
    }

    const deviceFromShortEquals = parseInlineFlagValue(arg, '--device=')
    if (deviceFromShortEquals !== null) {
      setEmbeddingDevice(deviceFromShortEquals, '--device')
      continue
    }

    if (DEVICE_VALUE_FLAGS.includes(arg as (typeof DEVICE_VALUE_FLAGS)[number])) {
      const value = args[i + 1]
      if (!value || value.startsWith('-')) {
        throw new Error(`Missing value for ${arg}. Example: ${arg} auto`)
      }
      setEmbeddingDevice(value, arg)
      i++
      continue
    }

    remaining.push(arg)
  }

  return remaining
}
