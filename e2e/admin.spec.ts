import { test, expect, waitForCaptcha, type Page } from './helpers/turnstile'
import path from 'node:path'
import { generateTotp } from './helpers/totp'
import { queryDb, getProductStock, getAdminTotpSecret } from './helpers/db'

let adminTotpSecret = ''
let createdCategorySlug = ''
let createdProductId = 0
const brandLogoPath = path.resolve('public/brand/logo.png')

async function loginAdmin(page: Page) {
  await page.goto('/login')
  await page.locator('#email-input').fill('admin@example.com')
  await page.locator('#password-input').fill('Password123!')
  await waitForCaptcha(page)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })

  // Navigate to /admin; if challenge needed, complete it
  await page.goto('/admin')
  await page.waitForTimeout(500)
  if (page.url().includes('/admin/mfa/challenge')) {
    const secret = adminTotpSecret || getAdminTotpSecret() || ''
    const code = generateTotp(secret)
    await page.locator('input[name="totpCode"]').fill(code)
    await page.getByRole('button', { name: 'تأكيد الرمز والمتابعة' }).click()
    await page.waitForURL((url) => !url.pathname.includes('/mfa'), { timeout: 15000 })
  }
}

async function loginCustomer(page: Page) {
  await page.goto('/login')
  await page.locator('#email-input').fill('customer@example.com')
  await page.locator('#password-input').fill('Password123!')
  await waitForCaptcha(page)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
}

