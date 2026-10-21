import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

import tailwindcss from '@tailwindcss/vite'
import { bundleGraph } from './scripts/bundle-graph.ts'
import { initialPreload } from './scripts/initial-preload.ts'

const contentSecurityPolicy = readFileSync(
  new URL('./public/_headers', import.meta.url),
  'utf8',
).match(/Content-Security-Policy:\s*(.+)$/m)?.[1]
if (!contentSecurityPolicy) throw new Error('Missing preview Content-Security-Policy')

export default defineConfig({
  plugins: [react(), tailwindcss(), bundleGraph(), initialPreload()],
  preview: { headers: { 'Content-Security-Policy': contentSecurityPolicy } },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    target: 'es2022',
    modulePreload: false,
    rollupOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              priority: 20,
              test(id) {
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
                  return true
                }
                return false
              },
            },
            {
              name: 'storefront-catalog',
              priority: 10,
              includeDependenciesRecursively: false,
              test(id) {
                // These public catalog dependencies are all lazy today. Keep them in
                // one lazy chunk instead of a chain of tiny requests before first paint.
                if (
                  [
                    '/src/features/catalog/',
                    '/src/features/settings/',
                    '/src/features/favorites/',
                    '/src/components/ui/Button.tsx',
                    '/src/components/ui/Card.tsx',
                    '/src/components/ui/ErrorPanel.tsx',
                    '/src/components/ui/EmptyState.tsx',
                    '/src/components/ui/Skeleton.tsx',
                    '/src/components/ui/ornaments.tsx',
                    '/src/components/ui/RibbonDivider.tsx',
                    '/src/components/ui/Badge.tsx',
                    '/src/components/ui/Dialog.tsx',
                    '/src/components/ui/Ltr.tsx',
                    '/src/components/ui/IconButton.tsx',
                    '/src/components/ui/magnetic.ts',
                    '/src/lib/errors.ts',
                    '/src/lib/format.ts',
                    '/src/lib/images.ts',
                    '/src/lib/motion.ts',
                  ].some((part) => id.includes(part))
                ) {
                  return true
                }
                return false
              },
            },
          ],
        },
      },
    },
  },
})
