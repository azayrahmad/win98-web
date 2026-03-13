import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results',
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:5173/',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:5173/',
    screenshot: 'only-on-failure',
  },
});
