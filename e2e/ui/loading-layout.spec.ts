import { test, expect } from '@playwright/test'

for (const lang of ['ar', 'en']) {
  for (const theme of ['light', 'dark']) {
    for (const width of [360, 1280]) {
      test(`${lang}/${theme}/${width}: delayed route does not push a visible footer out of the viewport`, async ({
        page,
      }, testInfo) => {
        const height = 800
        await page.setViewportSize({ width, height })
        await page.addInitScript(
          ({ lang, theme }) => {
            localStorage.setItem('app-lang', lang)
            localStorage.setItem('theme', theme)
            localStorage.setItem('motion', 'reduced')
          },
          { lang, theme },
        )
        let releaseRoute = () => {}
        const routeReady = new Promise<void>((resolve) => {
          releaseRoute = resolve
        })
        await page.route(/\/assets\/HomePage-[^/]+\.js$/, async (route) => {
          await routeReady
          await route.continue()
        })
        try {
          await page.goto('/', { waitUntil: 'domcontentloaded' })
          await expect(page.locator('main [role="status"]')).toBeVisible()
          await expect(page.locator('footer')).toBeVisible()
          const loadingFooter = await page.locator('footer').boundingBox()
          expect(loadingFooter?.y).toBeGreaterThanOrEqual(height - 1)
        } finally {
          releaseRoute()
        }
        await expect(page.locator('main h1')).toBeVisible()
        await expect(page.locator('main [role="status"]')).toHaveCount(0)
        const loadedFooter = await page.locator('footer').boundingBox()
        expect(loadedFooter?.y).toBeGreaterThanOrEqual(height - 1)
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          width,
        )
        await page.screenshot({ path: testInfo.outputPath('loaded-page.png') })
      })
    }
  }
}
