import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 15000,
  webServer: undefined, // on utilise docker compose déjà lancé sur 55174
  use: {
    baseURL: 'http://localhost:55174',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
