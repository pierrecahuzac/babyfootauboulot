import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 55174,
    watch: { usePolling: true },
    hmr: { clientPort: 55174 },
    proxy: {
      '/api': 'http://api:33333'
    }
  }
});
