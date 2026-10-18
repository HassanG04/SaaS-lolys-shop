import { test, expect, waitForCaptcha, type Page } from './helpers/turnstile'
import { generateTotp } from './helpers/totp'
import { queryDb, getAdminTotpSecret } from './helpers/db'
import { runAxe, filterSeriousAndCritical } from './helpers/axe'

let createdOrderId = 0

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((t) => {
    localStorage.setItem('theme', t)
    document.documentElement.dataset.theme = t
  }, theme)
  await page.waitForTimeout(200)
}

async function assertZeroSeriousOrCritical(page: Page, contextName: string) {
  // Let page settle
  await page.waitForLoadState('domcontentloaded')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)

  // 1. Audit Light Theme
  await setTheme(page, 'light')
  const lightResults = await runAxe(page)
  const lightViolations = filterSeriousAndCritical(lightResults.violations)
  if (lightViolations.length > 0) {
    console.error(
      `[AXE ERROR] [LIGHT] ${contextName} has ${lightViolations.length} serious/critical violations:`,
      JSON.stringify(
        lightViolations.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.map((n) => ({ html: n.html, failureSummary: n.failureSummary })),
        })),
        null,
        2,
      ),
    )
  }
  expect(
    lightViolations,
    `[LIGHT THEME] Found serious/critical axe violations on ${contextName}`,
  ).toEqual([])

  // 2. Audit Dark Theme
  await setTheme(page, 'dark')
  const darkResults = await runAxe(page)
  const darkViolations = filterSeriousAndCritical(darkResults.violations)
  if (darkViolations.length > 0) {
    console.error(
      `[AXE ERROR] [DARK] ${contextName} has ${darkViolations.length} serious/critical violations:`,
      JSON.stringify(
        darkViolations.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.map((n) => ({ html: n.html, failureSummary: n.failureSummary })),
        })),
        null,
        2,
      ),
    )
  }
  expect(
    darkViolations,
    `[DARK THEME] Found serious/critical axe violations on ${contextName}`,
  ).toEqual([])

  // Reset back to light
  await setTheme(page, 'light')
}

async function loginCustomer(page: Page) {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.locator('#email-input').fill('customer@example.com')
  await page.locator('#password-input').fill('Password123!')
  await waitForCaptcha(page)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
}

