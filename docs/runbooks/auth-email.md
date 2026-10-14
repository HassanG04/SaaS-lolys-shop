# Custom SMTP and Email Verification Runbook

- Status: active
- Task: T-8.01
- Applies to: staging and production environments
- References: Supabase Production Checklist, RFC 5321 (SMTP), RFC 7208 (SPF), RFC 6376 (DKIM), RFC 7489 (DMARC)

This runbook defines the rationale, exact configuration, URL allow-lists, and testing procedures for custom SMTP and email verification in Lolys' accessories & home store.

---

## 1. Why custom SMTP is required

Under Supabase's managed infrastructure:

1. **Strict built-in rate limits**:
   - The default, built-in Supabase email service is capped at **2 emails per hour**.
   - This built-in sender is strictly intended for initial smoke-testing by developers; it immediately throttles customer registration, password recovery, and email change requests.
2. **Production throughput requirements**:
   - With a verified custom SMTP provider configured, the rate limit expands to **at least 30 new user signups per hour** (and higher on request via Supabase project support; see Supabase's Production Checklist: _"Configure a custom SMTP provider"_).
3. **Domain reputation and deliverability**:
   - Emails sent via shared generic IP addresses suffer high spam classification and rejection rates from major regional mail providers (Gmail, Outlook, Yahoo, iCloud).
   - Custom SMTP binds email transmission to Lolys' authenticated domain (`lolys.eg`), enforcing SPF, DKIM, and DMARC alignment.
4. **Branded customer experience**:
   - Sender address displays as `noreply@lolys.eg` and sender name as `Lolys' Accessories & Home | لوليز` rather than Supabase's default noreply domain.

---

## 2. SMTP provider selection and parameters

Lolys supports industry-standard transactional email providers (Resend, SendGrid, Postmark, or AWS SES). Resend or SendGrid is recommended for primary operation.

### Required parameters checklist

Navigate to **Supabase Dashboard** -> **Project Settings** -> **Authentication** -> **SMTP Settings** (or **Auth** -> **Email Templates**):

| Parameter                           | Recommended Value                       | Notes                                                |
| ----------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| **Enable Custom SMTP**              | `Enabled` (Toggle ON)                   | Replaces default 2 emails/hr sender                  |
| **Sender Email**                    | `noreply@lolys.eg`                      | Must match verified domain in provider DNS           |
| **Sender Name**                     | `Lolys' Accessories & Home`             | Visible display name in Arabic/English email clients |
| **SMTP Host**                       | `smtp.resend.com` / `smtp.sendgrid.net` | Hostname from SMTP provider                          |
| **SMTP Port**                       | `587` (STARTTLS) or `465` (TLS)         | Port 587 with STARTTLS is preferred                  |
| **SMTP User**                       | `resend` / `apikey`                     | API username supplied by provider                    |
| **SMTP Password**                   | `[REDACTED_API_KEY]`                    | Provider API key with mail send permissions          |
| **Minimum Interval Between Emails** | `60` seconds                            | Rate limit per user to prevent flooding              |

### Domain DNS prerequisites

Before activating custom SMTP in Supabase, ensure the DNS records on `lolys.eg` are verified with the email provider:

1. **SPF Record**: `v=spf1 include:<provider-spf-domain> ~all`
2. **DKIM Record**: TXT/CNAME records matching the provider's selector (e.g. `resend._domainkey.lolys.eg`).
3. **DMARC Record**: `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@lolys.eg; pct=100`
4. **MX / Return-Path**: CNAME for custom bounce processing if provided.

---

## 3. Redirect URLs and Wildcard Policy

Under Lolys' security policy (SEC-05 and SEC-06), **wildcard redirect URLs (`*`) are strictly prohibited in production** to eliminate Open Redirect vulnerabilities that could lead to token theft or phishing.

Navigate to **Supabase Dashboard** -> **Authentication** -> **URL Configuration**:

### Site URL

- **Production**: `https://lolys.eg`
- **Staging**: `https://staging.lolys.eg`
- **Local Development**: `http://localhost:5173`

### Allowed Redirect URLs (Explicit List)

Add the following exact URLs to the **Redirect URLs** list:

#### Production Environment

```text
https://lolys.eg
https://lolys.eg/login
https://lolys.eg/reset-password
https://lolys.eg/resend-confirmation
https://lolys.eg/account/security
https://lolys.eg/account/orders
```

#### Staging Environment

```text
https://staging.lolys.eg
https://staging.lolys.eg/login
https://staging.lolys.eg/reset-password
https://staging.lolys.eg/resend-confirmation
https://staging.lolys.eg/account/security
https://staging.lolys.eg/account/orders
```

#### Local Development Environment

```text
http://localhost:5173
http://localhost:5173/login
http://localhost:5173/reset-password
http://localhost:5173/resend-confirmation
http://localhost:5173/account/security
http://127.0.0.1:5173
http://127.0.0.1:5173/login
http://127.0.0.1:5173/reset-password
http://127.0.0.1:5173/resend-confirmation
```

> [!CRITICAL]
> Never configure `https://*.lolys.eg/*` or `https://lolys.eg/**`. Attackers can construct malicious OAuth/magic-link query strings targeting open paths to exfiltrate session tokens.

---

## 4. Email verification and UI flow states

The frontend application provides accessible Arabic states for each stage of email verification:

### State 1: "Check your email" (`AUTH-010`)

- **Trigger**: Occurs immediately upon submitting:
  - Account registration (`/register`)
  - Password recovery request (`/reset-password`)
  - Confirmation resend request (`/resend-confirmation`)
- **Behavior**:
  - The form is replaced by a clear status card with the email envelope icon and heading: **تحقق من بريدك الإلكتروني**.
  - Displays neutral message: `"إذا كان البريد الإلكتروني صحيحًا فستصلك رسالة خلال دقائق."`
  - Advises the user to check both the inbox and spam/junk folders.
  - Provides a direct link to **إعادة الإرسال** (`/resend-confirmation`) if not received.

### State 2: "Resend confirmation" (`/resend-confirmation`)

- **Trigger**: Accessed directly via `/resend-confirmation` or through the permanent link on `/login`: `"لم تصلك رسالة التفعيل؟ أعد الإرسال"`.
- **Behavior**:
  - Requires email address and Cloudflare Turnstile bot verification.
  - Dispatches `supabase.auth.resend({ type: 'signup', email })`.
  - Always returns the neutral `AUTH-010` response to prevent user account enumeration.

### State 3: "Link expired or invalid" (`AUTH-009`)

- **Trigger**: A customer clicks an email confirmation or password recovery link that has expired (older than default expiration window) or already been consumed.
- **Behavior**:
  - Supabase redirects to `/login` or `/reset-password` with query/hash parameters (`error_code=otp_expired` or `error_description=...expired...`).
  - The application automatically catches these URL parameters on mount and displays:
    - Code: `AUTH-009`
    - Arabic alert: `"الرابط غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا."`
  - Displays prominent recovery actions linking directly to `/resend-confirmation` and `/reset-password`.

---

## 5. Verification and testing procedure

Whenever custom SMTP settings or redirect URLs are updated, perform the following end-to-end verification tests:

### Test 1: New Customer Registration and Confirmation

1. In a private browser window, navigate to `/register`.
2. Enter a test email address accessible to the tester (e.g. `test-signup@lolys.eg`).
3. Complete the form and Turnstile challenge; submit.
4. Confirm that the application presents the **تحقق من بريدك الإلكتروني** status card (`AUTH-010`).
5. Open the test mailbox:
   - Verify email received within 60 seconds.
   - Verify sender header is `Lolys' Accessories & Home <noreply@lolys.eg>`.
   - Verify DKIM signature passes.
6. Click the verification link in the email:
   - Ensure redirection lands on `/` or `/login` with active authenticated session.

### Test 2: Password Reset Flow

1. Navigate to `/reset-password`.
2. Enter the test email address and submit.
3. Confirm that the **تحقق من بريدك الإلكتروني** card is displayed (`AUTH-010`).
4. In the test mailbox, open the password recovery email and click the reset link.
5. Verify navigation to the authenticated password update form (`/account/security` or reset handler).

### Test 3: Link Expiry Handling

1. Generate a signup or password reset link.
2. Manually alter the token in the URL or simulate arrival with `?error_code=otp_expired`.
3. Open `/login?error_code=otp_expired`.
4. Verify that:
   - Alert `AUTH-009` ("الرابط غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.") appears.
   - Quick action link to `/resend-confirmation` is visible and functional.

### Test 4: Rate Limiting and Enumeration Resistance

1. Request 3 consecutive confirmation resends for both an existing user and a non-existent email address (`ghost@example.com`).
2. Verify that both requests produce the exact same visual response time, status message (`AUTH-010`), and DOM representation.
