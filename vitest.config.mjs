import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
          alias: {
            src: path.resolve(__dirname, './src'),
          },
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
