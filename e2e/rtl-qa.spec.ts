import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { generateTotp } from './helpers/totp'
import { queryDb, getAdminTotpSecret } from './helpers/db'

const SCREENSHOT_DIR = path.resolve('docs/qa/rtl')
let createdOrderId = 0

async function setThemeAndCapture(
  page: Page,
  filenamePrefix: string,
  options?: { fullPage?: boolean },
) {
  // Ensure network and fonts are settled
  await page.waitForLoadState('domcontentloaded')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)

  // Verify RTL document properties
  const dir = await page.evaluate(() => document.documentElement.dir)
  const lang = await page.evaluate(() => document.documentElement.lang)
  expect(dir).toBe('rtl')
  expect(lang).toBe('ar')

  // 1. Light Theme
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light')
    document.documentElement.dataset.theme = 'light'
  })
  await page.waitForTimeout(400)

  // Verify no horizontal overflow in light theme
  const isOverflowingLight = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(isOverflowingLight).toBe(false)

  // Capture light screenshot
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${filenamePrefix}-light.png`),
    fullPage: options?.fullPage ?? false,
  })

  // 2. Dark Theme
  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark')
    document.documentElement.dataset.theme = 'dark'
  })
  await page.waitForTimeout(400)

  // Verify no horizontal overflow in dark theme
  const isOverflowingDark = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(isOverflowingDark).toBe(false)

  // Capture dark screenshot
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${filenamePrefix}-dark.png`),
    fullPage: options?.fullPage ?? false,
  })

  // Reset back to light
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light')
    document.documentElement.dataset.theme = 'light'
  })
  await page.waitForTimeout(200)
}

async function loginCustomer(page: Page) {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.locator('#email-input').fill('customer@example.com')
  await page.locator('#password-input').fill('Password123!')
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
}

async function loginAdmin(page: Page) {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.locator('#email-input').fill('admin@example.com')
  await page.locator('#password-input').fill('Password123!')
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })

  await page.goto('/admin')
  await page.waitForURL((url) => url.pathname.startsWith('/admin'), { timeout: 15000 })
  await page.waitForLoadState('networkidle').catch(() => {})
  await page
    .waitForSelector('input[name="totpCode"], h1, #admin-main', { timeout: 8000 })
    .catch(() => {})

  if (
    page.url().includes('/admin/mfa/enroll') ||
    (await page
      .locator('div.select-all')
      .isVisible()
      .catch(() => false))
  ) {
    const secretContainer = page.locator('div.select-all')
    await expect(secretContainer).toBeVisible({ timeout: 10000 })
    const secret = (await secretContainer.innerText()).trim()
    const totpCode = generateTotp(secret)
    await page.locator('input[name="totpCode"]').fill(totpCode)
    await page.getByRole('button', { name: 'تأكيد وتفعيل' }).click()
    await page.waitForURL((url) => !url.pathname.includes('/mfa'), { timeout: 15000 })
  } else if (
    page.url().includes('/admin/mfa/challenge') ||
    (await page
      .locator('input[name="totpCode"]')
      .isVisible()
      .catch(() => false))
  ) {
    const secret = getAdminTotpSecret()
    if (secret) {
      const code = generateTotp(secret)
      await page.locator('input[name="totpCode"]').fill(code)
      await page.getByRole('button', { name: 'تأكيد الرمز والمتابعة' }).click()
      await page.waitForURL((url) => !url.pathname.includes('/mfa'), { timeout: 15000 })
    }
  }
}

