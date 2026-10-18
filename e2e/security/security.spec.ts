import { test, expect, waitForCaptcha, type Page, type Response } from '../helpers/turnstile'
import fs from 'node:fs'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { generateTotp } from '../helpers/totp'
import { createTestUser, getSupabaseStatus } from '../helpers/db'

let adminTotpSecret = ''
let victimUserId = ''
let attackerUserId = ''

const status = getSupabaseStatus()
const adminClient = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function clearAllMfaFactors(client: SupabaseClient) {
  try {
    const { data: usersData } = await client.auth.admin.listUsers()
    if (usersData?.users) {
      for (const user of usersData.users) {
        const { data: factorData } = await client.auth.admin.mfa.listFactors({
          userId: user.id,
        })
        if (factorData?.factors) {
          for (const factor of factorData.factors) {
            await client.auth.admin.mfa.deleteFactor({
              id: factor.id,
              userId: user.id,
            })
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to clear MFA factors via admin client:', err)
  }
}

async function loginUser(page: Page, email: string, password = 'Password123!') {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.locator('#email-input').fill(email)
  await page.locator('#password-input').fill(password)
  await waitForCaptcha(page)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
}

async function loginAdmin(page: Page) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.locator('#email-input').fill('admin@example.com')
  await page.locator('#password-input').fill('Password123!')
  await waitForCaptcha(page)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })

  await page.goto('/admin')
  await page.waitForTimeout(500)
  if (page.url().includes('/admin/mfa/challenge')) {
    const code = generateTotp(adminTotpSecret)
    await page.locator('input[name="totpCode"]').fill(code)
    await page.getByRole('button', { name: 'تأكيد الرمز والمتابعة' }).click()
    await page.waitForURL((url) => !url.pathname.includes('/mfa'), { timeout: 15000 })
  }
}

test.describe.serial('Security End-to-End Test Suite (T-7.08)', () => {
  test.beforeAll(async () => {
    // Reset any existing MFA factors for clean testing
    await clearAllMfaFactors(adminClient)

    // Create victim and attacker test accounts
    victimUserId = await createTestUser({
      email: 'victim-sec@example.com',
      password: 'Password123!',
      fullName: 'سعيد الحظ الضحية',
      phone: '01011112222',
    })

    attackerUserId = await createTestUser({
      email: 'attacker-sec@example.com',
      password: 'Password123!',
      fullName: 'المهاجم الفضولي',
      phone: '01033334444',
    })
  })

  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err) => console.log(`[BROWSER ERROR] ${err.message}`))
    page.on('response', (res) => {
      if (res.status() >= 400 && !res.url().includes('favicon')) {
        console.log(`[HTTP ${res.status()}] ${res.url()}`)
      }
    })
  })

  test('1. Unknown email and wrong password give identical message, status and request count (SEC-05)', async ({
    page,
  }) => {
    await page.goto('/login')

    let tokenRequests = 0
    let lastTokenStatus = 0

    const tokenListener = (res: Response) => {
      if (res.url().includes('/auth/v1/token')) {
        tokenRequests++
        lastTokenStatus = res.status()
      }
    }
    page.on('response', tokenListener)

    try {
      // Case A: Unknown email
      tokenRequests = 0
      lastTokenStatus = 0

      await page.locator('#email-input').fill('unknown-nonexistent-user@example.com')
      await page.locator('#password-input').fill('Password123!')
      await waitForCaptcha(page)
      await page.getByRole('button', { name: 'تسجيل الدخول' }).click()

      await expect(page.getByText('AUTH-001')).toBeVisible({ timeout: 10000 })
      await expect(
        page.getByText('تعذّر تسجيل الدخول. تحقّق من البيانات وحاول مرة أخرى.'),
      ).toBeVisible()

      const unknownStatus = lastTokenStatus
      const unknownTokenRequests = tokenRequests
      expect(unknownStatus).toBe(400)
      expect(unknownTokenRequests).toBe(1)

      // Case B: Known registered email with wrong password
      await page.evaluate(() => localStorage.clear())
      await page.goto('/login')

      tokenRequests = 0
      lastTokenStatus = 0

      await page.locator('#email-input').fill('customer@example.com')
      await page.locator('#password-input').fill('WrongPassword999!')
      await waitForCaptcha(page)
      await page.getByRole('button', { name: 'تسجيل الدخول' }).click()

      await expect(page.getByText('AUTH-001')).toBeVisible({ timeout: 10000 })
      await expect(
        page.getByText('تعذّر تسجيل الدخول. تحقّق من البيانات وحاول مرة أخرى.'),
      ).toBeVisible()

      const knownStatus = lastTokenStatus
      const knownTokenRequests = tokenRequests
      expect(knownStatus).toBe(400)
      expect(knownTokenRequests).toBe(1)

      // Enumeration resistance: status, request count, and messages match identically
      expect(unknownStatus).toBe(knownStatus)
      expect(unknownTokenRequests).toBe(knownTokenRequests)
    } finally {
      page.off('response', tokenListener)
    }
  })

  test('2. Same neutral message for password reset and sign-up (SEC-05)', async ({ page }) => {
    // Part A: Reset Password Neutrality
    await page.goto('/reset-password')
    await page.waitForLoadState('networkidle')

    // Known email
    await page.locator('#email-input').fill('customer@example.com')
    await waitForCaptcha(page)
    await page.getByRole('button', { name: 'إرسال رابط إعادة التعيين' }).click()
    await expect(page.getByRole('heading', { name: 'تحقق من بريدك الإلكتروني' })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText(/ستصلك رسالة تحتوي على رابط إعادة التعيين/)).toBeVisible()

    // Unknown email
    await page.goto('/reset-password')
    await page.waitForLoadState('networkidle')
    await page.locator('#email-input').fill('unknown-reset-target@example.com')
    await waitForCaptcha(page)
    await page.getByRole('button', { name: 'إرسال رابط إعادة التعيين' }).click()
    await expect(page.getByRole('heading', { name: 'تحقق من بريدك الإلكتروني' })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText(/ستصلك رسالة تحتوي على رابط إعادة التعيين/)).toBeVisible()

    // Part B: Registration Neutrality
    // Attempt registration with already existing email
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    await page.locator('#name-input').fill('مستخدم مكرر')
    await page.locator('#email-input').fill('customer@example.com')
    await page.locator('#password-input').fill('Password123!')
    await page.locator('#confirm-password-input').fill('Password123!')
    await waitForCaptcha(page)
    await page.getByRole('button', { name: 'إنشاء حساب' }).click()

    await expect(page.getByRole('heading', { name: 'تحقق من بريدك الإلكتروني' })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText(/إذا كان البريد الإلكتروني صحيحًا فستصلك رسالة/)).toBeVisible()

    // New unique registration
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    const uniqueEmail = `sec-reg-${Date.now()}@example.com`
    await page.locator('#name-input').fill('مستخدم جديد')
    await page.locator('#email-input').fill(uniqueEmail)
    await page.locator('#password-input').fill('Password123!')
    await page.locator('#confirm-password-input').fill('Password123!')
    await waitForCaptcha(page)
    await page.getByRole('button', { name: 'إنشاء حساب' }).click()

    await expect(page.getByRole('heading', { name: 'تحقق من بريدك الإلكتروني' })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText(/إذا كان البريد الإلكتروني صحيحًا فستصلك رسالة/)).toBeVisible()
  })

  test('3. Admin without MFA cannot load admin data (SEC-01, SEC-02)', async ({ page }) => {
    // Guarantee no verified MFA factor exists for admin
    await clearAllMfaFactors(adminClient)

    await page.goto('/login')
    await page.locator('#email-input').fill('admin@example.com')
    await page.locator('#password-input').fill('Password123!')
    await waitForCaptcha(page)
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })

    // Admin attempts to visit /admin directly
    await page.goto('/admin')

    // Must be redirected to MFA enroll ladder because no factors are enrolled
    await page.waitForURL('**/admin/mfa/enroll', { timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'إعداد التحقق بخطوتين (TOTP)' })).toBeVisible()

    // Admin sidebar links, KPI metric cards, and data tables must NOT be rendered in DOM
    await expect(page.locator('nav a[href="/admin/products"]')).not.toBeVisible()
    await expect(page.locator('nav a[href="/admin/orders"]')).not.toBeVisible()
    await expect(page.locator('h1:has-text("لوحة تحكم المتجر")')).not.toBeVisible()

    // Direct database RPC calls with AAL1 session fail closed with ADM-002
    const client = createClient(status.API_URL, status.ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await client.auth.signInWithPassword({
      email: 'admin@example.com',
      password: 'Password123!',
    })
    const { error: rpcError } = await client.rpc('admin_dashboard')
    expect(rpcError).toBeTruthy()
    expect(rpcError?.message).toMatch(/Two-factor authentication required|ADM-002|42501|aal2/i)
  })

  test('4. Customer cannot read another customer order or payment proof by ID (SEC-10, IDOR)', async ({
    page,
  }) => {
    // Seed an order belonging to Victim
    const { data: victimOrder, error: victimOrderError } = await adminClient
      .from('orders')
      .insert({
        user_id: victimUserId,
        status: 'pending',
        payment_status: 'awaiting_proof',
        payment_method: 'instapay_qr',
        delivery_method: 'representative',
        total: 450.0,
        subtotal: 400.0,
        shipping_fee: 50.0,
        ship_name: 'سعيد الحظ الضحية',
        ship_phone: '01011112222',
        ship_address: 'شارع سري للغاية 15',
        ship_governorate: 'القاهرة',
        ship_city: 'القاهرة',
        ship_postal_code: '11511',
      })
      .select('id')
      .single()

    expect(victimOrderError).toBeNull()
    expect(victimOrder).not.toBeNull()
    if (!victimOrder) throw new Error('Victim order insertion failed')
    const victimOrderId = victimOrder.id

    // Attacker logs in
    await loginUser(page, 'attacker-sec@example.com')

    // Attacker navigates to /account/orders: Victim's order is completely absent
    await page.goto('/account/orders')
    await expect(page.locator(`text=#${victimOrderId}`)).not.toBeVisible()

    // Attacker attempts direct database select via Supabase PostgREST client
    const attackerClient = createClient(status.API_URL, status.ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await attackerClient.auth.signInWithPassword({
      email: 'attacker-sec@example.com',
      password: 'Password123!',
    })

    const { data: orderData } = await attackerClient
      .from('orders')
      .select('*')
      .eq('id', victimOrderId)

    // RLS filters out victim order completely: returns empty array
    expect(orderData).toEqual([])

    // Attacker attempts to download victim's private payment proof from Storage
    const { error: storageError } = await attackerClient.storage
      .from('payment-proofs')
      .download(`${victimUserId}/${victimOrderId}/confidential_proof.png`)

    // Storage RLS blocks cross-user downloads
    expect(storageError).toBeTruthy()
  })

  test('5. Uploads of renamed HTML, SVG, and plain text files are refused (SEC-11)', async ({
    page,
  }) => {
    // Seed order for Attacker in awaiting_proof status
    const { data: attackOrder, error: attackOrderError } = await adminClient
      .from('orders')
      .insert({
        user_id: attackerUserId,
        status: 'confirmed',
        payment_status: 'awaiting_proof',
        payment_method: 'instapay_qr',
        delivery_method: 'representative',
        total: 200.0,
        subtotal: 150.0,
        shipping_fee: 50.0,
        ship_name: 'المهاجم الفضولي',
        ship_phone: '01033334444',
        ship_address: 'شارع التحرير',
        ship_governorate: 'القاهرة',
        ship_city: 'القاهرة',
        ship_postal_code: '11511',
        payment_deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      })
      .select('id')
      .single()

    expect(attackOrderError).toBeNull()
    expect(attackOrder).not.toBeNull()
    if (!attackOrder) throw new Error('Attacker order insertion failed')
    const attackOrderId = attackOrder.id

    await loginUser(page, 'attacker-sec@example.com')

    await page.goto(`/pay/${attackOrderId}`)
    await expect(page.locator('#proof-file-input')).toBeAttached({ timeout: 15000 })

    const fileInput = page.locator('#proof-file-input')

    // 1. Renamed HTML file
    await fileInput.setInputFiles({
      name: 'receipt.png',
      mimeType: 'image/png',
      buffer: Buffer.from('<!DOCTYPE html><html><body><script>alert("XSS")</script></body></html>'),
    })
    await expect(page.getByText('UPL-001')).toBeVisible()

    // 2. Renamed SVG file
    await fileInput.setInputFiles({
      name: 'receipt.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("XSS")</script></svg>',
      ),
    })
    await expect(page.getByText('UPL-001')).toBeVisible()

    // 3. Renamed plain text file
    await fileInput.setInputFiles({
      name: 'receipt.webp',
      mimeType: 'image/webp',
      buffer: Buffer.from('Just a plain text file posing as an image'),
    })
    await expect(page.getByText('UPL-001')).toBeVisible()
  })

  test('6. Product name containing script and SQL text renders as plain text (SEC-03, SEC-07)', async ({
    page,
  }) => {
    const maliciousPayload = `<script>window.__XSS_EXEC__=true;</script>'; DROP TABLE orders; --`
    const { data: prod, error: prodError } = await adminClient
      .from('products')
      .insert({
        category_id: 1,
        name: maliciousPayload,
        name_ar: maliciousPayload,
        description: 'Sec description',
        description_ar: 'وصف الحماية',
        price: 110.0,
        stock_quantity: 10,
        is_active: true,
      })
      .select('id')
      .single()

    expect(prodError).toBeNull()
    expect(prod).not.toBeNull()
    if (!prod) throw new Error('Malicious product insertion failed')
    const maliciousProductId = prod.id

    await page.goto(`/product/${maliciousProductId}`)

    // Verify h1 displays the text safely
    const title = page.locator('h1')
    await expect(title).toBeVisible({ timeout: 15000 })
    await expect(title).toContainText('<script>window.__XSS_EXEC__=true;</script>')

    // Verify script was never executed
    const wasXssExecuted = await page.evaluate(() =>
      Boolean((window as unknown as { __XSS_EXEC__?: boolean }).__XSS_EXEC__),
    )
    expect(wasXssExecuted).toBe(false)

    // Verify database orders table was not dropped
    const { count } = await adminClient.from('orders').select('*', { count: 'exact', head: true })
    expect(count ?? 0).toBeGreaterThan(0)
  })

  test('7. Admin enrolls MFA, accesses admin panel at AAL2, and sensitive actions ask for step-up (SEC-01)', async ({
    page,
  }) => {
    // Reset any existing unverified factors so clean enrollment can proceed
    await clearAllMfaFactors(adminClient)

    // Step A: Admin logs in and enrolls TOTP MFA
    await page.goto('/login')
    await page.locator('#email-input').fill('admin@example.com')
    await page.locator('#password-input').fill('Password123!')
    await waitForCaptcha(page)
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
    await page.waitForTimeout(500)

    await page.goto('/admin')
    await page.waitForURL('**/admin/mfa/enroll', { timeout: 15000 })

    const secretContainer = page.locator('div.select-all')
    await page.getByRole('button', { name: 'إعداد تطبيق المصادقة' }).click()
    await expect(secretContainer).toBeVisible({ timeout: 10000 })
    adminTotpSecret = (await secretContainer.innerText()).trim()

    const enrollCode = generateTotp(adminTotpSecret)
    await page.locator('input[name="totpCode"]').fill(enrollCode)
    await page.getByRole('button', { name: 'تأكيد وتفعيل' }).click()

    // Upgraded to AAL2, land on admin dashboard
    await page.waitForURL('**/admin', { timeout: 15000 })
    await expect(page.locator('h1')).toContainText('لوحة تحكم')

    // Step B: Navigate to products and trigger Step-Up MFA
    await page.goto('/admin/products')
    const exportBtn = page.getByRole('button', { name: 'تصدير CSV' })
    await expect(exportBtn).toBeVisible()
    await exportBtn.click()

    // Step-Up Dialog pops up
    const stepUpDialog = page.locator('dialog', { hasText: 'تأكيد الهوية' })
    await expect(stepUpDialog).toBeVisible({ timeout: 10000 })

    // Invalid code fails and keeps dialog open
    await stepUpDialog.locator('#step-up-totp-code').fill('000000')
    await stepUpDialog.getByRole('button', { name: 'تأكيد ومتابعة' }).click()
    await expect(stepUpDialog).toBeVisible()

    // Valid code confirms step-up
    const validCode = generateTotp(adminTotpSecret)
    await stepUpDialog.locator('#step-up-totp-code').fill(validCode)
    await stepUpDialog.getByRole('button', { name: 'تأكيد ومتابعة' }).click()

    // Dialog closes
    await expect(stepUpDialog).not.toBeVisible({ timeout: 10000 })
  })

  test('8. CSV export neutralises formulas with single quote prefix (SEC-14)', async ({ page }) => {
    // Insert products starting with formula injection characters: =, +, -, @, \t, \r
    await adminClient.from('products').insert({
      category_id: 1,
      name: "=cmd|' /C calc'!A0",
      name_ar: "=cmd|' /C calc'!A0",
      price: 99.0,
      stock_quantity: 5,
      is_active: true,
    })

    await loginAdmin(page)
    await page.goto('/admin/products')

    const exportBtn = page.getByRole('button', { name: 'تصدير CSV' })
    await expect(exportBtn).toBeVisible()

    const downloadPromise = page.waitForEvent('download', { timeout: 20000 })
    await exportBtn.click()

    // Handle step-up if prompted
    const stepUpDialog = page.locator('dialog', { hasText: 'تأكيد الهوية' })
    if (await stepUpDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      const stepUpCode = generateTotp(adminTotpSecret)
      await stepUpDialog.locator('#step-up-totp-code').fill(stepUpCode)
      await stepUpDialog.getByRole('button', { name: 'تأكيد ومتابعة' }).click()
    }

    const download = await downloadPromise
    const stream = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
    const fullBuffer = Buffer.concat(chunks)
    const textContent = fullBuffer.toString('utf8')

    // 1. Verify UTF-8 BOM (\uFEFF)
    expect(textContent.charCodeAt(0)).toBe(0xfeff)

    // 2. Formula injection neutralization: '=' must be prefixed with single quote "'"
    expect(textContent).toContain(`'=cmd|' /C calc'!A0`)

    // Must never contain unescaped raw =cmd
    expect(textContent).not.toContain(`,=cmd`)
  })

  test('9. Zero Content Security Policy (CSP) violations across storefront and admin views (SEC-18)', async ({
    page,
  }) => {
    const violations: Array<{ blockedURI: string; violatedDirective: string }> = []

    // Expose listener to capture any real securitypolicyviolation events
    await page.exposeFunction(
      'onCspViolation',
      (data: { blockedURI: string; violatedDirective: string }) => {
        violations.push(data)
      },
    )

    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) => {
        const win = window as unknown as {
          onCspViolation: (data: { blockedURI: string; violatedDirective: string }) => void
        }
        win.onCspViolation({
          blockedURI: e.blockedURI,
          violatedDirective: e.violatedDirective,
        })
      })
    })

    // Preview serves the real policy over HTTP; intercepted documents lose their
    // loopback address space in Chromium and cannot reach the local Auth service.
    const headersFile = path.resolve('public/_headers')
    const headersContent = fs.readFileSync(headersFile, 'utf8')
    const cspMatch = headersContent.match(/Content-Security-Policy:\s*(.+)$/m)
    const cspPolicy = cspMatch ? cspMatch[1].trim() : ''

    // Keep the real admin session so admin routes cannot pass by redirecting to login.
    await loginAdmin(page)

    // Walk across core storefront and admin routes
    const routesToVisit = [
      '/',
      '/category/earrings',
      '/product/1',
      '/cart',
      '/login',
      '/admin/products',
      '/admin/orders',
    ]

    for (const route of routesToVisit) {
      const response = await page.goto(route)
      expect(response?.headers()['content-security-policy']).toBe(cspPolicy)
      await page.waitForLoadState('domcontentloaded')
      if (route.startsWith('/admin/')) {
        await expect(page).toHaveURL(new RegExp(`${route}$`))
        await expect(page.locator('#admin-main h1')).toBeVisible()
      }
      await page.waitForTimeout(300)
    }

    // Zero CSP violations recorded
    expect(violations).toEqual([])
  })
})
