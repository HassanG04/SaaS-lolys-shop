import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      pool: 'threads',
      setupFiles: ['./src/test-setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      clearMocks: true,
      restoreMocks: true,
      testTimeout: 15000,
      env: {
        VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key-with-valid-format',
        VITE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
      },
      coverage: {
        provider: 'v8',
        include: ['src/lib/**/*.{ts,tsx}'],
        exclude: ['src/lib/**/*.test.{ts,tsx}', 'src/lib/**/*.d.ts'],
        thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
      },
    },
  }),
)