test.describe.serial('RTL Visual QA and Screenshot Suite (T-7.01)', () => {
  test('01. Home Page RTL Visual QA (Light & Dark)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('تسوّق حسب القسم')).toBeVisible()

    await setThemeAndCapture(page, '01-home', { fullPage: true })
  })

  test('02. Category Page RTL Visual QA (Light & Dark)', async ({ page }) => {
    await page.goto('/category/all')
    await expect(page.getByRole('heading', { name: 'جميع المنتجات' })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText('ترتيب حسب')).toBeVisible()

    await setThemeAndCapture(page, '02-category')
  })

  test('03. Product Page RTL Visual QA (Light & Dark)', async ({ page }) => {
    await page.goto('/product/1')
    await expect(page.getByRole('button', { name: 'أضف إلى السلة', exact: true })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByTestId('quantity-value')).toBeVisible()

    await setThemeAndCapture(page, '03-product')
  })

  test('04. Cart Page RTL Visual QA (Light & Dark)', async ({ page }) => {
    // Add product to cart first
    await page.goto('/product/1')
    await page.getByRole('button', { name: 'أضف إلى السلة', exact: true }).click()
    await page.waitForTimeout(300)

    await page.goto('/cart')
    await expect(page.getByRole('heading', { name: 'سلة التسوق' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('ملخص الطلب')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /إتمام الطلب|تسجيل الدخول لإتمام الطلب/ }),
    ).toBeVisible()

    await setThemeAndCapture(page, '04-cart')
  })

  test('05. Checkout Page RTL Visual QA (Light & Dark)', async ({ page }) => {
    await loginCustomer(page)

    // Ensure cart has item
    await page.goto('/product/1')
    await page.getByRole('button', { name: 'أضف إلى السلة', exact: true }).click()
    await page.waitForTimeout(300)

    await page.goto('/checkout')
    await expect(page.locator('h1')).toContainText('بيانات التوصيل')

    // Select Cairo governorate
    await page.locator('select').first().selectOption('1')

    // Fill address
    const addressInput = page
      .locator('input[placeholder*="اسم الشارع"], input[placeholder*="الشارع"]')
      .first()
    if (await addressInput.isVisible()) {
      await addressInput.fill('شارع التحرير عمارة 15')
    }

    await page.getByRole('radio', { name: /مندوب/ }).click()
    await page.getByRole('radio', { name: /إنستاباي/ }).click()

    await setThemeAndCapture(page, '05-checkout')

    // Submit order to create an order for downstream tests
    await page.getByRole('button', { name: /إرسال الطلب|تأكيد الطلب/ }).click()
    await page.waitForURL('**/pay/*', { timeout: 15000 })

    const orderIdMatch = page.url().match(/\/pay\/(\d+)/)
    createdOrderId = Number(orderIdMatch?.[1])
    expect(createdOrderId).toBeGreaterThan(0)
  })

  test('06. InstaPay Payment Screen RTL Visual QA (Light & Dark)', async ({ page }) => {
    expect(createdOrderId).toBeGreaterThan(0)

    // Simulate shop approval
    queryDb(`
      UPDATE public.orders
         SET status = 'confirmed',
             payment_status = 'awaiting_proof',
             payment_deadline = now() + interval '24 hours'
       WHERE id = ${createdOrderId};
    `)

    await loginCustomer(page)
    await page.goto(`/pay/${createdOrderId}`)
    await expect(page.getByRole('heading', { name: 'خطوات الدفع عبر إنستاباي' })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByAltText('رمز QR لإنستاباي')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'رفع إثبات التحويل' })).toBeVisible()

    // Verify LTR isolation on order number and reference code
    const ltrCode = page.locator('code[dir="ltr"]').first()
    await expect(ltrCode).toBeVisible()

    await setThemeAndCapture(page, '06-instapay')
  })

  test('07. Orders Page RTL Visual QA (Light & Dark)', async ({ page }) => {
    expect(createdOrderId).toBeGreaterThan(0)

    // Set courier rep details on the order
    queryDb(`
      UPDATE public.orders
         SET rep_name = 'كابتن محمود',
             rep_phone = '01122334455'
       WHERE id = ${createdOrderId};
    `)

    await loginCustomer(page)
    await page.goto('/account/orders')
    await expect(page.getByRole('heading', { name: 'طلباتي' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('كابتن محمود').first()).toBeVisible({ timeout: 10000 })

    await setThemeAndCapture(page, '07-orders')
  })

  test('08. Admin Products Page RTL Visual QA (Light & Dark)', async ({ page }) => {
    await loginAdmin(page)
    await page.goto('/admin/products')
    await expect(page.getByRole('heading', { name: 'إدارة المنتجات' })).toBeVisible({
      timeout: 10000,
    })

    // Open Stock dialog to inspect modal RTL layout
    const firstEditStockBtn = page.getByRole('button', { name: /^تعديل مخزون/ }).first()
    await firstEditStockBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    await setThemeAndCapture(page, '08-admin-products')

    // Close modal
    await page.getByRole('button', { name: 'إلغاء' }).click()
  })

  test('09. Admin Dashboard RTL Visual QA (Light & Dark)', async ({ page }) => {
    await loginAdmin(page)
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'لوحة تحكم الإدارة' })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByRole('region', { name: 'مؤشرات الأداء الرئيسية' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'المبيعات اليومية' })).toBeVisible()

    await setThemeAndCapture(page, '09-admin-dashboard')
  })
})
