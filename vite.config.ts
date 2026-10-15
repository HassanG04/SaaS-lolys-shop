import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { bundleGraph } from './scripts/bundle-graph.ts'

export default defineConfig({
  plugins: [react(), tailwindcss(), bundleGraph()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    target: 'es2022',
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/') ||
            id.includes('node_modules/react-router')
          ) {
            return 'vendor-react'
          }
          if (
            id.includes('node_modules/i18next/') ||
            id.includes('node_modules/react-i18next/') ||
            id.includes('node_modules/@supabase/')
          ) {
            return 'vendor-i18n'
          }
          if (id.includes('node_modules/@tanstack/')) {
            return 'vendor-query'
          }
        },
      },
    },
  },
})
