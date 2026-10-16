import { defineConfig } from '@playwright/test'

// Compiled-CSS fixtures only: no app server, credentials, network or database.
export default defineConfig({
  testDir: './e2e/ui',
  testMatch: 'motion.spec.ts',
  workers: 1,
  use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } },
})
