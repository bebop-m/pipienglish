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
      workbox: {
        // F4 首页必须断网可用；背景图约 2.2 MB，显式提高单文件预缓存上限。
        // mp3 = 农场背景音乐，同样必须离线可用，否则断网时音乐静默。
        globPatterns: ['**/*.{js,css,html,png,webmanifest,json,mp3}'],
        // manifest 与其中声明的图标会由插件自动加入；避免扫描阶段重复登记同一 URL。
        globIgnores: [
          'manifest.webmanifest',
          'icon-192.png',
          'icon-512.png',
          'icon-maskable-512.png',
        ],
        // 场景二苹果园背景约 4.9 MB，发布后必须与场景一一样支持离线进入。
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      manifest: {
        id: './',
        name: '皮皮のEnglish',
        short_name: '皮皮のEnglish',
        description: '皮皮的每日单词农场',
        lang: 'zh-CN',
        start_url: './',
        scope: './',
        theme_color: '#ffe382',
        background_color: '#faf3e4',
        display: 'standalone',
        orientation: 'landscape',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
})
