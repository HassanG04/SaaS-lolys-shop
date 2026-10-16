import { readFile, readdir } from 'node:fs/promises'
import { test, expect } from '@playwright/test'

const assets = await readdir('dist/assets')
const css = (
  await Promise.all(
    assets
      .filter((file) => file.endsWith('.css'))
      .map((file) => readFile(`dist/assets/${file}`, 'utf8')),
  )
).join('\n')

for (const theme of ['light', 'dark']) {
  for (const direction of ['ltr', 'rtl']) {
    test.describe(`${theme} / ${direction}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.route('**/*', (route) => route.abort())
        await page.emulateMedia({ reducedMotion: 'no-preference' })
        await page.setContent(`<html dir="${direction}" data-theme="${theme}"><head><style>${css}</style></head><body>
          <button class="ui-button flower-button" style="margin:80px; width:180px; height:48px; --magnetic-x:5px; --magnetic-y:3px">
            <span class="flower-container"><span class="flower flower-1"><span class="flower-petal"></span><span class="flower-petal"></span><span class="flower-petal"></span><span class="flower-petal"></span></span></span>Buy</button>
          <div class="ui-skeleton" style="width:160px;height:120px"></div>
          <div class="catalog-grid" style="display:flex;gap:30px;margin:30px"><article class="ui-card catalog-product-card" style="width:160px;height:120px">Item</article><article class="ui-card catalog-product-card" style="width:160px;height:120px">Other item</article></div>
        </body></html>`)
      })

      test('hover moves the control, spins flowers, and preserves petal orientation', async ({
        page,
      }) => {
        const button = page.getByRole('button', { name: 'Buy' })
        await button.hover()
        await expect
          .poll(() => button.evaluate((el) => getComputedStyle(el).transform))
          .toContain('1.015')
        const flower = page.locator('.flower')
        const first = await flower.evaluate((el) => getComputedStyle(el).transform)
        await expect
          .poll(() => flower.evaluate((el) => getComputedStyle(el).transform))
          .not.toBe(first)
        // Individual petals must retain 0/90/270/180-degree rotations as they grow.
        await expect
          .poll(() =>
            page
              .locator('.flower-petal')
              .nth(1)
              .evaluate((el) => getComputedStyle(el).transform),
          )
          .toBe('matrix(0, 1, -1, 0, 0, 0)')
        await page.mouse.move(0, 0)
        await expect(button).toHaveCSS('transform', 'none')
        await expect(flower).toHaveCSS('animation-name', 'none')
      })

      test('theme colors interpolate and the skeleton visibly animates', async ({ page }) => {
        const skeleton = page.locator('.ui-skeleton')
        const firstOpacity = await skeleton.evaluate((el) => getComputedStyle(el).opacity)
        await expect
          .poll(() => skeleton.evaluate((el) => getComputedStyle(el).opacity))
          .not.toBe(firstOpacity)
        const oldColor = await page
          .locator('body')
          .evaluate((el) => getComputedStyle(el).backgroundColor)
        const frame = await page.evaluate(
          async (nextTheme) => {
            document.documentElement.classList.add('theme-transition')
            document.documentElement.dataset.theme = nextTheme
            await new Promise(requestAnimationFrame)
            await new Promise(requestAnimationFrame)
            return {
              color: getComputedStyle(document.body).backgroundColor,
              running: document.body
                .getAnimations()
                .some((animation) => animation.playState === 'running'),
            }
          },
          theme === 'light' ? 'dark' : 'light',
        )
        expect(frame.running).toBe(true)
        await expect
          .poll(() => page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor))
          .not.toBe(oldColor)
      })

      test('card zoom and grid-only blur reverse when the pointer leaves', async ({ page }) => {
        const cards = page.locator('.catalog-product-card')
        await cards.first().hover()
        await expect
          .poll(() => cards.first().evaluate((el) => getComputedStyle(el).transform))
          .toContain('1.035')
        await expect(cards.nth(1)).toHaveCSS('filter', 'blur(2px)')
        await expect(page.getByRole('button')).toHaveCSS('filter', 'none')
        await page.mouse.move(0, 0)
        await expect(cards.first()).toHaveCSS('transform', 'none')
        await expect(cards.nth(1)).toHaveCSS('filter', 'none')
      })

      test('reduced motion stops animation while keeping skeletons visible', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.getByRole('button').hover()
        await expect(page.getByRole('button')).toHaveCSS('transform', 'none')
        await expect(page.locator('.flower')).toHaveCSS('animation-name', 'none')
        await expect(page.locator('.ui-skeleton')).toHaveCSS('animation-name', 'none')
        await expect(page.locator('.ui-skeleton')).toBeVisible()
        await expect(page.locator('.ui-skeleton')).not.toHaveCSS(
          'background-color',
          'rgba(0, 0, 0, 0)',
        )
      })
    })
  }
}
