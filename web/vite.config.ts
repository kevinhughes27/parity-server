import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import { resolve } from 'path';

// Get git hash for the web directory at build time
const getGitHash = () => {
  try {
    // Run git command from the project root (parent of web directory)
    const projectRoot = resolve(__dirname, '..');
    const hash = execSync('git log -1 --format=%h web/', {
      encoding: 'utf-8',
      cwd: projectRoot
    }).trim();

    // Check if there are uncommitted changes in the web directory
    let dirty = '';
    try {
      execSync('git diff --quiet web/', {
        cwd: projectRoot
      });
    } catch {
      // git diff --quiet exits with 1 if there are differences
      dirty = '-dirty';
    }

    return `${hash}${dirty}`;
  } catch {
    // should never hit this
    return 'error';
  }
};

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
    'import.meta.env.VITE_GIT_HASH': JSON.stringify(getGitHash()),
  },
  build: {
    outDir: 'build', // CRA's default build output
    chunkSizeWarningLimit: 3000,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/current_league': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/submit_game': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
