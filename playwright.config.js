import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results',
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:5173/win98-web/',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:5173/win98-web/',
    screenshot: 'only-on-failure',
  },
});
