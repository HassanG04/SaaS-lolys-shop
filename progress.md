# Lolys' Accessories & Home — Project Progress

**Updated:** 2026-10-21

**Repository:** `HassanG04/ecommerce-lolys-shop`

**Working branch:** `agent/T-7.08b-consolidated-ci-repairs`

**Latest implementation commit:** `51cad50`

**Progress report commit:** `51961cb`

**Review:** [draft PR #44](https://github.com/HassanG04/ecommerce-lolys-shop/pull/44)

**Main:** currently `13d9b86`; this branch has not been merged.

This file is a consolidated progress report. `roadmap.md` remains the formal
source of truth for task status. A roadmap task marked `done` means its code and
documented checks are complete; it does not automatically mean that a human
production setup, live data entry or launch sign-off is complete.

## Current position

The application is a working React storefront and Supabase-backed admin shop.
The latest repair branch passes local and remote automated verification. The
remaining work is mainly owner-controlled production setup, security review,
real catalogue data and the documented analytics activation review.

Roadmap status at the last check:

| Status  | Tasks |
| ------- | ----: |
| Done    |   141 |
| Doing   |     3 |
| Todo    |     8 |
| Blocked |     0 |
| Total   |   152 |

The three `doing` tasks are T-7.08b, T-7.08c and T-7.03b. Their latest branch
checks pass, but the roadmap keeps them open until the review and evidence
workflow is formally closed.

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
until the owner activates it. The model card records these remaining concerns:

- stock rows are accepted but are not yet used by the main orchestration;
- the planned stockout, promotion and poisoned-account cleaning path is not
  fully connected to execution;
- fold lengths and readiness gates need alignment with the specification;
- selected model identifiers and generated predictions need provenance tests;
- live writer, drift-check and same-date replacement paths need end-to-end
  verification;
- no accuracy evidence exists yet for this shop's real sales.

Synthetic verification has passed the analytics test suite (80 tests plus Ruff)
and a 365-day dry run produced 368 forecast rows, 354 metric rows and 31 series
without database writes. Those results prove software execution, not production
forecast accuracy. Production activation is T-9.13 and remains owner-controlled.

## Verification evidence

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

- [CI run 39600738034](https://github.com/HassanG04/ecommerce-lolys-shop/actions/runs/39600738034): database, analytics, build, E2E, unit/coverage, static, roadmap and secrets jobs passed.
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
5. Enter real products, photos, categories, delivery fees and InstaPay settings
   (T-8.04).
6. Complete two-device admin onboarding and recovery testing (T-8.09).
7. Repair/review the analytics execution findings, then approve production
   forecasting only after real data meets the documented gates (T-9.13).
8. Perform the documented soft launch with real COD and InstaPay orders (T-8.10).

The shop can launch without production forecasting, provided the owner completes
the launch checklist and keeps the forecast workflow disabled. Forecasts should
not be used for real purchasing decisions until T-9.13 is approved.

## Immediate next action

Keep draft PR #44 available for owner review. If it is merged, rebase or recreate
this report against the then-current main branch. Do not mark launch complete from
automated CI alone; record the hosted configuration and human acceptance evidence
in the roadmap and launch checklist.
