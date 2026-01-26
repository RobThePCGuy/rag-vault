import { type Express } from 'express';
import type { RAGServer } from '../server/index.js';
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
 * Create and configure Express app
 */
export declare function createHttpServer(ragServer: RAGServer, config: HttpServerConfig): Promise<Express>;
/**
 * Start HTTP server
 */
export declare function startServer(app: Express, port: number): Promise<void>;
//# sourceMappingURL=http-server.d.ts.map