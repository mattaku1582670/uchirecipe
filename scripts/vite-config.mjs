import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

export function createViteConfig() {
  return defineConfig({
    root: projectRoot,
    configFile: false,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['pwa-icon.svg'],
        manifest: {
          name: 'うちレシピ',
          short_name: 'うちレシピ',
          description: '自分専用のレシピ管理 PWA',
          theme_color: '#F4EDE0',
          background_color: '#F4EDE0',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico}']
        }
      })
    ],
    server: {
      fs: {
        allow: [projectRoot]
      }
    }
  });
}
