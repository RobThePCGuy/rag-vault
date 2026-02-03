"use strict";
// Shared file utility functions
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.atomicWriteFile = atomicWriteFile;
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
/**
 * Atomically write a file using temp file + rename pattern.
 * This prevents read-modify-write race conditions.
 *
 * @param filePath - Destination file path
 * @param content - Content to write
 */
async function atomicWriteFile(filePath, content) {
    const dir = node_path_1.default.dirname(filePath);
    if (!(0, node_fs_1.existsSync)(dir)) {
        await (0, promises_1.mkdir)(dir, { recursive: true });
    }
    // Write to temp file with unique name, then rename atomically
    const tempPath = `${filePath}.${(0, node_crypto_1.randomUUID)()}.tmp`;
    try {
        await (0, promises_1.writeFile)(tempPath, content, 'utf-8');
        await (0, promises_1.rename)(tempPath, filePath);
    }
    catch (error) {
        // Clean up temp file on failure
        try {
            await (0, promises_1.rm)(tempPath, { force: true });
        }
        catch {
            // Ignore cleanup errors
        }
        throw error;
    }
}
//# sourceMappingURL=file-utils.js.map