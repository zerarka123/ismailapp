import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      // notification click handling for web notifications (public/sw-notify.js)
      workbox: { importScripts: ['sw-notify.js'], navigateFallbackDenylist: [/^\/(privacy|terms|delete-account|support)\.html$/] },
      manifest: {
        name: 'Marsa',
        short_name: 'Marsa',
        description: 'Marsa — marché maritime et annuaire professionnel / سوق بحري ودليل مهني',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0f766e',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
});
