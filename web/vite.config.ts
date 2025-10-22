import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {global: 'window'},
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
