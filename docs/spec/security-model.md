# Security model: Lolys' Accessories & Home

Version 1.0, 2026-10-07. Applies to roadmap v1.1. Written for someone who builds AI systems, not security systems.

**Status:** design guidance written before any code exists. It was not verified by a scanner or a penetration test, and it is not legal advice. Items marked *(verify)* depend on current Supabase behaviour and must be confirmed when implemented.

---

## 1. The 60-second version

1. **The browser is not trusted.** Anyone can open the browser console and send any request. So prices, stock, roles and payment status are decided by the database, never by the page.
2. **The database is the guard.** Every table has row-level security (RLS): a rule that says who may read or change each row. Hiding a button is decoration; RLS is the lock.
3. **No raw SQL is reachable by a user.** All data moves through ready-made calls where values are parameters, never glued into SQL text. That is what makes SQL injection impossible by design, not just unlikely.
4. **Every key and role can do the minimum.** The public key in the browser can do almost nothing on its own. The secret key is never used by this project.
5. **Admin means password plus authenticator code.** The database itself checks for the second factor, so a stolen password alone opens nothing.
6. **Say little to strangers.** Login errors are identical for every failure. Errors show a code and a friendly Arabic sentence, never internals.
7. **Write it down, and be able to recover.** Sensitive actions go to an append-only audit log; backups and runbooks exist before launch.

---

## 2. What we protect, and from whom

| Asset | Why it matters |
|---|---|
| Customer data: names, phones, addresses, order history | Privacy law and customer trust |
| Payment proofs (screenshots of transfers) | Contain bank details; must stay private |
| Admin accounts | Whoever controls them controls prices, orders and payments |
| The InstaPay QR code | If it is swapped, customers pay the attacker |
| Catalogue, prices, stock | Tampering costs money directly |
| Availability | A shop that is down loses sales |
| Reputation | One leak or fake payment page destroys trust |

