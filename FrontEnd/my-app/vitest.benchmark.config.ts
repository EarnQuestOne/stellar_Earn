import path from 'node:path';

import { defineConfig } from 'vitest/config';

/**
 * Dedicated Vitest config for performance benchmarks.
 *
 * Benchmarks live under the `scripts/benchmarks` directory (the file
 * pattern `*.bench.tsx`) and are intentionally excluded from the normal
 * `npm test` run so they never slow down CI. Run them explicitly with:
 *
 *   npm run benchmark:quest-table
 *
 * Results are written to `scripts/benchmarks/results/` as JSON.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['scripts/benchmarks/**/*.bench.{ts,tsx}'],
    exclude: ['tests/**', '**/*.spec.{ts,tsx}'],
    watch: false,
    testTimeout: 120_000,
    hookTimeout: 60_000,
  },
});
