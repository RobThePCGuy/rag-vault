// Shared types for web module

import type { RAGServer } from '../server/index.js'

/**
 * Server accessor function type - allows dynamic server access
 */
export type ServerAccessor = () => RAGServer
