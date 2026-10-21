<p align="center">
  <img src="docs/design/brand/lolys.jpeg" alt="Lolys' Accessories & Home — bows, pearls and gifts in cream and blush" width="420">
</p>

# Lolys' Accessories & Home

**أشياء لطيفة لأسلوبك ومساحتك**

Cute things for your style & space.

Arabic-first accessories and home goods shop for Egypt, with English support,
RTL/LTR layouts, warm cream/blush/cocoa themes and an owner-operated admin area.

[Roadmap](roadmap.md) · [Full progress report](progress.md) ·
[Design system](docs/spec/design-system.md) ·
[Launch checklist](docs/launch-checklist.md)

## Current status

The storefront, checkout, account area, admin workspace, database contract,
security controls and analytics package are present on `main`. The latest mobile
and CI repairs were merged through [PR #44](https://github.com/HassanG04/ecommerce-lolys-shop/pull/44)
on 21 October 2026. Automated checks pass for that implementation; production
readiness still depends on the owner launch checklist and hosted acceptance.

As of 21 October 2026, the roadmap records **141 of 152 tasks done**, with three
merged repair tasks still recorded as `doing` and eight owner-controlled tasks
remaining. These are recorded statuses, not a production-readiness percentage. See
[progress.md](progress.md) for the complete feature, cloud, testing, analytics and
launch summary.

## Features

- Browse products and categories, search, favourite items and use a persistent
  cart.
- Arabic and English interface with RTL/LTR direction, light/dark themes,
  responsive layouts, accessible controls, skeleton loading and motion effects.
- Register, recover an account, manage profile details and use password and TOTP
  MFA controls.
- Save delivery details, including the required postal code.
- Place cash-on-delivery or approval-first InstaPay orders. The owner approves
  the order, the customer receives the configured QR, the customer uploads a
  private payment proof and the owner reviews payment before fulfilment.
- Admin products, categories, stock, delivery fees, orders, customers, payment
  review, audit log, CSV export, notifications, suggestions and responsive
  navigation.
- Edit homepage presentation and bilingual footer/policy content from admin
  settings. InstaPay QR codes are generated from the configured recipient.
- Dashboard sales analysis, reorder views, wishlist-demand reporting and
  calendar occasion reminders.

## Cloud architecture

The application uses React, strict TypeScript, Vite and Tailwind CSS, with
React Router, TanStack Query, i18next, Zod and Recharts. Tests use Vitest,
Testing Library, Playwright, axe-core and pgTAP. Python provides analytics;
the [progress report](progress.md#tools-used) lists the supporting tools.

| Service               | Responsibility                                                                |
| --------------------- | ----------------------------------------------------------------------------- |
| Cloudflare Pages      | Hosts the Vite frontend and SPA routes                                        |
| Supabase Cloud        | Auth, PostgreSQL, RLS, Storage and database functions                         |
| GitHub Actions        | CI, database checks, browser/security checks and the manual forecast workflow |
| Docker + Supabase CLI | Isolated local database and end-to-end verification                           |

Cloud hosting and the Supabase project are owner-controlled. Production setup
still requires checking Cloudflare variables, SPA deep links, Supabase migrations,
SMTP, Turnstile hostnames, storage limits, backups and the launch checklist.
Agents do not change hosted settings or production data.

## Forecasting and AI boundary

The project does not use Gemini, ChatGPT or an LLM to make forecasts. The
`analytics/` package contains deterministic Python time-series and demand models:

- seasonal-naive and moving-average baselines;
- AutoETS/AutoTheta-style statistical models;
- Croston SBA, TSB and ADIDA intermittent-demand models;
- an optional custom gradient-boosting model, disabled by default.

The intended outputs are shop/category daily units and revenue for 28 days,
product weekly units for eight weeks, reorder guidance, descriptive analyses and
occasion reminders. **Price optimization is out of scope before launch.** Current
revenue estimates multiply predicted units by historical average unit revenue;
they do not recommend a future price. Wishlist demand is shown separately and is
not yet a forecasting input.

Forecasting runs through a manual-only GitHub Actions workflow using restricted
TLS PostgreSQL roles (`ANALYTICS_DB_URL_STAGING` and
`ANALYTICS_DB_URL_PRODUCTION`). Production forecasting remains on hold pending
verification of the current execution path, sufficient real sales history and
owner approval under T-9.13. Read the [model card](docs/analytics/model-card.md)
and [operating guide](docs/runbooks/analytics.md); the older execution review
must be reconciled with subsequent repairs. Synthetic tests demonstrate software
behavior, not accuracy on this shop's customers. The shop can launch before
production forecasting is activated.

## Local development

Use the Node version in [`.nvmrc`](.nvmrc). Never commit `.env` files, secret
keys or service-role credentials.

```sh
npm ci --ignore-scripts
```

Start Docker and follow the [local development runbook](docs/runbooks/local-dev.md)
to start and seed the local Supabase stack and configure an untracked `.env`
from `.env.example`. The frontend requires `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY` and `VITE_TURNSTILE_SITE_KEY`. Use only the browser-safe
public keys; never place a service-role key in a `VITE_` variable.

```sh
npm run db:start
npm run db:reset
```

`db:reset` erases and recreates the local database, then applies migrations and
seed data. Coordinate with other agents before resetting the shared local stack.
After configuration, start the frontend:

```sh
npm run dev
```

Open the Vite URL shown in the terminal. The development UI kit is available at
`/__kit` and is excluded from production builds. For database verification:

```sh
npm run db:test
npm run db:test:concurrency
npm run db:types:check
```

The local stack uses ports 56321–56329 and does not target Supabase Cloud.
See the [local development runbook](docs/runbooks/local-dev.md),
[first-admin runbook](docs/runbooks/first-admin.md) and
[delivery-fees runbook](docs/runbooks/delivery-fees.md).

## Verification

```sh
npm run verify
npm run test:e2e
npm run analytics:test
npm run roadmap:check
```

The implementation at `51cad50`, merged into `main` as `13d9b86` on 21 October
2026, produced the following results. These are a dated verification snapshot:

- 890 application tests and 204 tooling tests passed;
- 106 browser tests passed with no failures or skips;
- all 12 `npm run verify` gates passed;
- home/category throttled-mobile LCP of 2256/2220 ms;
- initial JavaScript bundle of 199,741/200,000 gzip bytes;
- GitHub CI database, build, E2E, unit/coverage, static, roadmap, secrets,
  SAST and analytics jobs passed in [run 39600738034](https://github.com/HassanG04/ecommerce-lolys-shop/actions/runs/39600738034).

The mobile measurements used 1.6 Mbps bandwidth, 100 ms latency and 2× CPU
throttling against a local test build; they are not measurements of the live site.

## Security and data rules

The database is authoritative for prices, totals, stock, delivery fees and
payment status. Orders use the documented database functions. RLS protects every
table, admin access requires database-enforced MFA (`aal2`), payment proofs are
private, uploads are restricted to validated image formats, and browser code
never receives the service-role key.

All user-facing failures use the application error mapping and catalogue codes;
raw backend error messages are not rendered. Read
[security-model.md](docs/spec/security-model.md) and
[error-codes.md](docs/spec/error-codes.md) before changing security-sensitive
paths.

## Launch work still required

The owner must complete the hosted and operational gates before launch:

1. Verify hosted Turnstile, CAPTCHA enforcement and authentication abuse limits.
2. Complete the owner security scan and review under T-7.09.
3. Configure production SMTP and test confirmation and recovery emails.
4. Complete Cloudflare/Supabase production setup and direct deep-link checks.
5. Enter real products, images, categories, delivery fees and InstaPay settings.
6. Complete two-device admin onboarding and account-recovery testing.
7. Run the documented soft launch with real COD and InstaPay orders.

See [launch-checklist.md](docs/launch-checklist.md),
[runbooks](docs/runbooks/README.md) and the [full progress report](progress.md).

For recurring dashboard, payment, inventory, backup and incident checks, follow
the [weekly operations runbook](docs/runbooks/weekly.md).

## Contributing

Read [AGENTS.md](AGENTS.md), the roadmap and `progress.md` before changing the
project. Work on a task branch, preserve the security and database rules, run the
required checks, update the progress/handoff records and submit a pull request.
Agents do not merge to `main`, deploy production or change hosted dashboards.
