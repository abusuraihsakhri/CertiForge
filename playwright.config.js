import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    serviceWorkers: 'block'
  },
  webServer: {
    command: 'node tests/e2e/server.mjs',
    port: 4173,
    reuseExistingServer: true,
    timeout: 20_000
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } }
  ]
});
