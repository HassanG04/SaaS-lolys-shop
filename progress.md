# Lolys' Accessories & Home — Project Progress

**Updated:** 2026-10-29

**Repository:** `HassanG04/ecommerce-lolys-shop`

**Current repair branch:** `agent/T-3.10f-hosted-content-editor`

**Latest fetched main:** `2e298af` (2026-10-29 check)

**Open database recovery:** [PR #56](https://github.com/HassanG04/ecommerce-lolys-shop/pull/56),
still draft and unmerged. Its SQL is owner-run; merging a frontend PR does not
apply it to hosted Supabase. Profile compatibility was merged in PR #55.

This file is a consolidated progress report. `roadmap.md` remains the formal
source of truth for task status. Counts below report the roadmap's labels; this
documentation update is not a new audit of every task's acceptance criteria.
Recorded completion does not establish hosted setup or production sign-off.

## Current position

The shop is in **Phase 8: soft launch and stabilization**. On 2026-10-29 the owner
confirmed that real purchases have occurred and the store owner was granted the
existing admin privileges. This is real commerce evidence, not a new `owner`
database role. Do not continue describing the entire purchase flow as untested.

The homepage editor is repaired. The owner's October 29 diagnostic confirmed
missing content setup. After local rehearsal, the owner applied the targeted SQL
and confirmed one content row, the save function and enabled RLS. The owner then
confirmed inline bilingual publishing and persistence after reload. See
[editor recovery](docs/runbooks/storefront-editor-recovery.md).

Roadmap status at the last check:

| Status  | Tasks |
| ------- | ----: |
| Done    |   142 |
| Doing   |     4 |
| Todo    |     8 |
| Blocked |     0 |
| Total   |   154 |

The three quality `doing` tasks are T-7.08b, T-7.08c and T-7.03b. Their implementation was
merged in PR #44 with passing checks; their roadmap labels have not yet been
reconciled with the merged review evidence. This documentation change does not
declare owner actions complete. T-2.06c remains open for hosted reconciliation;
T-3.10f is complete with owner-confirmed hosted publication/reload.

| Phase | Area                          | Done / total | Still recorded as unfinished                                                                                        |
| ----- | ----------------------------- | -----------: | ------------------------------------------------------------------------------------------------------------------- |
| 0     | Foundations                   |      24 / 24 | None                                                                                                                |
| 1     | Database and backend contract |      24 / 24 | Code complete; hosted parity is still being reconciled under T-2.06c                                                |
| 2     | App shell                     |      13 / 15 | Hosted schema acceptance (T-2.06c) and abuse-control acceptance (T-2.12)                                            |
| 3     | Storefront                    |      19 / 19 | Homepage editor recovery accepted by owner                                                                          |
| 4     | Checkout and orders           |        9 / 9 | None                                                                                                                |
| 5     | Admin                         |      21 / 21 | None                                                                                                                |
| 6     | Dashboard                     |        3 / 3 | None                                                                                                                |
| 7     | Quality and security          |      10 / 14 | Three merged repairs still labelled doing; owner security scan (T-7.09)                                             |
| 8     | Launch                        |       6 / 11 | Real purchases/admin handoff confirmed; email delivery, configuration, recovery and final checklist evidence remain |
| 9     | Analytics                     |      13 / 14 | Production forecast activation (T-9.13); execution review still needs reconciliation                                |

Real purchases do not by themselves confirm SMTP delivery, backup restoration,
second-device MFA recovery or hosted abuse controls. The last reported SMTP
result was Gmail `535 5.7.8`; no later successful confirmation/reset delivery has
been supplied. Phase 9 forecast activation is separate and needs enough real
sales history, backtests and owner approval; no live prediction accuracy is claimed.

## What has been built

### Foundations and interface

- React, TypeScript strict mode, Vite and Tailwind-based feature folders.
- Arabic-first RTL interface with English/LTR translations, self-hosted Cairo
  and Aref Ruqaa fonts, light/dark themes and responsive layouts.
- Design tokens, accessible controls, dialogs, focus handling, skeletons,
  page transitions, product hover effects, magnetic controls and flower-style
  purchase buttons.
- Storefront navigation, category filters, search, cart, favourites, product
  pages, SEO metadata and policy/footer pages.
- Admin sidebar/drawer, responsive header, dashboard, products, categories,
  orders, customers, delivery fees, payments, audit log, exports, settings,
  analytics, forecasts, demand and suggestions screens.
- Owner-controlled homepage and policy/footer content editor, including the
  themed InstaPay QR generated from the configured recipient.

### Accounts and security

- Supabase Auth registration, login, recovery, neutral authentication errors,
  password strength checks, show/copy/generate password controls and session
  handling.
- TOTP MFA enrollment and challenge flow, database-enforced `aal2` admin access,
  step-up confirmation and audit logging.
- Turnstile challenge lifecycle with fail-closed production behavior; browser
  tests simulate only the external widget on loopback.
- RLS, private payment-proof uploads, image signature/size validation, generic
  error mapping and no browser service-role key.
- Profile photo uploads, customer notifications and suggestions.

### Database and commerce

- Supabase/PostgreSQL migrations, generated types, RLS policies, explicit grants,
  pgTAP tests and concurrency checks.
- Database-authoritative prices, totals, delivery fees, stock, order creation
  and payment status.
- Approval-first order journey: customer order → owner approval → InstaPay QR →
  private payment proof → owner payment review → fulfilment/shipping.
- Saved delivery address and mandatory postal code, order snapshots, stock
  restoration/cancellation and delivery-method validation.

## Cloud architecture

| Service               | Use                                                                                  | Current state                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Cloudflare Pages      | Hosts the Vite production frontend and SPA routes                                    | Connected by the owner; production variables and deep-link behavior still require the launch checklist verification |
| Supabase Cloud        | Auth, PostgreSQL, RLS, Storage and database functions                                | Cloud project was created by the owner; agents did not change dashboard settings or apply production migrations     |
| GitHub Actions        | CI, database checks, browser tests, security checks and the manual forecast workflow | CI is green for commit `51cad50`; forecast workflow remains manual-only                                             |
| Docker + Supabase CLI | Isolated local database and browser verification                                     | Used for local testing only; no hosted database reset or production write was performed                             |

The analytics workflow uses restricted PostgreSQL roles over TLS and the
secrets `ANALYTICS_DB_URL_STAGING` and `ANALYTICS_DB_URL_PRODUCTION`. It must
not use the Supabase service-role key. Secret values were never read or printed.

## Analytics and forecasting

The project does **not** use Gemini, ChatGPT or an LLM to predict sales. It has
a Python time-series and demand-forecasting package under `analytics/`.

It is designed to forecast:

- shop and category daily units and revenue for the next 28 days;
- product weekly units for the next eight weeks;
- restocking risk and suggested reorder quantities;
- descriptive sales analysis, product performance, cohorts and basket pairs;
- calendar reminders such as Ramadan, Eid, Mother's Day and Valentine's Day.

Implemented model families include seasonal-naive and moving-average baselines,
AutoETS/AutoTheta-style statistical models, Croston SBA/TSB/ADIDA intermittent
demand models, and an optional custom gradient-boosting implementation. Global
ML is disabled by default and is gated by history and active-product thresholds.

**Price optimization is not implemented.** The specification explicitly excludes
price optimization before launch. Current forecast revenue is predicted units
multiplied by historical average unit revenue; it does not recommend a future
price. Wishlist demand is available through the admin demand view, but is not
currently a feature in the sales forecast model.

### Forecasting readiness

Forecasting is **not approved for production yet**. The workflow is manual-only
until the owner activates it. The model card and execution review describe an
older implementation (`cd7f738`, reviewed 15 October). Subsequent code repairs
must be reconciled with those reports before repeating individual defects as
current findings. The outstanding validation scope includes:

- stock rows are accepted but are not yet used by the main orchestration;
- the planned stockout, promotion and poisoned-account cleaning path is not
  fully connected to execution;
- fold lengths and readiness gates need alignment with the specification;
- selected model identifiers and generated predictions need provenance tests;
- live writer, drift-check and same-date replacement paths need end-to-end
  verification;
- no accuracy evidence exists yet for this shop's real sales.

The historical synthetic verification passed the analytics test suite (80 tests plus Ruff)
and a 365-day dry run produced 368 forecast rows, 354 metric rows and 31 series
without database writes. Those results prove software execution, not production
forecast accuracy. Production activation is T-9.13 and remains owner-controlled.

## Verification evidence

Current editor repair (2026-10-29): all 12 verify gates pass, including 914
application and 206 tooling tests; the final APPLY artifact adds one test and
all 207 tooling tests pass. Initial JS is 199872/200000 gzip bytes. Eight
mocked Chromium cases pass across both languages/themes and mobile/desktop,
including retry, draft retention and inline publication. The diagnostic SQL
passes against the local database; isolated rollback/commit and 25 content
permission assertions pass. The owner confirms live inline publish/reload.

The historical application results below apply to implementation `51cad50`,
merged as `13d9b86`; they are not a new full browser/performance run.

### Local

- `npm run verify`: all 12 gates passed.
- Application tests: 890 passed.
- Tooling tests: 204 passed.
- Coverage: 93.32% statements, 88.3% branches, 88.4% functions and 93.61% lines.
- Browser suite: 106 passed, zero failures and zero skips.
- Slow-mobile LCP: home 2256 ms, category 2220 ms; CLS 0.0565/0.
- Initial JavaScript: 199,741 of the 200,000-byte gzip budget; isolated browser
  build 199,936 bytes.
- Arabic/English, light/dark, phone/desktop visual captures reviewed.
- Roadmap parser reports 152 valid tasks.

### Remote

- [CI run 39600738034](https://github.com/HassanG04/ecommerce-lolys-shop/actions/runs/39600738034): database, analytics, build, E2E, unit/coverage, static, roadmap, secrets and SAST jobs passed at `51cad50`.
- [Static analysis run 39600738036](https://github.com/HassanG04/ecommerce-lolys-shop/actions/runs/39600738036): SAST passed.
- No main merge, production deployment, hosted database write or dashboard
  change was performed by the agents.

## Tools used

### Application and cloud

- React, TypeScript, Vite, Tailwind CSS.
- React Router, TanStack Query, i18next, Zod and Recharts.
- Supabase Auth, PostgreSQL, Storage, RLS, database functions and pgTAP.
- Cloudflare Pages and Cloudflare Turnstile.
- GitHub, GitHub Actions and Docker.

### Testing and quality

- Vitest, Testing Library and Playwright.
- axe-core accessibility checks and responsive RTL visual checks.
- TypeScript compiler, ESLint, Prettier and custom repository guards.
- Semgrep SAST, Gitleaks/secrets scanning, npm supply-chain checks and bundle
  budget checks.
- Supabase CLI, local isolated databases and custom performance profiling.

### Analytics

- Python 3.12, pytest and Ruff.
- NumPy, pandas, SciPy and psycopg.
- Repository forecasting implementations for statistical, intermittent and
  gradient-boosting models.
- GitHub Actions manual forecast workflow using restricted TLS database roles.

### Collaboration

- Git branches and pull requests.
- Codex for implementation, profiling, testing and documentation.
- Anti-Gravity for parallel review, continuation and quality control.

## Remaining work before official launch

The roadmap still lists these owner or review actions:

1. Complete hosted authentication abuse-control review (T-2.12), including
   Turnstile hostnames, Supabase CAPTCHA enforcement and rate-limit acceptance.
2. Run the owner security scan (T-7.09).
3. Configure production SMTP and verify real confirmation/reset emails (T-8.02).
4. Complete production Supabase/Cloudflare setup and deep-link checks (T-8.03).
5. Record acceptance of the real catalogue, delivery coverage and payment settings
   (T-8.04); real purchases and the store owner's admin access are confirmed.
6. Complete two-device admin recovery testing (T-8.09); granting admin access
   alone does not establish lockout recovery.
7. Record the confirmed purchases against the remaining soft-launch checklist
   (T-8.10), including both delivery/payment methods and final sign-off.
8. Reconcile remaining hosted schema drift (T-2.06c); homepage publication is
   now confirmed and T-3.10f is complete.

The shop can launch without production forecasting, provided the owner completes
the launch checklist and keeps the forecast workflow disabled. Forecasts should
not be used for real purchasing decisions until the execution findings are
reconciled and verified, real sales meet the readiness gates and T-9.13 is approved.

## Immediate next action

Review the frontend recovery PR and retain the owner's successful editor repair
and publication evidence. Obtain a fresh full schema audit for T-2.06c; the old
combined repair in #56 must not be replayed after this narrow installation.
Complete the remaining launch checklist and reconcile merged PR #44 task labels.
Production forecasting requires its own later approval.
