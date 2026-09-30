import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';
import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { execSync } from 'child_process';

// Git hash shown in the stat keeper so we know which version recorded a game
const getGitHash = () => {
  try {
    const hash = execSync('git log -1 --format=%h', { encoding: 'utf-8' }).trim();
    let dirty = '';
    try {
      execSync('git diff --quiet');
    } catch {
      dirty = '-dirty';
    }
    return `${hash}${dirty}`;
  } catch {
    return 'unknown';
  }
};

// The cloudflare plugin runs the Worker + Durable Objects inside vite, so
// `yarn dev` is the whole app. It also builds the Worker for deploys.
export default defineConfig({
  plugins: [
    react(),
    // vitest runs the Worker with its own plugin (see test.projects below).
    // The e2e tests use in memory storage so they never touch your local data.
    !process.env.VITEST && cloudflare({ persistState: !process.env.E2E }),
  ],
  define: {
    'import.meta.env.VITE_GIT_HASH': JSON.stringify(getGitHash()),
  },
  environments: {
    client: {
      // some older browser deps expect `global`. Only the browser build, not the Worker.
      define: { global: 'window' },
    },
  },
  build: {
    chunkSizeWarningLimit: 3000,
  },
  test: {
    projects: [
      // React app + shared logic, in jsdom
      {
        plugins: [react()],
        test: {
          name: 'app',
          globals: true,
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: ['{src,shared}/**/*.test.{ts,tsx}'],
        },
      },
      // The Worker + Durable Object, running in workerd like production
      {
        plugins: [
          cloudflareTest({
            wrangler: { configPath: './wrangler.jsonc' },
            miniflare: {
              bindings: { ADMIN_PASSWORD: 'test', ZULURU_USER: '', ZULURU_PASSWORD: '' },
            },
          }),
        ],
        test: { name: 'worker', include: ['worker/**/*.test.ts'] },
      },
    ],
  },
});
