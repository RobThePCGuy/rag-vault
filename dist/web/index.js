#!/usr/bin/env node
"use strict";
// Entry point for RAG Web Server
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const config_js_1 = require("../utils/config.js");
const process_handlers_js_1 = require("../utils/process-handlers.js");
// Setup global error handlers
(0, process_handlers_js_1.setupProcessHandlers)();
/**
 * Entry point - Start RAG Web Server
 */
async function main() {
    try {
        // Dynamic imports to avoid loading heavy modules at CLI parse time
        const { RAGServer } = await Promise.resolve().then(() => __importStar(require('../server/index.js')));
        const { createHttpServer, startServer } = await Promise.resolve().then(() => __importStar(require('./http-server.js')));
        // Configuration from environment
        const port = Number.parseInt(process.env['WEB_PORT'] || '3000', 10);
        const uploadDir = process.env['UPLOAD_DIR'] || './uploads/';
        // Determine static files directory
        // Check relative to cwd for development and relative to dist for production
        let staticDir;
        const cwd = process.cwd();
        const devStaticPath = node_path_1.default.resolve(cwd, 'web-ui/dist');
        const prodStaticPath = node_path_1.default.resolve(cwd, 'dist/web-ui');
        // Check which exists
        if ((0, node_fs_1.existsSync)(devStaticPath)) {
            staticDir = devStaticPath;
        }
        else if ((0, node_fs_1.existsSync)(prodStaticPath)) {
            staticDir = prodStaticPath;
        }
        // Build RAG config from environment
        const config = (0, config_js_1.buildRAGConfig)();
        console.log('Starting RAG Web Server...');
        console.log('Configuration:', { ...config, port, uploadDir, staticDir });
        // Initialize RAGServer
        const ragServer = new RAGServer(config);
        await ragServer.initialize();
        // Create and start HTTP server
        const httpConfig = {
            port,
            uploadDir,
        };
        if (staticDir !== undefined) {
            httpConfig.staticDir = staticDir;
        }
        const app = await createHttpServer(ragServer, httpConfig);
        await startServer(app, port);
        console.log('RAG Web Server started successfully');
        if (staticDir) {
            console.log(`Serving UI from: ${staticDir}`);
        }
        else {
            console.log('No UI build found. Run "pnpm ui:build" to build the frontend.');
        }
    }
    catch (error) {
        console.error('Failed to start RAG Web Server:', error);
        process.exit(1);
    }
}
// Execute main
main();
//# sourceMappingURL=index.js.map