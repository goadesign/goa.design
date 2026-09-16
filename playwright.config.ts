import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.pw.ts',
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:1314',
    channel: 'chrome',
    headless: true,
  },
  webServer: {
    command: 'python3 -m http.server 1314 --bind 127.0.0.1 --directory public',
    url: 'http://127.0.0.1:1314',
    reuseExistingServer: true,
  },
});
