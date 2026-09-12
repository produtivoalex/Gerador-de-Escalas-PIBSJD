import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e', timeout: 60000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:3100', channel: 'chrome', viewport: { width: 1440, height: 1000 } },
  webServer: [
    { command: `${process.platform === 'win32' ? 'npm.cmd' : 'npm'} run dev -- --port 3100 --strictPort`, url: 'http://127.0.0.1:3100', reuseExistingServer: false },
    { command: 'node --import tsx tests/serve-vps.ts', url: 'http://127.0.0.1:3200/api/health', reuseExistingServer: false }
  ]
});
