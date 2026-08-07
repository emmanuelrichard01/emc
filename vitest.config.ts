import { defineConfig } from 'vitest/config';
import path from 'path';

/* Separate from vite.config.ts on purpose.

   The app config carries build-only plugins — the sitemap emitter and the
   screenshot capture — and `define` entries for __COMMIT_SHA__ /
   __BUILD_TIME__. Reusing it for tests would drag a screenshot API call into
   a test run. This config carries only what the suite needs: the "@" alias
   and the build-time constants a few modules reference. */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  define: {
    __COMMIT_SHA__: JSON.stringify('test'),
    __BUILD_TIME__: JSON.stringify('2026-01-01T00:00:00.000Z'),
  },
  test: {
    // Every current suite is pure logic over the data modules, so jsdom would
    // be overhead. Add an environment override per-file if a DOM test lands.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
