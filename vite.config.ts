import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the same build works at web root (Hostinger), inside Electron
// (file://) and inside the Capacitor Android webview.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 5173,
    host: true,
  },
});
