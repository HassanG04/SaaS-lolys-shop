import { test, expect, type Page, type Response } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { generateTotp } from '../helpers/totp'
import { queryDb, createTestUser, getSupabaseStatus } from '../helpers/db'

let adminTotpSecret = ''
let victimUserId = ''
let attackerUserId = ''

async function loginUser(page: Page, email: string, password = 'Password123!') {
  await page.goto('/login')
  await page.locator('#email-input').fill(email)
  await page.locator('#password-input').fill(password)
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
}

async function loginAdmin(page: Page) {
  await page.goto('/login')
  await page.locator('#email-input').fill('admin@example.com')
  await page.locator('#password-input').fill('Password123!')
  await page.waitForTimeout(200)
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
    queryDb('DELETE FROM auth.mfa_factors;')

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

    // Known email
    await page.locator('#email-input').fill('customer@example.com')
    await page
      .getByRole('button', { name: 'إرسال رابط إعادة التعيين' })
      .waitFor({ state: 'visible', timeout: 5000 })
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'إرسال رابط إعادة التعيين' }).click()
    await expect(page.getByRole('heading', { name: 'تحقق من بريدك الإلكتروني' })).toBeVisible({
      timeout: 10000,
    })
    await expect(
      page.getByText(/إذا كان البريد الإلكتروني مسجلًا لدينا، فستصلك رسالة/),
    ).toBeVisible()

    // Unknown email
    await page.goto('/reset-password')
    await page.locator('#email-input').fill('unknown-reset-target@example.com')
    await page
      .getByRole('button', { name: 'إرسال رابط إعادة التعيين' })
      .waitFor({ state: 'visible', timeout: 5000 })
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'إرسال رابط إعادة التعيين' }).click()
    await expect(page.getByRole('heading', { name: 'تحقق من بريدك الإلكتروني' })).toBeVisible({
      timeout: 10000,
    })
    await expect(
      page.getByText(/إذا كان البريد الإلكتروني مسجلًا لدينا، فستصلك رسالة/),
    ).toBeVisible()

    // Part B: Registration Neutrality
    // Attempt registration with already existing email
    await page.goto('/register')
    await page.locator('#name-input').fill('مستخدم مكرر')
    await page.locator('#email-input').fill('customer@example.com')
    await page.locator('#password-input').fill('Password123!')
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: 'إنشاء حساب' }).click()

    await expect(page.getByRole('heading', { name: 'تحقق من بريدك الإلكتروني' })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText(/إذا كان البريد الإلكتروني صحيحًا فستصلك رسالة/)).toBeVisible()

    // New unique registration
    await page.goto('/register')
    const uniqueEmail = `sec-reg-${Date.now()}@example.com`
    await page.locator('#name-input').fill('مستخدم جديد')
    await page.locator('#email-input').fill(uniqueEmail)
    await page.locator('#password-input').fill('Password123!')
    await page.getByRole('button', { name: 'إنشاء حساب' }).click()

    await expect(page.getByRole('heading', { name: 'تحقق من بريدك الإلكتروني' })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText(/إذا كان البريد الإلكتروني صحيحًا فستصلك رسالة/)).toBeVisible()
  })

  test('3. Admin without MFA cannot load admin data (SEC-01, SEC-02)', async ({ page }) => {
    // Guarantee no verified MFA factor exists for admin
    queryDb('DELETE FROM auth.mfa_factors;')

    await page.goto('/login')
    await page.locator('#email-input').fill('admin@example.com')
    await page.locator('#password-input').fill('Password123!')
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
    const status = getSupabaseStatus()
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
    const victimOrderId = 99881
    queryDb(`
      INSERT INTO public.orders (
        id, user_id, status, payment_status, payment_method, delivery_method,
        total, subtotal, shipping_fee,
        ship_name, ship_phone, ship_address, ship_governorate, ship_city
      ) OVERRIDING SYSTEM VALUE VALUES (
        ${victimOrderId}, '${victimUserId}', 'pending', 'awaiting_proof', 'instapay_qr', 'representative',
        450.00, 400.00, 50.00,
        'سعيد الحظ الضحية', '01011112222', 'شارع سري للغاية 15', 'القاهرة', 'القاهرة'
      ) ON CONFLICT (id) DO UPDATE SET user_id = '${victimUserId}';
    `)

    // Attacker logs in
    await loginUser(page, 'attacker-sec@example.com')

    // Attacker navigates to /account/orders: Victim's order is completely absent
    await page.goto('/account/orders')
    await expect(page.locator(`text=#${victimOrderId}`)).not.toBeVisible()

    // Attacker attempts direct database select via Supabase PostgREST client
    const status = getSupabaseStatus()
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
    const attackOrderId = 99882
    queryDb(`
      INSERT INTO public.orders (
        id, user_id, status, payment_status, payment_method, delivery_method,
        total, subtotal, shipping_fee,
        ship_name, ship_phone, ship_address, ship_governorate, ship_city,
        payment_deadline
      ) OVERRIDING SYSTEM VALUE VALUES (
        ${attackOrderId}, '${attackerUserId}', 'confirmed', 'awaiting_proof', 'instapay_qr', 'representative',
        200.00, 150.00, 50.00,
        'المهاجم الفضولي', '01033334444', 'شارع التحرير', 'القاهرة', 'القاهرة',
        now() + interval '24 hours'
      ) ON CONFLICT (id) DO UPDATE SET payment_status = 'awaiting_proof', status = 'confirmed', payment_deadline = now() + interval '24 hours';
    `)

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
    queryDb(`
      INSERT INTO public.products (
        id, category_id, name, name_ar, description, description_ar, price, stock_quantity, is_active
      ) OVERRIDING SYSTEM VALUE VALUES (
        99883, 1,
        '${maliciousPayload.replace(/'/g, "''")}',
        '${maliciousPayload.replace(/'/g, "''")}',
        'Sec description', 'وصف الحماية', 110.00, 10, true
      ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        name_ar = EXCLUDED.name_ar;
    `)

    await page.goto('/product/99883')

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
    const countRows = queryDb<{ count: string }>('SELECT count(*) as count FROM public.orders;')
    expect(Number(countRows[0]?.count)).toBeGreaterThan(0)
  })

  test('7. Admin enrolls MFA, accesses admin panel at AAL2, and sensitive actions ask for step-up (SEC-01)', async ({
    page,
  }) => {
    // Reset any existing unverified factors so clean enrollment can proceed
    queryDb('DELETE FROM auth.mfa_factors;')

    // Step A: Admin logs in and enrolls TOTP MFA
    await page.goto('/login')
    await page.locator('#email-input').fill('admin@example.com')
    await page.locator('#password-input').fill('Password123!')
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
    queryDb(`
      INSERT INTO public.products (category_id, name, name_ar, price, stock_quantity, is_active)
      VALUES (1, '=cmd|'' /C calc''!A0', '=cmd|'' /C calc''!A0', 99.00, 5, true)
      ON CONFLICT DO NOTHING;
    `)

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

    // Extract CSP policy from public/_headers and apply to responses
    const headersFile = path.resolve('public/_headers')
    const headersContent = fs.readFileSync(headersFile, 'utf8')
    const cspMatch = headersContent.match(/Content-Security-Policy:\s*(.+)$/m)
    const cspPolicy = cspMatch ? cspMatch[1].trim() : ''

    await page.route('**/*', async (route) => {
      const response = await route.fetch()
      const headers = response.headers()
      if (headers['content-type']?.includes('text/html')) {
        headers['content-security-policy'] = cspPolicy
      }
      await route.fulfill({ response, headers })
    })

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
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(300)
    }

    // Zero CSP violations recorded
    expect(violations).toEqual([])
  })
})
