import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // GitHub Pages 项目页在子路径下;仅 CI 构建时启用(本地 dev/build 保持根路径)
  base: process.env.GITHUB_PAGES ? '/pipienglish/' : '/',
  server: {
    port: Number(process.env.PORT) || 5173,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: '皮皮のEnglish',
        short_name: '皮皮のEnglish',
        description: '皮皮的每日单词农场',
        theme_color: '#ffe382',
        background_color: '#faf3e4',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
})