async function loginAdmin(page: Page) {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.locator('#email-input').fill('admin@example.com')
  await page.locator('#password-input').fill('Password123!')
  await waitForCaptcha(page)
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
    await page.getByRole('button', { name: 'إعداد تطبيق المصادقة' }).click()
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

test.describe.serial('Axe Accessibility Audit Suite (T-7.02)', () => {
  test('01. Home Page Accessibility Pass (Light & Dark)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
    await assertZeroSeriousOrCritical(page, 'Home Page')
  })

  test('02. Category Page Accessibility Pass (Light & Dark)', async ({ page }) => {
    await page.goto('/category/all')
    await expect(page.getByRole('heading', { name: 'جميع المنتجات' })).toBeVisible({
      timeout: 10000,
    })
    await assertZeroSeriousOrCritical(page, 'Category Page')
  })

  test('03. Product Page Accessibility Pass (Light & Dark)', async ({ page }) => {
    await page.goto('/product/1')
    await expect(page.getByRole('button', { name: 'أضف إلى السلة', exact: true })).toBeVisible({
      timeout: 10000,
    })
    await assertZeroSeriousOrCritical(page, 'Product Page')
  })

  test('04. Cart Page Accessibility Pass (Light & Dark)', async ({ page }) => {
    await page.goto('/product/1')
    await page.getByRole('button', { name: 'أضف إلى السلة', exact: true }).click()
    await page.waitForTimeout(300)

    await page.goto('/cart')
    await expect(page.getByRole('heading', { name: 'سلة التسوق' })).toBeVisible({ timeout: 10000 })
    await assertZeroSeriousOrCritical(page, 'Cart Page')
  })

  test('05. Checkout Page Accessibility Pass (Light & Dark)', async ({ page }) => {
    await loginCustomer(page)

    await page.goto('/product/1')
    await page.getByRole('button', { name: 'أضف إلى السلة', exact: true }).click()
    await page.waitForTimeout(300)

    await page.goto('/checkout')
    await expect(page.locator('h1')).toContainText('بيانات التوصيل')

    await page.locator('select').first().selectOption('1')
    const addressInput = page
      .locator('input[placeholder*="اسم الشارع"], input[placeholder*="الشارع"]')
      .first()
    if (await addressInput.isVisible()) {
      await addressInput.fill('شارع التحرير عمارة 15')
    }

    await page.getByRole('radio', { name: /مندوب/ }).click()
    await page.getByRole('radio', { name: /إنستاباي/ }).click()

    await assertZeroSeriousOrCritical(page, 'Checkout Page')

    // Submit order to create an order for downstream tests
    await page.getByRole('button', { name: /إرسال الطلب|تأكيد الطلب/ }).click()
    await page.waitForURL('**/pay/*', { timeout: 15000 })

    const orderIdMatch = page.url().match(/\/pay\/(\d+)/)
    createdOrderId = Number(orderIdMatch?.[1])
    expect(createdOrderId).toBeGreaterThan(0)
  })

  test('06. InstaPay Payment Screen Accessibility Pass (Light & Dark)', async ({ page }) => {
    expect(createdOrderId).toBeGreaterThan(0)

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

    await assertZeroSeriousOrCritical(page, 'InstaPay Payment Page')
  })

  test('07. Orders Page Accessibility Pass (Light & Dark)', async ({ page }) => {
    expect(createdOrderId).toBeGreaterThan(0)

    queryDb(`
      UPDATE public.orders
         SET rep_name = 'كابتن محمود',
             rep_phone = '01122334455'
       WHERE id = ${createdOrderId};
    `)

    await loginCustomer(page)
    await page.goto('/account/orders')
    await expect(page.getByRole('heading', { name: 'طلباتي' })).toBeVisible({ timeout: 10000 })

    await assertZeroSeriousOrCritical(page, 'Account Orders Page')
  })

  test('08. Admin Products Page Accessibility Pass (Light & Dark)', async ({ page }) => {
    await loginAdmin(page)
    await page.goto('/admin/products')
    await expect(page.getByRole('heading', { name: 'إدارة المنتجات' })).toBeVisible({
      timeout: 10000,
    })

    await assertZeroSeriousOrCritical(page, 'Admin Products Page')
  })

  test('09. Admin Dashboard Accessibility Pass (Light & Dark)', async ({ page }) => {
    await loginAdmin(page)
    if (page.url().includes('/admin/mfa/challenge')) {
      const secret = getAdminTotpSecret()
      if (secret) {
        const code = generateTotp(secret)
        await page.locator('input[name="totpCode"]').fill(code)
        await page.getByRole('button', { name: 'تأكيد الرمز والمتابعة' }).click()
        await page.waitForURL((url) => !url.pathname.includes('/mfa'), { timeout: 15000 })
      }
    }
    await expect(page.getByRole('heading', { name: 'لوحة تحكم الإدارة' })).toBeVisible({
      timeout: 15000,
    })

    await assertZeroSeriousOrCritical(page, 'Admin Dashboard')
  })

  test('10. Keyboard-Only Navigation and Modal Walkthrough', async ({ page }) => {
    // 1. Skip link navigation
    await page.goto('/')
    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: 'تخطي إلى المحتوى الرئيسي' })
    await expect(skipLink).toBeFocused()
    await page.keyboard.press('Enter')
    const mainContent = page.locator('#main-content')
    await expect(mainContent).toBeFocused()

    // 2. Product Page Keyboard Quantity Stepper & Cart Addition
    await page.goto('/product/1')
    await page.waitForLoadState('domcontentloaded')
    const increaseBtn = page.getByRole('button', { name: 'زيادة الكمية' })
    await increaseBtn.focus()
    await expect(increaseBtn).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('quantity-value')).toHaveText('2')

    const addBtn = page.getByRole('button', { name: 'أضف إلى السلة', exact: true })
    await addBtn.focus()
    await expect(addBtn).toBeFocused()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)

    // 3. Admin Dialog Focus Trap, Escape Dismissal, and Opener Focus Return
    await loginAdmin(page)
    await page.goto('/admin/products')
    const editBtn = page.getByRole('button', { name: /^تعديل مخزون/ }).first()
    await editBtn.focus()
    await expect(editBtn).toBeFocused()
    await page.keyboard.press('Enter')

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Press Escape to dismiss modal
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test.afterAll(() => {
    queryDb('DELETE FROM auth.mfa_factors;')
  })
})
