import { defineConfig } from '@playwright/test';

const port = 5174; // so it can run next to `./dev up`

export default defineConfig({
  testDir: '.',
  // every test resets the same league so they run one at a time
  workers: 1,
  forbidOnly: !!process.env.CI,
  outputDir: 'results',
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'report' }]]
    : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    browserName: 'chromium',
    viewport: { width: 800, height: 900 },
    isMobile: true,
    trace: 'retain-on-failure',
  },
  // the production build, with in memory storage (see vite.config.ts)
  webServer: {
    command: `vite build && vite preview --port ${port} --strictPort`,
    cwd: '..',
    env: { E2E: '1' },
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
