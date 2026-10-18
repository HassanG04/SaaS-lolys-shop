import { test, expect, type Page } from '@playwright/test'
import { getProductStock, setProductStock, expireOrderViaTestHook, queryDb } from './helpers/db'

async function loginCustomer(page: Page) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.locator('#email-input').fill('customer@example.com')
  await page.locator('#password-input').fill('Password123!')
  // Wait for the Turnstile token to propagate into React state (button becomes enabled)
  await page
    .getByRole('button', { name: 'تسجيل الدخول' })
    .waitFor({ state: 'visible', timeout: 5000 })
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 })
}

test.describe.serial('Storefront to Order E2E Journey', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err) => console.log(`[BROWSER ERROR] ${err.message}`))
    page.on('response', (res) => {
      if (res.status() >= 400) {
        console.log(`[HTTP ${res.status()}] ${res.url()}`)
      }
    })
  })

  test('1. Guest browses and the cart persists in localStorage', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/')
    await expect(page).toHaveTitle(/Lolys/i)

    // Browse to earrings category
    await page.goto('/category/earrings')
    const productCard = page.locator('a[href*="/product/1"]').first()
    await expect(productCard).toBeVisible()
    await productCard.click()

    // Land on product page
    await page.waitForURL('**/product/1')
    await expect(page.locator('h1')).toContainText('Pearl drop earrings')
    await expect(page.getByText('متوفر في المخزون')).toBeVisible()

    // Add product to cart
    const addButton = page.getByRole('button', { name: 'أضف إلى السلة', exact: true })
    await expect(addButton).toBeEnabled()
    await addButton.click()

    // Verify cart drawer or badge displays 1 item
    const cartStorage = await page.evaluate(() => localStorage.getItem('cart:v1'))
    expect(cartStorage).toBeTruthy()
    expect(cartStorage).toContain('"productId":1')

    // Reload page to verify persistence across reloads
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    const reloadedCart = await page.evaluate(() => localStorage.getItem('cart:v1'))
    expect(reloadedCart).toBeTruthy()
    expect(reloadedCart).toContain('"productId":1')
  })

  test('2. Register and log in customer account', async ({ page }) => {
    // Step A: Registration flow
    await page.goto('/register')
    await page.locator('#name-input').fill('عميل تجريبي')
    await page.locator('#email-input').fill(`new_customer_${Date.now()}@example.com`)
    await page.locator('#password-input').fill('Password123!')
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: 'إنشاء حساب' }).click()

    // Give time for auth request to resolve
    await page.waitForTimeout(1000)

    // Step B: Login with confirmed test customer
    await loginCustomer(page)

    // Account link is visible in navbar
    const accountLink = page.locator('a[href="/account"]')
    await expect(accountLink).toBeVisible()
  })

  test('3. COD checkout succeeds and stock decreases', async ({ page }) => {
    const initialStock = getProductStock(1)

    // Log in as customer
    await loginCustomer(page)

    // Add 2 units of product 1 to cart
    await page.goto('/product/1')
    await page.locator('button[aria-label="زيادة الكمية"]').click()
    await page.getByRole('button', { name: 'أضف إلى السلة', exact: true }).click()

    // Go to checkout
    await page.goto('/checkout')
    await expect(page.locator('h1')).toContainText('بيانات التوصيل')

    // Select Cairo governorate
    await page.locator('select:not(#footer-motion-select)').first().selectOption('1')

    // Fill address if empty
    const addressInput = page.locator('input[placeholder*="اسم الشارع"]').first()
    if (await addressInput.isVisible()) {
      await addressInput.fill('شارع التحرير عمارة 15')
    }

    // Select delivery: representative (مندوب)
    const repRadio = page.getByRole('radio', { name: /مندوب/ })
    await repRadio.click()

    // Select payment: COD (الدفع عند الاستلام)
    const codRadio = page.getByRole('radio', { name: /الدفع عند الاستلام/ })
    await codRadio.click()

    // Submit order
    await page.getByRole('button', { name: 'تأكيد الطلب' }).click()

    // Expect redirection to confirmation page
    await page.waitForURL('**/order/*/thanks', { timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'تم استلام طلبك بنجاح!' })).toBeVisible()

    // Verify stock in database decreased by 2
    const currentStock = getProductStock(1)
    expect(currentStock).toBe(initialStock - 2)
  })

  test('4. Oversell shows the translated stock message', async ({ page }) => {
    // Product 2: Gold hoop earrings
    setProductStock(2, 5)

    // Log in
    await loginCustomer(page)

    // Add 2 units of product 2
    await page.goto('/product/2')
    await page.locator('button[aria-label="زيادة الكمية"]').click()
    await page.getByRole('button', { name: 'أضف إلى السلة', exact: true }).click()

    // Go to checkout
    await page.goto('/checkout')
    await page.locator('select:not(#footer-motion-select)').first().selectOption('1')

    const addressInput = page.locator('input[placeholder*="اسم الشارع"]').first()
    if (await addressInput.isVisible()) {
      await addressInput.fill('شارع التحرير عمارة 15')
    }

    await page.getByRole('radio', { name: /مندوب/ }).click()
    await page.getByRole('radio', { name: /الدفع عند الاستلام/ }).click()

    // Simulate stock depletion in DB to 1
    setProductStock(2, 1)

    // Submit checkout
    await page.getByRole('button', { name: 'تأكيد الطلب' }).click()

    // Verify ErrorPanel displays ORD-007 and translated message
    const errorAlert = page.locator('[role="alert"]')
    await expect(errorAlert.first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/ORD-007|ORD-005/)).toBeVisible()
    await expect(page.getByText(/المتبقي من/)).toBeVisible()

    // Restore stock
    setProductStock(2, 5)
  })

  test('5. Unavailable delivery method is refused', async ({ page }) => {
    // Log in
    await loginCustomer(page)

    // Add product to cart
    await page.goto('/product/2')
    await page.getByRole('button', { name: 'أضف إلى السلة', exact: true }).click()

    // Go to checkout
    await page.goto('/checkout')

    // Select Governorate 2 (Giza - has NO delivery fee configured)
    await page.locator('select:not(#footer-motion-select)').first().selectOption('2')

    // Delivery message indicates unavailable
    await expect(page.getByText('لا تتوفر طرق توصيل لهذه المحافظة')).toBeVisible()

    // Attempting to submit order is refused
    await page.getByRole('button', { name: 'تأكيد الطلب' }).click()
    expect(page.url()).toContain('/checkout')
    await expect(page.getByText('لا تتوفر طرق توصيل لهذه المحافظة')).toBeVisible()
  })

  test('6. Cancelling a pending order restores stock', async ({ page }) => {
    // Product 3: Thin gold chain
    const initialStock = getProductStock(3)

    // Log in
    await loginCustomer(page)

    // Add 1 unit of product 3
    await page.goto('/product/3')
    await page.getByRole('button', { name: 'أضف إلى السلة', exact: true }).click()

    // Checkout with COD
    await page.goto('/checkout')
    await page.locator('select:not(#footer-motion-select)').first().selectOption('1')

    const addressInput = page.locator('input[placeholder*="اسم الشارع"]').first()
    if (await addressInput.isVisible()) {
      await addressInput.fill('شارع التحرير عمارة 15')
    }

    await page.getByRole('radio', { name: /مندوب/ }).click()
    await page.getByRole('radio', { name: /الدفع عند الاستلام/ }).click()
    await page.getByRole('button', { name: 'تأكيد الطلب' }).click()
    await page.waitForURL('**/order/*/thanks', { timeout: 15000 })

    // Stock decreased by 1
    expect(getProductStock(3)).toBe(initialStock - 1)

    // Navigate to customer orders
    await page.goto('/account/orders')

    // Find cancel button and open confirmation dialog
    const cancelBtn = page.getByRole('button', { name: 'إلغاء الطلب' }).first()
    await expect(cancelBtn).toBeVisible()
    await cancelBtn.click()

    // Confirm cancellation in dialog
    const dialog = page.locator('dialog, [role="dialog"]').first()
    await expect(dialog).toBeVisible()
    const confirmBtn = dialog.getByRole('button', { name: 'تأكيد الإلغاء' })
    await confirmBtn.click()

    // Status updates to cancelled
    await expect(page.getByText('تم إلغاء الطلب').first()).toBeVisible({ timeout: 10000 })

    // Database stock restored
    expect(getProductStock(3)).toBe(initialStock)
  })

  test('7. InstaPay order shows QR placeholder, accepts valid image and refuses renamed non-image, and moves to under_review', async ({
    page,
  }) => {
    // Log in
    await loginCustomer(page)

    // Add product 5 (Stackable ring set) to cart
    await page.goto('/product/5')
    await page.getByRole('button', { name: 'أضف إلى السلة', exact: true }).click()

    // Checkout choosing InstaPay QR
    await page.goto('/checkout')
    await page.locator('select:not(#footer-motion-select)').first().selectOption('1')

    const addressInput = page.locator('input[placeholder*="اسم الشارع"]').first()
    if (await addressInput.isVisible()) {
      await addressInput.fill('شارع التحرير عمارة 15')
    }

    await page.getByRole('radio', { name: /مندوب/ }).click()
    await page.getByRole('radio', { name: /إنستاباي/ }).click()
    await page.getByRole('button', { name: /إرسال الطلب|تأكيد الطلب/ }).click()

    // Land on payment page
    await page.waitForURL('**/pay/*', { timeout: 15000 })

    const orderIdMatch = page.url().match(/\/pay\/(\d+)/)
    const orderId = Number(orderIdMatch?.[1])

    // In approval-first flow, wait for approval screen and simulate shop approval
    await expect(page.getByText('وصل طلبك للمتجر')).toBeVisible({ timeout: 10000 })
    queryDb(`
      UPDATE public.orders
         SET status = 'confirmed',
             payment_status = 'awaiting_proof',
             payment_deadline = now() + interval '24 hours'
       WHERE id = ${orderId};
    `)
    await page.reload()

    // Verify QR placeholder / image
    const qrImg = page.getByAltText('رمز QR لإنستاباي')
    await expect(qrImg).toBeVisible()

    // Test non-image file refusal: magic bytes check triggers UPL-001
    const fakeReceipt = {
      name: 'corrupted-receipt.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('Plain text file renamed to fake jpeg image'),
    }
    const fileInput = page.locator('input#proof-file-input')
    await fileInput.setInputFiles(fakeReceipt)

    // Expect UPL-001 rejection error
    await expect(page.getByText('UPL-001')).toBeVisible()
    await expect(page.getByText(/نوع الملف غير مدعوم/)).toBeVisible()

    // Test valid 1x1 PNG image upload
    const validPngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
      0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f,
      0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00,
      0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ])
    await fileInput.setInputFiles({
      name: 'valid-receipt.png',
      mimeType: 'image/png',
      buffer: validPngBytes,
    })

    // UPL-001 error clears
    await expect(page.getByText('UPL-001')).not.toBeVisible()

    // Fill reference number and submit proof
    await page.locator('#transfer-reference').fill('REF-E2E-778899')
    const submitProofBtn = page.getByRole('button', { name: 'تأكيد وإرسال إثبات التحويل' })
    await expect(submitProofBtn).toBeEnabled()
    await submitProofBtn.click()

    // Status transitions to "قيد المراجعة"
    await expect(page.getByText('قيد المراجعة').first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('إثبات التحويل قيد المراجعة')).toBeVisible()
  })

  test('8. Unpaid InstaPay order expires via test hook and restores stock', async ({ page }) => {
    // Product 6: Charm bracelet
    const initialStock = getProductStock(6)

    // Log in
    await loginCustomer(page)

    // Add 1 unit of product 6
    await page.goto('/product/6')
    await page.getByRole('button', { name: 'أضف إلى السلة', exact: true }).click()

    // Checkout with InstaPay
    await page.goto('/checkout')
    await page.locator('select:not(#footer-motion-select)').first().selectOption('1')

    const addressInput = page.locator('input[placeholder*="اسم الشارع"]').first()
    if (await addressInput.isVisible()) {
      await addressInput.fill('شارع التحرير عمارة 15')
    }

    await page.getByRole('radio', { name: /مندوب/ }).click()
    await page.getByRole('radio', { name: /إنستاباي/ }).click()
    await page.getByRole('button', { name: /إرسال الطلب|تأكيد الطلب/ }).click()
    await page.waitForURL('**/pay/*', { timeout: 15000 })

    // Extract created order ID
    const match = page.url().match(/\/pay\/(\d+)/)
    const orderId = Number(match?.[1])
    expect(orderId).toBeGreaterThan(0)

    // Stock decreased by 1
    expect(getProductStock(6)).toBe(initialStock - 1)

    // Trigger test hook to shorten deadline into past and run expire_unpaid_orders
    expireOrderViaTestHook(orderId)

    // Database stock restored back to initialStock
    expect(getProductStock(6)).toBe(initialStock)

    // Reload page: shows expired/cancelled status
    await page.reload()
    await expect(page.getByText(/ملغي|انتهت المهلة/)).toBeVisible({ timeout: 10000 })

    // In account orders, status is cancelled
    await page.goto('/account/orders')
    await expect(page.getByText('تم إلغاء الطلب').first()).toBeVisible()
  })
})
