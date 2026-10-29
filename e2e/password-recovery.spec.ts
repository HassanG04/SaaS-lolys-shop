import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseStatus } from './helpers/db'

for (const lang of ['en', 'ar'] as const) {
  test(`Email recovery accepts a new password and rejects a reused link (${lang})`, async ({
    page,
    request,
    baseURL,
  }) => {
    const status = getSupabaseStatus()
    if (!['127.0.0.1', 'localhost'].includes(new URL(status.API_URL).hostname))
      throw new Error('Local Auth required')
    const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const email = `recovery-${crypto.randomUUID()}@example.com`
    const oldPassword = 'Local-Old-81!'
    const password = 'Local-New-82!'
    const created = await admin.auth.admin.createUser({
      email,
      password: oldPassword,
      email_confirm: true,
    })
    expect(created.error).toBeNull()
    const id = created.data.user?.id
    try {
      const link = await admin.auth.admin.generateLink({ type: 'recovery', email })
      if (!link.data.properties) throw new Error('Local recovery link unavailable')
      // Consume a real local GoTrue email action. Move only its redirect fragment
      // to this test server, since local Auth's site URL is the development port.
      const action = link.data.properties.action_link
      const verified = await request.get(action, { maxRedirects: 0 })
      const destination = new URL(verified.headers().location)
      expect(destination.hash.includes('access_token=')).toBe(true)
      await page.addInitScript((language) => localStorage.setItem('app-lang', language), lang)
      await page.goto(`${baseURL}/reset-password${destination.hash}`)
      const fields = page.locator('input[autocomplete="new-password"]')
      await expect(fields).toHaveCount(2)
      await fields.nth(0).fill(password)
      await fields.nth(1).fill(password)
      await page
        .getByRole('button', {
          name: lang === 'en' ? 'Update Password' : 'تحديث كلمة المرور',
          exact: true,
        })
        .click()
      await expect(fields).toHaveCount(0)
      const client = createClient(status.API_URL, status.ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const signedIn = await client.auth.signInWithPassword({ email, password })
      expect(signedIn.error).toBeNull()
      await client.auth.signOut()
      expect(
        (await client.auth.signInWithPassword({ email, password: oldPassword })).error,
      ).not.toBeNull()
      const replay = await request.get(action, { maxRedirects: 0 })
      const replayDestination = new URL(replay.headers().location)
      await page.goto(`${baseURL}/reset-password${replayDestination.hash}`)
      await expect(page.getByText('AUTH-009', { exact: true })).toBeVisible()
      await expect(page.locator('#email-input')).toBeVisible()
    } finally {
      if (id) await admin.auth.admin.deleteUser(id)
    }
  })
}
