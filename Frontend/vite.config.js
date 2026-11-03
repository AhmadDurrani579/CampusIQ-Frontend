import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  cacheDir: process.env.CAMPUSIQ_TEST_SERVER ? `node_modules/.vite-tests-${process.env.CAMPUSIQ_TEST_SERVER}` : 'node_modules/.vite',
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { chunkSizeWarningLimit: 750, rolldownOptions: { output: { manualChunks: (id) => id.includes('/node_modules/recharts/') ? 'charts' : /\/node_modules\/(react|react-dom|react-router|react-router-dom)\//.test(id) ? 'vendor' : undefined } } },
});
