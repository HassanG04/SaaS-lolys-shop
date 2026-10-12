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
  },
})
