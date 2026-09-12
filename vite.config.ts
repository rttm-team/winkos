import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/nhl-web': {
          target: 'https://api-web.nhle.com',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/nhl-web/, ''),
        },
        '/api/nhl-search': {
          target: 'https://search.d3.nhle.com',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/nhl-search/, ''),
        },
      },
    },
  };
});
