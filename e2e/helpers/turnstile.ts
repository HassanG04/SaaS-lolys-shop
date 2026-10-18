import { test as base, expect, type BrowserContext, type Page } from '@playwright/test'
import path from 'node:path'

async function installProvider(context: BrowserContext, baseURL: string | undefined) {
  if (!baseURL || !['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname)) {
    throw new Error('The CAPTCHA fixture is restricted to the local E2E server')
  }
  await context.route(
    'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
    (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        path: path.resolve('e2e/fixtures/turnstile.js'),
      }),
  )
}

// Simulate only the third-party widget. Authentication and database requests stay real.
export const test = base.extend<{ newAuthContext: () => Promise<BrowserContext> }>({
  context: async ({ context, baseURL }, use) => {
    await installProvider(context, baseURL)
    await use(context)
  },
  newAuthContext: async ({ browser, baseURL, locale }, use) => {
    const contexts: BrowserContext[] = []
    await use(async () => {
      const context = await browser.newContext({ baseURL, locale })
      contexts.push(context)
      await installProvider(context, baseURL)
      return context
    })
    await Promise.all(contexts.map((context) => context.close()))
  },
})

export async function waitForCaptcha(page: Page) {
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/^e2e-turnstile-/)
}

export { expect, type Page, type Response } from '@playwright/test'
