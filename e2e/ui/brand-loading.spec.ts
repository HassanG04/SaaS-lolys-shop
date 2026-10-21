import { expect, test } from '@playwright/test'

for (const language of ['ar', 'en']) {
  test(`${language}: optimized header preserves brand images and bilingual fonts`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.addInitScript((lang) => localStorage.setItem('app-lang', lang), language)
    await page.goto('/')
    await expect(page.locator('main h1')).toBeVisible()

    // A missing unicode subset silently falls back to a system font; check actual
    // loaded faces, since FontFaceSet.check() alone also accepts that fallback.
    const loaded = await page.evaluate(async () => {
      const samples = ['Lolys123', 'إكسسوارات']
      return Promise.all(
        ['400 17px Cairo', '700 32px "Aref Ruqaa"'].flatMap((font) =>
          samples.map(async (text) => (await document.fonts.load(font, text)).length),
        ),
      )
    })
    expect(loaded.every((count) => count > 0)).toBe(true)

    const logo = page.locator('header a[aria-label="Lolys"] img')
    await expect(logo).toBeVisible()
    const thumbnail = await logo.evaluate(async (image: HTMLImageElement) => {
      await image.decode()
      return { width: image.naturalWidth, height: image.naturalHeight, src: image.currentSrc }
    })
    const sharingImage = await page.evaluate(async () => {
      const source = document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content
      if (!source) throw new Error('Missing sharing image')
      const image = new Image()
      image.src = source
      await image.decode()
      return { width: image.naturalWidth, src: image.src }
    })
    expect(thumbnail.width).toBeGreaterThanOrEqual(108) // 3x the mobile display size
    expect(thumbnail.width).toBe(thumbnail.height)
    expect(sharingImage.width).toBeGreaterThan(thumbnail.width)
    expect(sharingImage.src).not.toBe(thumbnail.src)
  })
}

test('mobile skips desktop search download, but resizing still enables search', async ({
  page,
}) => {
  const searchRequests: string[] = []
  page.on('request', (request) => {
    if (/\/assets\/NavbarSearch-[^/]+\.js$/.test(new URL(request.url()).pathname)) {
      searchRequests.push(request.url())
    }
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('main h1')).toBeVisible()
  expect(searchRequests).toHaveLength(0)
  await page.setViewportSize({ width: 1280, height: 800 })
  const search = page.locator('header').getByRole('searchbox')
  await expect(search).toBeVisible()
  expect(searchRequests).toHaveLength(1)
  await search.fill('chain')
  await search.press('Enter')
  await expect(page).toHaveURL(/\/search\?q=chain$/)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(search).toBeHidden()
})
