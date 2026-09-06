import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon-192.png', 'icon-512.png', 'favicon.ico'],
    manifest: {
      name: 'Babyfoot au boulot',
      short_name: 'Babyfoot',
      description: 'Organise tes parties de babyfoot entre collègues — 1v1/2v2, tirage, stats live.',
      theme_color: '#7c3aed',
      background_color: '#ffffff',
      display: 'standalone',
      scope: '/',
      start_url: '/',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/babyfootauboulot\.onrender\.com\/.*/i,
          handler: 'NetworkFirst',
          options: { cacheName: 'api-cache', networkTimeoutSeconds: 5, cacheableResponse: { statuses: [0, 200] } }
        },
        {
          urlPattern: ({ request }) => request.destination === 'document',
          handler: 'NetworkFirst',
          options: { cacheName: 'pages-cache' }
        }
      ]
    },
    devOptions: { enabled: false }
  })],
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
