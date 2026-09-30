import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';
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
  plugins: [react(), cloudflare()],
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
});
