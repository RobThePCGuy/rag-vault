#!/usr/bin/env node
"use strict";
// Entry point for RAG MCP Server
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
Object.defineProperty(exports, "__esModule", { value: true });
const install_skills_js_1 = require("./bin/install-skills.js");
const index_js_1 = require("./server/index.js");
const config_js_1 = require("./utils/config.js");
const process_handlers_js_1 = require("./utils/process-handlers.js");
// ============================================
// Subcommand Routing
// ============================================
const args = process.argv.slice(2);
// Handle "skills" subcommand
if (args[0] === 'skills') {
    if (args[1] === 'install') {
        // npx rag-vault skills install [options]
        (0, install_skills_js_1.run)(args.slice(2));
    }
    else {
        console.error('Unknown skills subcommand. Usage: npx rag-vault skills install [options]');
        console.error('Run "npx rag-vault skills install --help" for more information.');
        process.exit(1);
    }
}
else if (args[0] === 'web') {
    // Handle "web" subcommand - launches HTTP server with web UI
    Promise.resolve().then(() => __importStar(require('./web/index.js'))).catch((error) => {
        console.error('Failed to start web server:', error);
        process.exit(1);
    });
}
else {
    // ============================================
    // MCP Server (default behavior)
    // ============================================
    (0, process_handlers_js_1.setupProcessHandlers)();
    (0, process_handlers_js_1.setupGracefulShutdown)(); // Listen for SIGTERM/SIGINT
    // Add .catch() to handle initialization errors and prevent unhandled rejections
    main().catch((error) => {
        console.error('Fatal error during startup:', error);
        process.exit(1);
    });
}
/**
 * Entry point - Start RAG MCP Server
 */
async function main() {
    try {
        const config = (0, config_js_1.buildRAGConfig)();
        (0, config_js_1.validateRAGConfig)(config);
        console.error('Starting RAG MCP Server...');
        console.error('Configuration:', config);
        // Start RAGServer
        const server = new index_js_1.RAGServer(config);
        // Register cleanup callback for graceful shutdown
        (0, process_handlers_js_1.onShutdown)(async () => {
            console.error('Closing RAG server...');
            await server.close();
        });
        await server.initialize();
        await server.run();
        console.error('RAG MCP Server started successfully');
    }
    catch (error) {
        console.error('Failed to start RAG MCP Server:', error);
        process.exit(1);
    }
}
//# sourceMappingURL=index.js.map