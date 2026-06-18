import { defineConfig } from 'vitest/config';

// Standalone config (does NOT load vite.config.js, so the Electron build plugin
// stays out of the test run). The units under test are pure functions.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js']
  }
});
