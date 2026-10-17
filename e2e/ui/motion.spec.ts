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
          <div class="catalog-grid" style="display:flex;gap:30px;margin:30px">
            <article class="ui-card catalog-product-card" style="position:relative;width:280px;height:320px">
              <div class="rounded-image" style="position:relative;width:100%;height:200px">
                <div class="product-badges-overlay absolute start-2 top-2 z-10 flex max-w-[calc(100%-3.5rem)] flex-col items-start gap-1">
                  <span class="ui-badge bg-brand text-brand-contrast">-50% OFF</span>
                  <span class="ui-badge bg-surface-tint text-text-muted">Sold out</span>
                </div>
                <div class="product-favorite-overlay absolute end-2 top-2 z-10">
                  <button type="button" class="min-h-[44px] min-w-[44px]" style="width:44px;height:44px">Heart</button>
                </div>
              </div>
            </article>
            <article class="ui-card catalog-product-card" style="width:160px;height:120px">Other item</article>
          </div>
          <article class="ui-card feature-card" style="width:160px;height:120px;margin:30px"><a href="#returns" class="returns-link">Returns</a></article>
          <aside id="admin-desktop-sidebar" class="admin-desktop-sidebar is-expanded"><div class="admin-desktop-sidebar-inner" style="width:256px">Content</div></aside>
          <dialog open id="admin-mobile-sidebar" class="admin-mobile-drawer is-closed" style="width:288px">Drawer</dialog>
          <div class="admin-page-transition">Page Content</div>
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
        await expect(page.getByRole('button', { name: 'Buy' })).toHaveCSS('filter', 'none')
        await page.mouse.move(0, 0)
        await expect(cards.first()).toHaveCSS('transform', 'none')
        await expect(cards.nth(1)).toHaveCSS('filter', 'none')
      })

      test('feature-card enlarges on hover and focus-within and reverses on leave/blur', async ({
        page,
      }) => {
        const card = page.locator('.feature-card')
        await card.hover()
        await expect
          .poll(() => card.evaluate((el) => getComputedStyle(el).transform))
          .toContain('1.02')
        await page.mouse.move(0, 0)
        await expect(card).toHaveCSS('transform', 'none')

        const link = page.locator('.returns-link')
        await link.focus()
        await expect
          .poll(() => card.evaluate((el) => getComputedStyle(el).transform))
          .toContain('1.02')
        await link.blur()
        await expect(card).toHaveCSS('transform', 'none')
      })

      test('offer badge and wishlist button are on opposite edges and do not overlap (T-3.10b)', async ({
        page,
      }) => {
        const badge = page.locator('.product-badges-overlay')
        const heart = page.locator('.product-favorite-overlay')
        const badgeBox = await badge.boundingBox()
        const heartBox = await heart.boundingBox()
        expect(badgeBox).not.toBeNull()
        expect(heartBox).not.toBeNull()
        if (!badgeBox || !heartBox) return

        if (direction === 'ltr') {
          // English: offer on left, heart on right
          expect(badgeBox.x).toBeLessThan(heartBox.x)
          expect(badgeBox.x + badgeBox.width).toBeLessThan(heartBox.x)
        } else {
          // Arabic: offer on right, heart on left
          expect(heartBox.x).toBeLessThan(badgeBox.x)
          expect(heartBox.x + heartBox.width).toBeLessThan(badgeBox.x)
        }
      })

      test('admin desktop sidebar collapses and mobile drawer transitions from language edge (T-5.13f)', async ({
        page,
      }) => {
        const desktopSidebar = page.locator('#admin-desktop-sidebar')
        await expect(desktopSidebar).toHaveCSS('width', '256px')

        await desktopSidebar.evaluate((el) => {
          el.classList.remove('is-expanded')
          el.classList.add('is-collapsed')
        })
        await expect(desktopSidebar).toHaveCSS('width', '0px')
        await expect(desktopSidebar).toHaveCSS('visibility', 'hidden')

        const inner = page.locator('.admin-desktop-sidebar-inner')
        const innerTransform = await inner.evaluate((el) => getComputedStyle(el).transform)
        if (direction === 'ltr') {
          expect(innerTransform).toContain('-256')
        } else {
          expect(innerTransform).toContain('256')
        }

        const drawer = page.locator('#admin-mobile-sidebar')
        const initialTransform = await drawer.evaluate((el) => getComputedStyle(el).transform)
        if (direction === 'ltr') {
          expect(initialTransform).toContain('-288')
        } else {
          expect(initialTransform).toContain('288')
        }

        await drawer.evaluate((el) => {
          el.classList.remove('is-closed')
          el.classList.add('is-open')
        })
        await expect(drawer).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')

        await drawer.evaluate((el) => {
          el.classList.remove('is-open')
          el.classList.add('is-closing')
        })
        await expect(drawer).not.toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')
      })

      test('reduced motion stops animation while keeping skeletons visible', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        const buyButton = page.getByRole('button', { name: 'Buy' })
        await buyButton.hover()
        await expect(buyButton).toHaveCSS('transform', 'none')
        await expect(page.locator('.flower')).toHaveCSS('animation-name', 'none')
        await expect(page.locator('.ui-skeleton')).toHaveCSS('animation-name', 'none')
        await expect(page.locator('.ui-skeleton')).toBeVisible()
        await expect(page.locator('.ui-skeleton')).not.toHaveCSS(
          'background-color',
          'rgba(0, 0, 0, 0)',
        )
        await page.locator('.feature-card').hover()
        await expect(page.locator('.feature-card')).toHaveCSS('transform', 'none')

        const drawer = page.locator('#admin-mobile-sidebar')
        await drawer.evaluate((el) => {
          el.classList.remove('is-closed')
          el.classList.add('is-open')
        })
        await expect(drawer).toHaveCSS('transform', 'none')
        await expect(page.locator('.admin-page-transition')).toHaveCSS('animation-name', 'none')
      })
    })
  }
}
