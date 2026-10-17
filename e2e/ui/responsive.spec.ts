import { readFile, readdir } from 'node:fs/promises'
import { expect, test, type Locator } from '@playwright/test'

async function box(locator: Locator) {
  const bounds = await locator.boundingBox()
  if (!bounds) throw new Error(`Expected visible bounds for ${locator}`)
  return bounds
}

const assets = await readdir('dist/assets')
const css = (
  await Promise.all(
    assets
      .filter((file) => file.endsWith('.css'))
      .map((file) => readFile(`dist/assets/${file}`, 'utf8')),
  )
).join('\n')

for (const lang of ['ar', 'en'])
  for (const theme of ['light', 'dark'])
    for (const width of [320, 360, 1280]) {
      test(`${lang}/${theme}/${width}: header remains reachable, switch stays inside track, social menu fits`, async ({
        page,
      }) => {
        await page.route('**/*', (route) => route.abort())
        await page.setViewportSize({ width, height: 800 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        const load = async (name: string) =>
          page.setContent(
            `<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}" data-theme="${theme}"><head><style>${css}</style></head><body>${await readFile(`.tools/layout-fixtures/${lang}-${name}.html`, 'utf8')}</body></html>`,
          )
        await load('admin')
        const header = page.locator('.admin-header')
        const heading = header
          .locator('span')
          .filter({ hasText: lang === 'ar' ? /^لوحة التحكم$/ : /^Dashboard$/ })
        const toggle = header.getByRole('button', {
          name:
            width < 1024
              ? lang === 'ar'
                ? 'قائمة لوحة التحكم'
                : 'Admin menu'
              : lang === 'ar'
                ? 'طي الشريط الجانبي'
                : 'Collapse sidebar',
        })
        const toggleBox = await box(toggle)
        const headingBox = await box(heading)
        expect(headingBox.x).toBeGreaterThan(width < 1024 ? width / 2 - 50 : (width - 256) / 2)
        expect(toggleBox.x).toBeGreaterThan(headingBox.x)
        const originalY = (await box(header)).y
        await page.locator('#admin-main').evaluate((el) => {
          el.scrollTop = 900
        })
        await expect
          .poll(() => page.locator('#admin-main').evaluate((el) => el.scrollTop))
          .toBeGreaterThan(500)
        expect((await box(header)).y).toBe(originalY)
        await expect(toggle).toBeInViewport()
        for (const sw of await page.getByRole('switch').all()) {
          await sw.scrollIntoViewIfNeeded()
          const track = await box(sw.locator('.ui-switch-track'))
          const thumb = await box(sw.locator('.ui-switch-thumb'))
          expect(thumb.x).toBeGreaterThan(track.x)
          expect(thumb.x + thumb.width).toBeLessThan(track.x + track.width)
          expect(Math.abs(thumb.y + thumb.height / 2 - track.y - track.height / 2)).toBeLessThan(1)
          expect((await box(sw)).height).toBeGreaterThanOrEqual(44)
        }
        await page.screenshot({
          path: `.tools/layout-fixtures/admin-${lang}-${theme}-${width}.png`,
        })
        if (width === 1280) {
          const originalWidth = (await box(page.locator('#admin-main'))).width
          await load('admin-collapsed')
          expect((await box(page.locator('#admin-main'))).width).toBeGreaterThan(
            originalWidth + 200,
          )
        }
        for (const role of ['guest', 'customer', 'admin']) {
          await load(`store-${role}`)
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
          ).toBeLessThanOrEqual(width)
          if (role === 'admin') {
            const adminLink = page.getByRole('link', {
              name: lang === 'ar' ? 'لوحة التحكم' : 'Dashboard',
            })
            await expect(adminLink).toBeVisible()
            expect(await adminLink.getAttribute('href')).toBe('/admin')
          }
          const menu = page.getByRole('menu')
          await expect(menu).toBeInViewport()
          for (const link of await menu.locator('.social-menu-links a').all()) {
            await link.scrollIntoViewIfNeeded()
            await expect(link).toBeInViewport()
            await expect(link.locator('svg')).toBeVisible()
            if (width < 640) expect((await box(link.locator('span'))).width).toBeLessThanOrEqual(1)
            else expect((await box(link.locator('span'))).width).toBeGreaterThan(20)
          }
        }
        await page.screenshot({ path: `.tools/layout-fixtures/${lang}-${theme}-${width}.png` })
      })
    }
