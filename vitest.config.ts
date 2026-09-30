import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { cloudflareTest } from '@cloudflare/vitest-plugin';

export default defineConfig({
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
        test: {
          name: 'worker',
          include: ['worker/**/*.test.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
