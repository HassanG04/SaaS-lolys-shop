# Supabase Auth Hardening & Launch Checklist Runbook

- Status: active
- Task: T-8.01
- Applies to: staging and production environments
- References: SEC-01 through SEC-06, Supabase Security Best Practices, OWASP ASVS v4.0

This runbook defines the mandatory authentication hardening settings for the Supabase project hosting Lolys' accessories & home. Every setting listed below must be verified prior to staging deployment and production launch.

---

## 1. Auth hardening tick-list

Navigate to **Supabase Dashboard** -> **Authentication** (and **Project Settings** -> **Authentication**). Verify each item in the checklist:

### [x] 1. Cloudflare Turnstile Bot Protection: Enabled

- **Setting**: _Enable Captcha Protection_ -> Select **Cloudflare Turnstile**.
- **Configuration**:
  - `Turnstile Site Key`: Injected into frontend environment (`VITE_TURNSTILE_SITE_KEY`).
  - `Turnstile Secret Key`: Stored in Supabase dashboard secrets (never exposed to browser or repository).
- **Enforced endpoints**: Sign up, Sign in, Password reset, and Resend confirmation.
- **Rationale**: Blocks automated registration bots, credential-stuffing attacks, and automated SMTP quota exhaustion.

### [x] 2. Email Confirmations: Enabled

- **Setting**: _Enable Email Confirmations_ -> **ON**.
- **Behavior**: New users cannot authenticate or establish a valid session until they verify their email address via the link or code sent to their mailbox.
- **Rationale**: Prevents phantom account creation with hijacked or mistyped email addresses; ensures customer communication channels exist before order placement.

### [x] 3. Secure Email Change: Enabled

- **Setting**: _Secure Email Change_ -> **ON**.
- **Behavior**: When an authenticated user requests an email update (via `/account/security`), Supabase sends confirmation links to **both** the existing (old) email address and the new email address. The change is only committed after both tokens are verified.
- **Rationale**: Eliminates the risk of account takeover via an active session or temporary token compromise; alerts the legitimate account owner immediately if an unauthorized change is attempted.

### [x] 4. Minimum Password Length: 10 Characters

- **Setting**: _Minimum Password Length_ -> Set to **10**.
- **Application parity**:
  - Frontend enforces `password.length >= 10` on registration and password change forms, immediately returning catalogue code `AUTH-008` ("كلمة المرور ضعيفة. استخدم 10 أحرف على الأقل.").
  - Server-side enforces 10 characters at the Supabase GoTrue engine level to prevent API bypass.
- **Rationale**: Complies with NIST SP 800-63B and project specification SEC-05.

### [x] 5. Anonymous Sign-ins: Disabled

- **Setting**: _Enable Anonymous Sign-ins_ -> **OFF**.
- **Rationale**: Anonymous sign-ins allow unverified users to create rows in `auth.users`, creating orphaned data and potential abuse vectors. In Lolys, guest carts are kept in browser storage, and checkout requires authenticated customer accounts.

### [x] 6. TOTP Multi-Factor Authentication: Enabled

- **Setting**: _Enable Multi-Factor Authentication_ -> Toggle **TOTP** to **ON**.
- **Configuration**:
  - `Max Enrolled Factors`: 10.
- **Database & RLS integration**:
  - Admin access to `/admin` strictly requires authentication level `aal2` (enforced in `RequireAdmin` route guard and database RLS policies).
  - Admins with `aal1` sessions are routed to MFA challenge (`/mfa/challenge`) with `ADM-002` prompt.
  - Customers can voluntarily enroll and manage TOTP factors from `/account/security`.

### [x] 7. Redirect URLs: Exact Allow-list Only (No Wildcards)

- **Setting**: _Redirect URLs_ list under URL Configuration.
- **Configuration**:
  - **Site URL**: Exact base URL (`https://lolys.eg` in production; `https://staging.lolys.eg` in staging).
  - **Redirect URLs**: Explicit endpoints only (`/login`, `/reset-password`, `/resend-confirmation`, `/account/security`, `/account/orders`).
- **Forbidden**: Wildcards such as `https://*.lolys.eg/*` or `https://lolys.eg/**`.
- **Rationale**: Mitigates open-redirect attacks where malicious third parties forge OAuth or email confirmation links to capture access tokens.

### [x] 8. Unused Auth Providers: Disabled

- **Setting**: _External OAuth & Social Providers_.
- **Configuration**:
  - Email / Password: **ON**.
  - Phone (SMS): **OFF** (unless integrated and audited).
  - Apple, Google, Facebook, Twitter, GitHub, etc.: **OFF**.
  - SAML 2.0 / SSO: **OFF**.
- **Rationale**: Minimizes third-party attack surfaces and avoids unmapped profile attributes or identity collisions in `public.profiles`.

### [x] 9. Leaked Password Protection (HaveIBeenPwned): Enabled (Plan-Permitted)

- **Setting**: _Leaked Password Protection_ (under Auth -> Attack Protection).
- **Plan support**:
  - Available on Supabase Pro and Team plans.
  - On Free/Community tier, this setting may be unavailable or greyed out.
- **Verification step**:
  - Check the Supabase project billing tier. If on Pro plan or higher, toggle **Enable Leaked Password Protection** to **ON**.
  - This checks new passwords against HaveIBeenPwned's database of breached passwords during signup and password change.

### [x] 10. Session Lifetimes & JWT Expiry

- **Setting**: _JWT Expiry Limit_ -> Default **3600 seconds (1 hour)**.
- **Setting**: _Refresh Token Reuse Interval_ -> **10 seconds**.
- **Application enforcement**:
  - 20-minute idle session timeout for administrative users (`ADMIN_IDLE_TIMEOUT_MS = 20 * 60 * 1000` in `AuthProvider`). Upon timeout, React Query cache is cleared and the session is terminated.

---

## 2. Pre-launch verification procedure

Prior to launch or promotion to production, the operations engineer must perform this verification sequence:

```bash
# 1. Run local verify suite to confirm client-side guards and types
npm run verify

# 2. Check that no secret keys are committed in source code
git diff main -- .env* src/
```

### Manual Console Verification Steps:

1. Log into **https://supabase.com/dashboard/project/<PROJECT_ID>**.
2. **Settings -> Authentication**:
   - Confirm **SMTP** is enabled with `noreply@lolys.eg` and port 587.
   - Confirm **Rate limit** is set to >= 30/hour.
3. **Authentication -> Providers**:
   - Confirm **Email** is the only enabled provider.
   - Confirm **Confirm Email** is checked.
   - Confirm **Secure Email Change** is checked.
4. **Authentication -> URL Configuration**:
   - Confirm **Site URL** matches production domain without trailing slash.
   - Verify that **Redirect URLs** contains zero entries with `*`.
5. **Authentication -> Attack Protection**:
   - Confirm **Turnstile** is active and test submission in staging.
   - Confirm **Leaked password protection** is active (if on Pro plan).

---

## 3. Incident response for compromised credentials

In the event of suspected credential compromise or token exfiltration:

1. Revoke the affected user's sessions immediately via Supabase Dashboard -> **Authentication** -> **Users** -> **Sign Out User**.
2. Or execute global session revocation from the database:
   ```sql
   delete from auth.refresh_tokens where user_id = '<COMPROMISED_USER_ID>';
   ```
3. Prompt the user to reset their password via `/reset-password`.
