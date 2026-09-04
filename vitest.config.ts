import { defineConfig } from 'vitest/config';

/**
 * Deliberately standalone rather than extending vite.config.ts. That config carries a
 * copy-assets plugin whose closeBundle hook fires during a test run, so `npm test` was
 * rewriting dist/ — a test command must not mutate build output.
 */
export default defineConfig({
  test: {
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'dist-firefox'],
    environment: 'node',
  },
});
