# Handover to Codex / Owner

## Objective

Completed task `T-8.01: Auth email and hardening runbooks` on branch `agent/T-8.01-auth-email-hardening-runbooks`.

## Completed Work in T-8.01

1. **Auth Email Runbook (`docs/runbooks/auth-email.md`)**:
   - Rationale for custom SMTP (built-in sender capped at 2 emails/hour; custom SMTP default is 30 signups/hour per Supabase production checklist).
   - SMTP configuration guidance (Host, Port, User, Pass, Sender Name/Email, Encryption) across Resend, SendGrid, and AWS SES.
   - Exact redirect URLs for production (`https://lolys.eg/*`), staging, and local development (strictly prohibiting wildcards `*`).
   - Comprehensive test procedures covering registration confirmation, password reset, link expiration, and rate-limiting enumeration protection.

2. **Auth Hardening Runbook (`docs/runbooks/auth-hardening.md`)**:
   - 10-point tick-list covering:
     1. Cloudflare Turnstile CAPTCHA enabled.
     2. Email confirmations required.
     3. Secure email change enabled with double verification.
     4. Minimum password length set to 10 characters.
     5. Anonymous sign-ins disabled.
     6. TOTP two-factor authentication enabled (`aal2`).
     7. Exact allow-listed redirect URLs only (no wildcards).
     8. Unused external OAuth providers disabled.
     9. Leaked-password protection enabled (HaveIBeenPwned).
     10. JWT expiry / 20-minute admin session idle timeouts enforced.
   - Pre-launch verification procedure and incident response guide for compromised credentials.

3. **UI States and Error Handling**:
   - Extended `src/features/auth/authErrors.tsx` to map Supabase token expiration errors (`otp_expired`, `token_expired`, `link is invalid`, `link has expired`) to catalogue error code `AUTH-009` ("الرابط غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.").
   - Implemented dedicated "تحقق من بريدك الإلكتروني" (Check your email) status cards across `RegisterPage`, `ResetPasswordPage`, and `ResendConfirmationPage` with envelope icon and spam/junk guidance when `statusMessage === 'AUTH-010'`.
   - Derived URL error codes via `useMemo` in `LoginPage` and `ResetPasswordPage` to gracefully handle expired redirects with one-click recovery links (`/resend-confirmation` and `/reset-password`).

4. **Testing and Verification**:
   - Added 5 unit tests in `src/features/auth/auth.test.tsx` verifying registration check-email state, password reset check-email state, resend confirmation flow, and expired link URL handling on login and reset pages.
   - All 225 application tests and 111 tooling tests (336 total) pass.
   - Bundle size verified at 192.8 KB gzip <= 200 KB.
   - `npm run verify` passed completely.
   - Committed and pushed to `origin/agent/T-8.01-auth-email-hardening-runbooks`.

## Current Roadmap State

`npm run roadmap:next` reports:

- **No runnable agent tasks** at this moment.
- **T-0.06** is in `doing` awaiting Owner review of PR #1 / workflows.
- Downstream tasks (`T-0.09`, `T-0.12`, `T-1.09`, etc.) depend on T-0.06.
- Human-owned tasks: `T-0.10`, `T-0.11`, `T-0.13`, `T-1.11`, `T-1.13`, `T-7.09`, `T-8.02`, `T-8.03`, `T-8.04`, `T-8.09`, `T-8.10`, `T-9.13`.

## Verification Command

To verify the repository state locally:

```bash
npm run verify
```
