import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const backendAlias = {
  src: path.resolve(__dirname, './src'),
}

export default defineConfig({
  test: {
    projects: [
      // Backend tests (Node.js environment)
      {
        test: {
          name: 'backend',
          globals: true,
          environment: 'node',
          include: ['src/**/*.{test,spec}.ts'],
          exclude: ['web-ui/**'],
          testTimeout: 10000,
          hookTimeout: 10000,
          teardownTimeout: 5000,
          pool: 'forks',
        },
        resolve: {
          alias: backendAlias,
        },
      },
      // Backend unit tests (CI/local fast quality gate)
      {
        test: {
          name: 'backend-unit',
          globals: true,
          environment: 'node',
          include: ['src/**/*.{test,spec}.ts'],
          exclude: [
            'web-ui/**',
            'src/**/e2e/**',
            'src/**/*.integration.test.ts',
            'src/embedder/__tests__/lazy-initialization.test.ts',
            'src/**/server/ingest-data.test.ts',
            'src/**/security/security.test.ts',
          ],
          testTimeout: 10000,
          hookTimeout: 10000,
          teardownTimeout: 5000,
          pool: 'forks',
        },
        resolve: {
          alias: backendAlias,
        },
      },
      // Backend integration tests (opt-in, slower/network-dependent)
      {
        test: {
          name: 'backend-integration',
          globals: true,
          environment: 'node',
          include: [
            'src/**/e2e/**',
            'src/**/*.integration.test.ts',
            'src/embedder/__tests__/lazy-initialization.test.ts',
            'src/**/server/ingest-data.test.ts',
            'src/**/security/security.test.ts',
          ],
          testTimeout: 60000,
          hookTimeout: 60000,
          teardownTimeout: 10000,
          pool: 'forks',
        },
        resolve: {
          alias: backendAlias,
        },
      },
      // Frontend tests (jsdom environment)
      {
        plugins: [react()],
        test: {
          name: 'web-ui',
          globals: true,
          environment: 'jsdom',
          include: ['web-ui/src/**/*.{test,spec}.{ts,tsx}'],
          setupFiles: ['./web-ui/src/setupTests.ts'],
        },
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './web-ui/src'),
          },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 60,
        statements: 60,
        functions: 60,
        branches: 50,
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        'web-ui/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/test/**',
        'scripts/**',
      ],
    },
  },
})