| Attacker | Typical move |
|---|---|
| Bots | Guess passwords, mass sign-ups, scrape the catalogue, hammer endpoints |
| Malicious customer | Change prices in requests, read other people's orders, hoard stock with fake orders, upload bad files |
| Someone with a stolen admin password | Log in as admin, swap the QR, change prices, export customers |
| Opportunist with a software bug | Script injection (XSS), SQL injection, broken access control |
| Supply chain | A poisoned npm or Python package |
| Our own mistakes (including an AI agent's) | Secrets committed, RLS left off, a debug endpoint left open |

---

## 3. Your questions, answered

**Can an attacker change the admin email to their own?** There is no path for it:
- No screen or API changes another user's email. The `auth` schema is not exposed to the browser.
- An admin changes their own email only through Supabase Auth. By default a change sends a confirmation link to both the old and the new address, and the change completes only after both confirm. Keep that "Secure email change" setting on.
- Keep email confirmation on in production. A Supabase Auth issue (supabase/auth #2600) reports that with auto-confirm enabled the old-address confirmation can be skipped *(verify)*.
- The admin session must be at `aal2` (second factor verified) and recently signed in, and the change is written to the audit log.

**Can someone do SQL injection?** Not through this design:
- The app talks to Postgres through Supabase's REST layer and `rpc()` calls. Values travel as parameters.
- Our own SQL functions never build queries by joining strings; CI blocks `execute` with string concatenation (T-1.22).
- There is no SQL box in the admin UI, ever. The admin edits through typed forms that can change only allow-listed fields (section 6).
- Test: product names such as `'; drop table orders; --` must be stored and shown as plain text.

**Login errors must not reveal which input was wrong.**
- Every login failure shows the same sentence (AUTH-001).
- Sign-up and password reset show the same neutral message whether or not the email exists (AUTH-010).
- The same number of network calls happens in both cases (tested).
- Cloudflare Turnstile (free CAPTCHA) protects sign-in, sign-up and reset; Supabase supports it natively.

**Where do API keys fit?** See section 8. In short: the public key is meant to be visible; the secret key is never used; every other secret lives only in GitHub or Supabase secret stores, never in code.

**Can the admin change the database from the UI?** Yes, through forms (add category, change image, remove category, add item, change stock, and so on). Each form maps to a fixed, validated, audited operation. Nothing the admin types is ever executed as SQL.

**Two-factor login?** TOTP (authenticator app) through Supabase Auth MFA. For admins it is mandatory and enforced inside the database (section 5). Customers can switch it on from their account page.

---

## 4. Control catalogue

Each control has an ID that tasks and tests refer to.

| ID | Risk in plain words | Control | Task | How it is tested |
|---|---|---|---|---|
| SEC-01 | Stolen admin password | Every admin policy and function requires `aal2`; the UI forces enrollment; sensitive actions ask for a fresh code (step-up) | T-1.15, T-2.06, T-2.09 | Admin at `aal1` reads zero admin rows and gets ADM-002 |
| SEC-02 | Someone creates or promotes admins | Admins are created only by owner SQL; `admin_set_role` is dropped; `profiles.role` is not writable by any API role and a trigger blocks changes | T-1.15 | API attempts to change a role fail; function no longer exists |
| SEC-03 | SQL injection | Parameters only; no dynamic SQL with string joins; no SQL console; allow-listed admin fields | T-1.22, T-5.03 | CI check; injection strings stored as text |
| SEC-04 | Admin email hijack | Secure email change on; confirmation on; recent sign-in and `aal2` required; audit entry | T-2.07, T-8.03 | Runbook test on staging |
| SEC-05 | Login guessing and account enumeration | One generic message; identical responses for sign-up and reset; same call count; Turnstile | T-2.04 | Unit test: same message and same calls for unknown email and wrong password |
| SEC-06 | Password guessing at scale | Supabase rate limits, Turnstile, 10-character minimum, MFA for admins; leaked-password check on paid plans *(verify)* | T-2.04, T-8.03 | Rate-limit behaviour checked on staging |
| SEC-07 | Script injection (XSS) | React escaping; no `dangerouslySetInnerHTML` or `innerHTML`; descriptions are plain text; strict CSP; Semgrep rules | T-7.04, T-7.06 | Product name `<img src=x onerror=alert(1)>` renders as text; CSP report clean |
| SEC-08 | Stolen session | Short-lived tokens with rotation (Supabase default), admin idle timeout, "sign out everywhere", no third-party scripts | T-2.07, T-7.04 | Idle-timeout unit test |
| SEC-09 | Price or stock tampering | `place_order()` takes prices from the database, locks rows, checks stock | existing, T-1.18 | pgTAP S4, S5, S7 |
| SEC-10 | Reading other people's data (IDOR) | RLS on every table; per-user storage folders; signed URLs for proofs | T-1.04 to T-1.07 | pgTAP S2, S9, S15; e2e |
| SEC-11 | Fake orders and stock hoarding | Max pending orders per customer; InstaPay orders expire and restock; per-user rate limits; line and quantity caps | T-1.18, T-1.20 | pgTAP S27, S28 |
| SEC-12 | Malicious uploads | Images only (JPEG, PNG, WebP), no SVG or HTML; 5 MB cap; signature check; re-encode in browser (strips metadata); random file names; bucket limits | T-4.06, T-5.03 | e2e: renamed `.html` refused |
| SEC-13 | QR code swapped to steal payments | Settings change needs `aal2` plus step-up; audit entry; owner alert; image bucket writable only by admin | T-1.17, T-5.09 | pgTAP S22; e2e QR replacement leaves an audit row |
| SEC-14 | Spreadsheet formula injection in exports | Cells starting with `= + - @` tab or CR get a leading quote; exports need step-up | T-5.11 | Unit test with `=cmd` product name |
| SEC-15 | Leaked secrets | Only the public key in the browser; secret scanning (gitleaks and GitHub push protection); `dist/` scan; least-privilege roles | T-0.09, T-0.13 | CI fails on planted fake secret |
| SEC-16 | Poisoned dependency | Lockfile, `npm ci`, Dependabot, `npm audit`, SHA-pinned Actions, install scripts off in CI | T-0.12, T-7.05 | CI jobs |
| SEC-17 | RLS forgotten on a new table | CI test asserts RLS on every `public` table; Supabase Security Advisor reviewed before launch | T-1.04, T-7.04 | pgTAP S17 |
| SEC-18 | Clickjacking, content sniffing, mixed content | `_headers`: CSP, `frame-ancestors 'none'`, HSTS, `nosniff`, Referrer-Policy, Permissions-Policy | T-7.04 | ZAP baseline scan |
| SEC-19 | Admin changes nobody notices | Append-only `audit_log` for sensitive changes; viewer in admin; weekly review | T-1.16, T-5.10 | pgTAP S21 |
| SEC-20 | Data loss | Backups and export routine; restore rehearsal; forward-only migrations | T-8.06 | Rehearsal recorded |
| SEC-21 | Privacy breach or legal exposure | Collect only what delivery needs; retention schedule; deletion procedure; Arabic privacy policy; analytics sees no personal data | T-7.11, T-9.01 | Review checklist |
| SEC-22 | Errors that leak internals | Unified codes (`AREA-NNN`) with generic Arabic text; reference id for unexpected errors; details only in logs | T-1.10, T-2.08 | Test: raw English text never reaches the DOM |
| SEC-23 | Bad or poisoned analytics | Analytics job has a read-only, no-personal-data role; outputs validated; cancelled and rejected orders excluded | T-9.01 to T-9.08 | pytest and role tests |
| SEC-24 | AI agent mistakes or prompt injection through repo content | Ask-first list, CODEOWNERS on sensitive paths, human merges, no production access, owner-run Claude Security scans | T-0.12, T-7.09 | PR review |

---

## 5. Authentication design

**Sign-up:** email + password (10 characters or more, no composition rules) + Turnstile. The screen always answers with AUTH-010 ("if the email is valid you will receive a message"). Email confirmation is required.

**Login:** email + password + Turnstile. Any failure: AUTH-001. Wrong code, unknown email, unconfirmed email, locked: all look the same. A neutral "resend confirmation" link is always visible.

**Password reset:** always AUTH-010. The reset link expires; an expired or reused link shows AUTH-009.

**Admin access ladder:**
1. Owner creates the account's role with SQL (`runbook: first-admin`). The person signs up like any customer first.
2. First login: password only (`aal1`). The admin screens refuse to load and show the enrollment page.
3. Enroll TOTP (QR code). Verification issues an `aal2` session.
4. From now on the database treats the person as admin only while the session is `aal2`. `is_admin()` checks the `aal` claim (`auth.jwt() ->> 'aal'`) *and* the role.
5. A second authenticator device is enrolled so a lost phone does not lock the shop out. Removing a factor needs `aal2` first (Supabase behaviour).
6. Break-glass: the owner can recover through the Supabase dashboard (runbook `admin-onboarding`, T-8.09).

**Step-up:** before QR changes, settings changes, CSV exports and permanent deletes, the UI asks for a fresh authenticator code. The database already requires `aal2`; step-up adds a recency check in the UI *(verify whether recency can also be enforced in SQL using the `amr` claim timestamps)*.

**Sessions:** Supabase's token rotation stays on; anonymous sign-ins stay off; admin sessions time out after 20 idle minutes; every user can "sign out of all devices".

---

## 6. Letting the admin edit freely, without SQL

Each entity has an allow-list. The UI can only send fields on the list; the database enforces the same list with column grants and checks.

| Entity | Admin can change | Admin cannot change |
|---|---|---|
| Categories | name, slug, image, show-on-home, order, active; delete (empty, or move products first) | ids, timestamps |
| Products | name, description, category, price, discount, stock, images, featured, active; delete only if never ordered (otherwise archive) | `final_price`, `in_stock`, `sold_count` (calculated), ids |
| Orders | status along the allowed path, tracking number, representative name and phone | totals, prices, customer, address, payment status (only through payment review) |
| Payments | approve or reject a proof with a note | amounts, proof files |
| Delivery fees | fee per governorate and method; remove a row to switch a method off | governorate list |
| Settings | shop name, WhatsApp, announcement, sale text, payment methods, QR image, limits (allow-listed keys) | any key not on the list |
| Users | nothing | roles, emails, passwords (owner SQL or the user themself) |

---

## 7. InstaPay QR payments

Flow: customer picks InstaPay at checkout, sees the QR, the exact amount and an order reference, pays in their banking app, then uploads a proof image and the transfer reference. The admin compares it with the real bank notification and approves or rejects. Unpaid orders expire (default 24 hours) and release the stock.

| Risk | Control |
|---|---|
| Fake or edited screenshot | Admin must match amount, reference and time in the real bank app; the proof alone never marks an order paid |
| Same reference reused for two orders | Reference is unique per order (database constraint) |
| Wrong amount | The screen shows the exact amount; admin sees amount and proof side by side |
| QR replaced by an attacker | `aal2` + step-up + audit + owner alert; QR bucket writable only by admin |
| Proof images leak | Private bucket; per-user folders; admin sees them through short-lived signed links; deleted after the retention period (default 90 days after delivery) |
| Hoarding stock with unpaid orders | Payment window, pending-order limit |

Never store card or bank login details. InstaPay payment happens entirely in the customer's bank app.

---

## 8. Keys and secrets handbook

| Secret | What it is | Where it lives | If it leaks |
|---|---|---|---|
| Supabase public key (anon / publishable) | Identifies the project to the browser; limited by RLS | Browser bundle, Cloudflare env | Not a secret. Nothing to do if RLS is correct |
| Supabase secret (service-role) key | Bypasses all RLS | **Nowhere.** This project does not use it | Rotate immediately in the dashboard, then audit |
| Database password and access token | Lets CI push migrations | GitHub secrets, staging and production separate | Rotate, review recent deployments |
| Analytics database role password | Read-only on aggregate views; write only to forecast tables | GitHub secrets | Rotate; low impact by design |
| Turnstile site key / secret | Bot protection | Site key in the bundle; secret only in the Supabase dashboard | Rotate in Cloudflare |
| SMTP credentials | Sending sign-up emails | Supabase dashboard only | Rotate with the email provider |

Rules: never print or paste secrets into chats, issues or PRs; secret scanning stays on; rotation steps are in the incident runbook (T-7.10).

---

## 9. Gaps found in the v1.0 SQL (manual review, not scanner output)

| Gap | Why it matters | Closed by |
|---|---|---|
| `is_admin()` checks the role only | A stolen password gives full admin | T-1.15 |
| `admin_set_role()` exists | A hijacked admin session can create more admins | T-1.15 |
| No audit trail | Tampering is invisible | T-1.16 |
| No limit on pending orders or order size | Bots can lock all stock; huge requests waste resources | T-1.20 |
| `image_url` accepts any text | Could point to tracking pixels or odd schemes | T-1.19 (paths only, pattern check) |
| Free-text columns without length limits | Abuse, oversized exports | T-1.15, T-1.18 (length checks) |
| Sign-up metadata copied without clamping | Oversized names and phones | T-1.15 |
| No stock history | Tampering and demand analysis impossible | T-1.21 |
| No private bucket for payment proofs | Proofs would need a public place | T-1.18 |

---

## 10. Residual risks and later upgrades

- **Real-time phishing of authenticator codes.** TOTP can be phished by a fake login page that relays codes. Passkeys resist this; consider them later.
- **No protection in front of the API.** The site is behind Cloudflare, but the app talks to Supabase directly. Heavy abuse is limited by Supabase's own limits and our per-user limits. A proxy in front of the API is an option if needed (ADR).
- **Manual payment checking depends on a careful human.** Documented procedure, audit trail, and a second pair of eyes for large orders are the mitigations.
- **Free-tier limits.** Production should not run on a plan with pausing and no backups once real money flows (open decision O-11).

---

## 11. Checklists

**Before launch (all must be ticked):**
- [ ] RLS on every table and all pgTAP tests green (`supabase test db`)
- [ ] Admin cannot reach any admin data at `aal1`; two factors enrolled for each admin
- [ ] Login, sign-up and reset messages identical for known and unknown emails
- [ ] Turnstile on sign-in, sign-up and reset; email confirmation on; secure email change on
- [ ] Security headers present; CSP has no violations in the browser console
- [ ] `npm audit`, Semgrep, gitleaks and the ZAP baseline reviewed
- [ ] Supabase Security Advisor reviewed; no warnings left unexplained
- [ ] Secrets scan of repo and `dist/` clean; service-role key absent everywhere
- [ ] Upload tests (renamed HTML/SVG, huge file) refused
- [ ] Backup taken and a restore rehearsed
- [ ] Incident runbook read by the owner
- [ ] Claude Security scan run in Claude Code and its findings triaged (T-7.09)

**Monthly:**
- Read the audit log for unexpected changes; review admin accounts and enrolled factors
- Check Dependabot alerts and update; run the ZAP baseline on staging
- Confirm backups; check storage and database usage against plan limits
- Review pending and expired InstaPay orders

---

## 12. Claude Security scans (owner-run, in Claude Code)

The Claude Security skill is built for Claude Code and needs its workflow tool, so it cannot run in this chat. Use it from the repository:

- **Scan changes** on every PR that touches `supabase/migrations/**`, `src/features/auth/**`, `src/features/admin/**`, payments, or `.github/workflows/**`.
- **Scan codebase** (medium effort) before launch and after any large refactor.
- Reports go to `CLAUDE-SECURITY-<timestamp>/` in the repository root; that folder carries its own `.gitignore` and is also ignored in the root `.gitignore`. Do not publish reports in a public repository.
- The scan complements SAST, dependency scanning and code review; it does not replace them.