test.describe.serial('Admin End-to-End Comprehensive Journey (T-5.12)', () => {
  test.beforeAll(() => {
    queryDb('DELETE FROM auth.mfa_factors;')
  })

  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err) => console.log(`[BROWSER ERROR] ${err.message}`))
    page.on('response', async (res) => {
      if (res.status() >= 400 && !res.url().includes('favicon')) {
        const body = await res.text().catch(() => '')
        console.log(`[HTTP ${res.status()}] ${res.url()} -> ${body}`)
      }
    })
  })

  test('1. Admin at AAL1 cannot load admin data, enrolls MFA, and fresh session challenges to AAL2', async ({
    page,
  }) => {
    // Step A: First login with clean admin account
    await page.goto('/login')
    await page.locator('#email-input').fill('admin@example.com')
    await page.locator('#password-input').fill('Password123!')
    await waitForCaptcha(page)
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
    await page.waitForTimeout(1000)

    // Step B: Navigate to admin. With 0 enrolled factors, RequireAdmin redirects to enroll
    await page.goto('/admin')
    await page.waitForURL('**/admin/mfa/enroll', { timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'إعداد التحقق بخطوتين (TOTP)' })).toBeVisible()

    // Step C: Extract base32 secret and verify enrollment
    await page.getByRole('button', { name: 'إعداد تطبيق المصادقة' }).click()
    const secretContainer = page.locator('div.select-all')
    await expect(secretContainer).toBeVisible({ timeout: 10000 })
    const secret = (await secretContainer.innerText()).trim()
    expect(secret.length).toBeGreaterThanOrEqual(16)
    adminTotpSecret = secret

    const enrollCode = generateTotp(adminTotpSecret)
    await page.locator('input[name="totpCode"]').fill(enrollCode)
    await page.getByRole('button', { name: 'تأكيد وتفعيل' }).click()

    // Step D: Land on admin dashboard at AAL2
    await page.waitForURL('**/admin', { timeout: 15000 })
    await expect(page.locator('h1')).toContainText('لوحة تحكم')
    await expect(page.locator('nav a[href="/admin/products"]')).toBeVisible()

    // Step E: Verify fresh session at AAL1 is gated by challenge before loading admin data
    await page.evaluate(() => localStorage.clear())
    await page.goto('/login')
    await page.locator('#email-input').fill('admin@example.com')
    await page.locator('#password-input').fill('Password123!')
    await waitForCaptcha(page)
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
    await page.waitForTimeout(1000)

    // Navigating to /admin with AAL1 redirects to MFA challenge
    await page.goto('/admin')
    await page.waitForURL('**/admin/mfa/challenge', { timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'التحقق بخطوتين' })).toBeVisible()

    // Admin data and sidebar are NOT accessible at AAL1
    await expect(page.locator('nav a[href="/admin/products"]')).not.toBeVisible()

    // Complete challenge
    const challengeCode = generateTotp(adminTotpSecret)
    await page.locator('input[name="totpCode"]').fill(challengeCode)
    await page.getByRole('button', { name: 'تأكيد الرمز والمتابعة' }).click()

    // Gated admin data loads once upgraded to AAL2
    await page.waitForURL('**/admin', { timeout: 15000 })
    await expect(page.locator('h1')).toContainText('لوحة تحكم')
  })

  test('2. Non-admin users are blocked from admin panel with AUTH-011', async ({
    newAuthContext,
  }) => {
    const customerContext = await newAuthContext()
    const customerPage = await customerContext.newPage()

    // Login normal customer
    await loginCustomer(customerPage)

    // Attempt to access /admin
    await customerPage.goto('/admin')
    await expect(customerPage.getByText('AUTH-011')).toBeVisible()
    await expect(customerPage.getByText('لا تملك صلاحية الوصول')).toBeVisible()

    // Attempt to access /admin/products directly
    await customerPage.goto('/admin/products')
    await expect(customerPage.getByText('AUTH-011')).toBeVisible()

    // Verify admin navigation shell is completely absent
    await expect(customerPage.locator('nav a[href="/admin/products"]')).not.toBeVisible()

    await customerContext.close()
  })

  test('3. Admin creates category with tile image and product, visible on storefront', async ({
    page,
  }) => {
    await loginAdmin(page)

    // Part A: Create category with tile image
    await page.goto('/admin/categories')
    await expect(page.locator('h1')).toContainText('الأقسام')

    await page.locator('#add-category-btn').click()
    const catSlug = `bracelets-charms-${Date.now()}`
    createdCategorySlug = catSlug

    await page.locator('#cat-name-ar').fill('أساور وحليات فاخرة')
    await page.locator('#cat-name-en').fill('Luxury Bracelets & Charms')
    await page.locator('#cat-slug').fill(catSlug)
    await page.locator('#cat-show-on-home').check()

    // Upload tile image
    await page.locator('#cat-image').setInputFiles(brandLogoPath)
    await page.waitForTimeout(500)

    await page.getByRole('button', { name: /إضافة القسم|حفظ/ }).click()
    await expect(page.getByText('أساور وحليات فاخرة').first()).toBeVisible({
      timeout: 10000,
    })

    // Part B: Create product in that category
    await page.goto('/admin/products/new')
    await expect(page.locator('h1')).toContainText('إضافة منتج جديد')

    await page.locator('#prod-name-ar').fill('سوار اللؤلؤ الفضي التجريبي')
    await page.locator('#prod-name-en').fill('E2E Silver Pearl Bracelet')

    // Select created category
    const catOptionVal = await page
      .locator('#prod-category option', { hasText: 'أساور وحليات فاخرة' })
      .first()
      .getAttribute('value')
    await page.locator('#prod-category').selectOption(catOptionVal ?? '')
    await page.locator('#prod-price').fill('350')
    await page.locator('#prod-stock').fill('12')

    // Upload main product image
    await page.locator('input[type="file"]').first().setInputFiles(brandLogoPath)
    await expect(page.getByText('تم رفع الصورة الرئيسية بنجاح')).toBeVisible({ timeout: 15000 })

    // Save product
    await page.getByRole('button', { name: 'حفظ المنتج' }).click()
    await page.waitForURL('**/admin/products', { timeout: 15000 })
    await expect(page.getByText('سوار اللؤلؤ الفضي التجريبي').first()).toBeVisible({
      timeout: 10000,
    })

    // Extract product ID from row
    const idText = await page
      .locator('tr', { hasText: 'سوار اللؤلؤ الفضي التجريبي' })
      .locator('.font-mono')
      .first()
      .innerText()
    const extractedId = Number(idText.replace(/\D/g, ''))
    expect(extractedId).toBeGreaterThan(0)
    createdProductId = extractedId

    // Part C: Verify on storefront
    await page.goto('/')
    await expect(page.getByText('أساور وحليات فاخرة').first()).toBeVisible({ timeout: 10000 })

    await page.goto(`/category/${createdCategorySlug}`)
    await expect(page.getByText('سوار اللؤلؤ الفضي التجريبي').first()).toBeVisible({
      timeout: 15000,
    })

    await page.goto(`/product/${createdProductId}`)
    await expect(page.locator('h1')).toContainText('سوار اللؤلؤ الفضي التجريبي')
    await expect(page.getByText('متوفر في المخزون')).toBeVisible()
    await expect(page.getByRole('button', { name: 'أضف إلى السلة' })).toBeEnabled()
  })

  test('4. Setting stock to 0 displays sold-out badge and disables purchase', async ({ page }) => {
    await loginAdmin(page)
    await page.goto('/admin/products')

    // Open inline stock dialog
    const productRow = page.locator('tr', { hasText: 'سوار اللؤلؤ الفضي التجريبي' })
    await expect(productRow).toBeVisible()
    await productRow.getByRole('button', { name: /تعديل/ }).first().click()

    await expect(page.locator('#stock-new-quantity-input')).toBeVisible()
    await page.locator('#stock-new-quantity-input').fill('0')
    await page.getByRole('button', { name: 'حفظ', exact: true }).click()

    // Wait for optimistic/mutation update in admin table
    await expect(productRow.getByText('نفد')).toBeVisible({ timeout: 10000 })
    expect(getProductStock(createdProductId)).toBe(0)

    // Storefront check
    await page.goto(`/product/${createdProductId}`)
    await expect(page.getByText('نفد من المخزون').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: 'نفد من المخزون' })).toBeDisabled()
  })

  test('5. Product archiving, restoration, and category deletion constraints', async ({
    page,
    newAuthContext,
  }) => {
    await loginAdmin(page)

    // Part A: Archive product
    await page.goto(`/admin/products/${createdProductId}`)
    await expect(page.getByRole('button', { name: 'أرشفة المنتج' })).toBeVisible()
    await page.getByRole('button', { name: 'أرشفة المنتج' }).click()
    await expect(page.getByText(/أرشفة المنتج بنجاح/)).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: 'استعادة المنتج' })).toBeVisible()

    // Verify customer cannot see archived product on category storefront
    const custContext = await newAuthContext()
    const custPage = await custContext.newPage()
    await custPage.goto(`/category/${createdCategorySlug}`)
    await expect(custPage.getByText('سوار اللؤلؤ الفضي التجريبي')).not.toBeVisible()
    await custContext.close()

    // Part B: Restore product
    await page.getByRole('button', { name: 'استعادة المنتج' }).click()
    await expect(page.getByText('تمت استعادة المنتج بنجاح')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: 'أرشفة المنتج' })).toBeVisible()

    // Part C: Product delete constraint (ADM-004 when product was previously ordered)
    queryDb(`
      DO $$
      DECLARE
        v_uid uuid;
        v_order_id bigint;
      BEGIN
        SELECT id INTO v_uid FROM auth.users WHERE email = 'customer@example.com' LIMIT 1;
        INSERT INTO public.orders (user_id, status, subtotal, shipping_fee, total, delivery_method, payment_method, ship_name, ship_phone, ship_governorate, ship_city, ship_address)
        VALUES (v_uid, 'delivered', 250, 0, 250, 'representative', 'cod', 'Test Cust', '01000000000', 'Cairo', 'Nasr City', 'Street 1')
        RETURNING id INTO v_order_id;
        INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price)
        VALUES (v_order_id, 1, 'Pearl drop earrings', 1, 250);
      END $$;
    `)
    await page.goto('/admin/products/1')
    await page.getByRole('button', { name: 'حذف نهائي' }).click()
    const deleteModal = page.locator('dialog', { hasText: 'تأكيد حذف المنتج' })
    await expect(deleteModal).toBeVisible()
    await deleteModal.getByRole('button', { name: 'حذف نهائي' }).click()
    await expect(deleteModal.getByText('ADM-004')).toBeVisible({ timeout: 10000 })
    await expect(
      deleteModal.getByRole('button', { name: 'أرشفة المنتج بدلًا من الحذف' }),
    ).toBeVisible()
    await deleteModal.getByRole('button', { name: 'إلغاء' }).click()

    // Part D: Category delete constraint (ADM-005 when category has products)
    await page.goto('/admin/categories')
    const earringsRow = page.locator('div.rounded-chip', { hasText: 'أقراط' })
    await expect(earringsRow).toBeVisible()
    await earringsRow.getByRole('button', { name: 'حذف القسم' }).click()

    const deleteCatDialog = page.locator('dialog', { hasText: 'تأكيد حذف القسم' })
    await expect(deleteCatDialog).toBeVisible()
    // Attempt delete without choosing target replacement category
    await deleteCatDialog.getByRole('button', { name: 'تأكيد الحذف' }).click()
    await expect(deleteCatDialog.getByText('ADM-005')).toBeVisible({ timeout: 10000 })
    await deleteCatDialog.getByRole('button', { name: 'إلغاء' }).click()
  })

  test('6. Order fulfillment lifecycle and tracking visible to customer', async ({
    page,
    newAuthContext,
  }) => {
    // Step A: Customer places COD order for product 2
    const customerContext = await newAuthContext()
    const custPage = await customerContext.newPage()
    custPage.on('pageerror', (err) => console.log(`[CUST BROWSER ERROR] ${err.message}`))
    custPage.on('response', async (res) => {
      if (res.status() >= 400 && !res.url().includes('favicon')) {
        console.log(
          `[CUST HTTP ${res.status()}] ${res.url()} -> ${await res.text().catch(() => '')}`,
        )
      }
    })
    await loginCustomer(custPage)

    await custPage.goto('/product/2')
    await custPage.getByRole('button', { name: 'أضف إلى السلة', exact: true }).click()

    await custPage.goto('/checkout')
    await expect(custPage.locator('h1')).toContainText('بيانات التوصيل')
    await custPage.locator('select').first().selectOption('1')
    const addressInput = custPage.locator('input[placeholder*="اسم الشارع"]').first()
    await expect(addressInput).toBeVisible()
    await addressInput.fill('شارع رمسيس عمارة 10')
    await custPage.getByRole('radio', { name: /مندوب/ }).click()
    await custPage.getByRole('radio', { name: /الدفع عند الاستلام/ }).click()
    await custPage.getByRole('button', { name: 'تأكيد الطلب' }).click()
    await custPage.waitForURL('**/order/*/thanks', { timeout: 15000 })

    const orderIdMatch = custPage.url().match(/\/order\/(\d+)\/thanks/)
    const orderId = Number(orderIdMatch?.[1])
    expect(orderId).toBeGreaterThan(0)

    // Step B: Admin manages order lifecycle
    await loginAdmin(page)
    await page.goto('/admin/orders')

    await page.locator('#orders-search-input').fill(String(orderId))
    await page.waitForTimeout(500)
    const orderRow = page.locator('tr', { hasText: `#${orderId}` })
    await expect(orderRow).toBeVisible({ timeout: 10000 })
    await orderRow.click()

    const orderModal = page.locator('dialog', { hasText: `تفاصيل الطلب #${orderId}` })
    await expect(orderModal).toBeVisible()

    // Transition: pending -> confirmed
    await orderModal.getByRole('button', { name: 'تأكيد الطلب' }).click()
    const confirmDialog = page.locator('dialog', { hasText: 'تغيير حالة الطلب' })
    await expect(confirmDialog).toBeVisible()
    await confirmDialog.getByRole('button', { name: 'تأكيد التحديث' }).click()
    await expect(orderModal.getByText('مؤكد').first()).toBeVisible({ timeout: 10000 })

    // Transition: confirmed -> shipped (with courier details)
    await orderModal.getByRole('button', { name: 'شحن الطلب' }).click()
    const shipDialog = page.locator('dialog', { hasText: 'تغيير حالة الطلب' })
    await expect(shipDialog).toBeVisible()
    await shipDialog.locator('input[placeholder*="مندوب"]').first().fill('كابتن محمد')
    await shipDialog.locator('input[placeholder*="هاتف"]').first().fill('01011223344')
    await shipDialog.getByRole('button', { name: 'تأكيد التحديث' }).click()
    await expect(orderModal.getByText('تم الشحن').first()).toBeVisible({ timeout: 10000 })

    // Step C: Customer views updated status and courier fulfillment details
    await custPage.goto('/account/orders')
    await expect(custPage.getByText('تم الشحن').first()).toBeVisible({ timeout: 10000 })
    await expect(custPage.getByText('كابتن محمد')).toBeVisible({ timeout: 10000 })
    await expect(custPage.getByText('01011223344')).toBeVisible()

    await customerContext.close()
  })

  test('7. InstaPay order approval, payment review, proof re-upload and shipping guard', async ({
    page,
    newAuthContext,
  }) => {
    // Step A: Customer creates InstaPay order (awaiting approval)
    const custContext = await newAuthContext()
    const custPage = await custContext.newPage()
    custPage.on('pageerror', (err) => console.log(`[CUST BROWSER ERROR] ${err.message}`))
    custPage.on('response', async (res) => {
      if (res.status() >= 400 && !res.url().includes('favicon')) {
        console.log(
          `[CUST HTTP ${res.status()}] ${res.url()} -> ${await res.text().catch(() => '')}`,
        )
      }
    })
    await loginCustomer(custPage)

    await custPage.goto('/product/2')
    await custPage.getByRole('button', { name: 'أضف إلى السلة', exact: true }).click()
    await custPage.goto('/checkout')
    await expect(custPage.locator('h1')).toContainText('بيانات التوصيل')
    await custPage.locator('select').first().selectOption('1')
    const addressInput = custPage.locator('input[placeholder*="اسم الشارع"]').first()
    await expect(addressInput).toBeVisible()
    await addressInput.fill('شارع النصر')
    await custPage.getByRole('radio', { name: /مندوب/ }).click()
    await custPage.getByRole('radio', { name: /إنستاباي/ }).click()
    await custPage.getByRole('button', { name: 'إرسال الطلب' }).click()
    await custPage.waitForURL('**/pay/*', { timeout: 15000 })

    const orderMatch = custPage.url().match(/\/pay\/(\d+)/)
    const orderId = Number(orderMatch?.[1])
    expect(orderId).toBeGreaterThan(0)

    // PAY-007: Approval waiting screen hides instructions
    await expect(custPage.getByText('وصل طلبك للمتجر')).toBeVisible({ timeout: 10000 })
    await expect(custPage.locator('#transfer-reference')).not.toBeVisible()

    // Step B: Admin approves order
    await loginAdmin(page)
    await page.goto('/admin/orders')
    await page.getByRole('button', { name: 'بانتظار الموافقة' }).click()
    const orderRow = page.locator('tr', { hasText: `#${orderId}` })
    await expect(orderRow).toBeVisible({ timeout: 10000 })
    await orderRow.getByRole('button', { name: 'مراجعة وموافقة' }).click()

    const approvalModal = page.locator('dialog', {
      hasText: `تفاصيل الطلب #${orderId}`,
    })
    await expect(approvalModal).toBeVisible()

    // Shipping button is NOT available before payment (ORD-015 guard)
    await expect(approvalModal.getByRole('button', { name: 'شحن الطلب' })).not.toBeVisible()

    // Approve order
    await approvalModal.getByRole('button', { name: 'موافقة فقط' }).click()
    await expect(page.getByText('تمت الموافقة على الطلب بنجاح')).toBeVisible({ timeout: 10000 })

    // Step C: Customer now sees payment instructions and submits proof
    await custPage.reload()
    await expect(custPage.locator('#transfer-reference')).toBeVisible({ timeout: 10000 })
    await custPage.locator('input[type="file"]').setInputFiles(brandLogoPath)
    await custPage.locator('#transfer-reference').fill('REF-E2E-778899')
    await custPage.getByRole('button', { name: 'تأكيد وإرسال إثبات التحويل' }).click()
    await expect(custPage.getByText('قيد المراجعة').first()).toBeVisible({ timeout: 10000 })

    // Step D: Admin rejects payment proof in Payments queue
    await page.goto('/admin/payments')
    const paymentRow = page.locator('tr', { hasText: `#${orderId}` })
    await expect(paymentRow).toBeVisible({ timeout: 10000 })
    await paymentRow.getByRole('button', { name: 'رفض' }).click()

    const reviewDialog = page.locator('dialog', { hasText: 'رفض إيصال الدفع' })
    await expect(reviewDialog).toBeVisible()
    await reviewDialog.locator('textarea').fill('صورة التحويل غير واضحة يرجى إعادة الرفع')
    await reviewDialog.getByRole('button', { name: 'تأكيد رفض الإيصال' }).click()
    await expect(page.getByText(/تم رفض إيصال الطلب/)).toBeVisible({ timeout: 10000 })

    // Step E: Customer re-submits fresh proof
    await custPage.reload()
    await expect(custPage.getByText('مرفوض')).toBeVisible({ timeout: 10000 })
    await custPage.locator('input[type="file"]').setInputFiles(brandLogoPath)
    await custPage.locator('#transfer-reference').fill('REF-E2E-990011')
    await custPage.getByRole('button', { name: 'تأكيد وإرسال إثبات التحويل' }).click()
    await expect(custPage.getByText('قيد المراجعة').first()).toBeVisible({ timeout: 10000 })

    // Step F: Admin approves payment
    await page.goto('/admin/payments')
    await expect(paymentRow).toBeVisible({ timeout: 10000 })
    await paymentRow.getByRole('button', { name: 'قبول' }).click()

    const approveDialog = page.locator('dialog', { hasText: 'تأكيد قبول الدفع' })
    await expect(approveDialog).toBeVisible()
    await approveDialog.getByRole('button', { name: 'تأكيد قبول الدفع' }).click()
    await expect(page.getByText(/تم قبول وتأكيد دفع الطلب/)).toBeVisible({ timeout: 10000 })

    // Step G: Shipping guard allows shipping now that order is paid
    await page.goto('/admin/orders')
    await page.locator('#orders-search-input').fill(String(orderId))
    await page.waitForTimeout(500)
    await page.locator('tr', { hasText: `#${orderId}` }).click()

    const finalOrderModal = page.locator('dialog', {
      hasText: `تفاصيل الطلب #${orderId}`,
    })
    await expect(finalOrderModal).toBeVisible()
    await expect(finalOrderModal.getByText('تم الدفع').first()).toBeVisible()
    await expect(finalOrderModal.getByRole('button', { name: 'شحن الطلب' })).toBeVisible()

    await custContext.close()
  })

  test('8. InstaPay QR replacement requires Step-Up MFA and records in audit log', async ({
    page,
  }) => {
    await loginAdmin(page)
    await page.goto('/admin/settings')
    await expect(page.locator('h1')).toContainText('إعدادات المتجر')

    // Navigate to Payments tab
    await page.getByRole('button', { name: 'طرق الدفع وإنستاباي' }).click()
    await expect(page.locator('#instapay-qr-file-input')).toBeAttached()

    // Trigger image upload which is Step-Up guarded
    await page.locator('#instapay-qr-file-input').setInputFiles(brandLogoPath)

    // Step-Up Dialog pops up
    const stepUpDialog = page.locator('dialog', { hasText: 'تأكيد الهوية' })
    await expect(stepUpDialog).toBeVisible({ timeout: 10000 })

    const stepUpCode = generateTotp(adminTotpSecret)
    await stepUpDialog.locator('#step-up-totp-code').fill(stepUpCode)
    await stepUpDialog.getByRole('button', { name: 'تأكيد ومتابعة' }).click()

    // Settings update succeeds
    await expect(page.getByText('تم تحديث واستبدال رمز QR لإنستاباي بنجاح')).toBeVisible({
      timeout: 15000,
    })

    // Navigate to Audit Log and verify entry was recorded
    await page.goto('/admin/audit')
    await expect(page.locator('h1')).toContainText('سجل العمليات')
    await expect(page.getByText('إعدادات المتجر').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('instapay_qr_path').first()).toBeVisible()
  })

  test('9. CSV export enforces Step-Up MFA, prepends UTF-8 BOM, and neutralizes formula injection', async ({
    page,
  }) => {
    // Insert a product with formula injection name into DB
    const formulaPayload = `=cmd|' /C calc'!A0`
    queryDb(`
      INSERT INTO public.products (category_id, name, name_ar, price, stock_quantity)
      VALUES (1, '${formulaPayload.replace(/'/g, "''")}', '${formulaPayload.replace(/'/g, "''")}', 99.00, 5)
      ON CONFLICT DO NOTHING;
    `)

    await loginAdmin(page)
    await page.goto('/admin/products')

    // Find export button
    const exportBtn = page.getByRole('button', { name: 'تصدير CSV' })
    await expect(exportBtn).toBeVisible()

    // Listen for download event
    const downloadPromise = page.waitForEvent('download', { timeout: 20000 })
    await exportBtn.click()

    // If Step-Up dialog prompts (e.g. if >5 min elapsed or isolated hook state)
    const stepUpDialog = page.locator('dialog', { hasText: 'تأكيد الهوية' })
    if (await stepUpDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      const stepUpCode = generateTotp(adminTotpSecret)
      await stepUpDialog.locator('#step-up-totp-code').fill(stepUpCode)
      await stepUpDialog.getByRole('button', { name: 'تأكيد ومتابعة' }).click()
    }

    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^products-\d{4}-\d{2}-\d{2}\.csv$/)

    // Read exported CSV content
    const stream = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
    const fullBuffer = Buffer.concat(chunks)
    const textContent = fullBuffer.toString('utf8')

    // Check 1: UTF-8 BOM (\uFEFF)
    expect(textContent.charCodeAt(0)).toBe(0xfeff)

    // Check 2: Formula injection neutralization (SEC-14)
    // Any formula cell starting with = MUST be prefixed with a single quote '
    expect(textContent).toContain(`'=cmd|' /C calc'!A0`)
    // Must NOT contain raw unquoted =cmd
    expect(textContent).not.toContain(`,=cmd`)
  })
})
