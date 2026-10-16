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
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/') ||
            id.includes('node_modules/@tanstack/') ||
            id.includes('node_modules/i18next/') ||
            id.includes('node_modules/react-i18next/') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/@supabase/') ||
            id.includes('src/lib/supabase') ||
            id.includes('src/lib/env') ||
            id.includes('src/lib/queryClient') ||
            id.includes('src/features/auth/session.api') ||
            id.includes('src/features/cart/api') ||
            id.includes('src/i18n/ar.json') ||
            id.includes('src/i18n/en.json') ||
            id.includes('src/i18n/translations')
          ) {
            return 'react-vendor'
          }
        },
      },
    },
  },
})
