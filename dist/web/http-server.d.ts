import { type Express } from 'express';
import type { RAGServer } from '../server/index.js';
import type { DatabaseManager } from './database-manager.js';
export type { ServerAccessor } from './types.js';
/**
 * HTTP server configuration
 */
export interface HttpServerConfig {
    /** Port to listen on */
    port: number;
    /** Upload directory for temporary files */
    uploadDir: string;
    /** Static files directory (for production builds) */
    staticDir?: string;
}
/**
 * Create and configure Express app with DatabaseManager
 */
export declare function createHttpServerWithManager(dbManager: DatabaseManager, config: HttpServerConfig): Promise<Express>;
/**
 * Create and configure Express app (legacy - direct RAGServer)
 */
export declare function createHttpServer(ragServer: RAGServer, config: HttpServerConfig): Promise<Express>;
/**
 * Start HTTP server
 */
export declare function startServer(app: Express, port: number): Promise<void>;
//# sourceMappingURL=http-server.d.ts.map