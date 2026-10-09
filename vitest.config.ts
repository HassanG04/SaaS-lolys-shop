import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test-setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      clearMocks: true,
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        include: ['src/lib/**/*.{ts,tsx}'],
        exclude: ['src/lib/**/*.test.{ts,tsx}', 'src/lib/**/*.d.ts'],
        thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
      },
    },
  }),
)
