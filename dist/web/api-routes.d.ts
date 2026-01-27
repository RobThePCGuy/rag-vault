import type { Router } from 'express';
import type { RAGServer } from '../server/index.js';
import type { ServerAccessor } from './types.js';
/**
 * Create API router with all endpoints
 * @param serverOrAccessor - RAGServer instance or accessor function
 */
export declare function createApiRouter(serverOrAccessor: RAGServer | ServerAccessor): Router;
//# sourceMappingURL=api-routes.d.ts.map