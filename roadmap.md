# Lolys' Accessories & Home: Engineering Roadmap (agent-ready)

| | |
|---|---|
| Project | Lolys' Accessories & Home: an Arabic-first (RTL) online shop for accessories and home items in Egypt |
| Version | 1.1, updated 2026-10-07 (v1.0 created 2026-10-06) |
| Audience | Autonomous coding agents (primary), the owner (reviewer and approver) |
| Specs | `docs/spec/security-model.md`, `error-codes.md`, `database-contract.md`, `design-system.md`, `analytics-plan.md` (Appendix E) |
| Inputs | `docs/Accessories_Store_Project_Plan.docx`, `docs/db/initial-sql/*.sql`, `docs/spec/*`, `docs/design/*` (H-01 to H-04) |

**Contents:** 0 Protocol | 1 Rules | 2 Project snapshot | 3 Stack, environments, pipeline | 4 Repository blueprint | 5 Roadmap (Phases 0 to 9) | Appendices A to G

---

## 0. Read this first (agent protocol)

This file is the single source of truth for scope, order and status. Do not rely on chat history. Do not read the whole file each session: read this section, section 1, the task that `roadmap:next` prints, and only the spec files that task cites (`docs/spec/`, Appendix E).

1. **Start:** fetch the latest `main`, run `npm ci` if `package-lock.json` changed, then run `npm run roadmap:next`. Until T-0.03 exists, do T-0.01, T-0.02, T-0.03 in order by hand.
2. **Work one task at a time** on a branch named `agent/<task-id>-<slug>`. Stay inside the task's scope.
3. **A task is done** only when every "Done when" item is true, the "Verify" commands pass locally, and `npm run verify` passes.
4. **In the same PR:** set the task to `done` (`npm run roadmap -- set T-x.yy done`), add a row to the Work log (Appendix G), update docs if behaviour changed.
5. **Open a PR** using the template (Appendix C) and stop. You never merge to `main`.
6. **If blocked or unsure:** do not guess. Follow the stop rules (1.5), write the question in Appendix G, and continue with the next unblocked task or end the session.
7. **`owner: human` tasks are not yours.** Prepare what you can (runbook, workflow file) and skip them.
8. **Missing human input (H-xx)?** Use the documented placeholder, leave a `TODO(H-xx)` comment, and continue.
9. **Open decisions (O-xx)** are never blockers: use the stated default and log that you did.
10. **Security-sensitive work** (auth, MFA, RLS, migrations, payments, admin, workflows, headers) follows `docs/spec/security-model.md`. Name the SEC-xx controls you touched in the PR; the owner reviews these PRs.

---

## 1. Rules

### 1.1 Non-negotiables

1. **RLS on every table** in `public`. Never disable it or add a policy broader than this roadmap states. Every new table ships with RLS, explicit grants and a pgTAP test.
2. **The browser never decides** prices, totals, fees, stock, roles or payment status. Orders are created only by `place_order()`; payments are confirmed only by an admin through `admin_review_payment()`.
3. **No raw SQL reachable by any user, ever.** No SQL console or query box in any UI. No dynamic SQL built by joining strings (use `format('%I', ...)`, `%L` or `USING` if unavoidable; `check:sql` blocks the rest). Admin edits use typed forms that call allow-listed updates or `rpc` functions.
4. **Admin power needs two factors.** Every admin policy and function requires an `aal2` session (MFA verified), checked in the database. Admins are created only by the owner with SQL; the UI never creates, promotes or demotes anyone.
5. **Auth messages are generic.** Never reveal whether an email exists or which field was wrong. Same wording and same behaviour for every login failure (AUTH-001) and for every sign-up, reset and resend (AUTH-010).
6. **No secrets** in the repo, logs, PR text or the built site. The Supabase secret (service-role) key is never used in `src/`, CI or analytics. Only the public key is in the browser. Local test scripts may use the local stack's key.
7. **Never read or print `.env*` values.** `.env.example` holds names only.
8. **Migrations are append-only** (1.3).
9. **Users never see raw error text.** Every failure shows an Arabic message plus a code from `docs/spec/error-codes.md` (and a reference id for unexpected errors). Details stay in logs.
10. **Uploads:** images only (JPEG, PNG, WebP; never SVG or HTML), size-capped, renamed, re-encoded in the browser. Payment proofs live in a private bucket.
11. **Do not weaken or delete tests, CI checks or security controls** to get green. Fix the cause or ask.
12. **Collect only name, phone and delivery location details.** No national ID numbers. Analytics never sees personal data.
13. **Production is the owner's.** No `supabase db push` or `--linked` command against staging or production from an agent session. Deployment workflows are triggered by the human.

### 1.2 Permissions

| Level | Actions |
|---|---|
| **Allowed** | Create or edit files inside the task's scope; add tests; run local commands; add small dev-only helper scripts; refactor inside touched files; update roadmap status and work log; open PRs |
| **Ask first** (log in Appendix G, pause that task) | Add or replace a dependency not listed in 3.1; change auth, session, MFA or error-mapping behaviour; change the DB schema beyond this roadmap; change design tokens or brand rules; add an external service; change CI gates; add a top-level folder; touch any **security-sensitive path** (`supabase/migrations/**`, `src/features/auth/**`, `src/features/admin/**`, `.github/workflows/**`, `public/_headers`, `docs/spec/security-model.md`), which also needs owner review |
| **Never** | Push to `main`; merge PRs; edit a merged migration; commit secrets; disable RLS; run anything against staging or production; change GitHub, Cloudflare or Supabase dashboard settings |

### 1.3 Migration rules

- Create with `supabase migration new <snake_case_name>`. After a migration is merged to `main` it is never edited, deleted or renamed (CI blocks it, T-1.09).
- **Expand, migrate, contract.** Additive change in one PR; app code that uses it in a later PR; removal of old columns or code in a third PR, after nothing uses them.
- Every migration: RLS for new tables; explicit `grant` and `revoke` (start from zero); `security definer` functions set `search_path = public`; revoke `execute` from `public` and `anon` unless intended; pgTAP tests in the same PR; regenerate types.
- Check locally with `npm run db:reset && npm run db:test && npm run db:types`.
- No secrets and no real customer data in migrations or seed.

### 1.4 Code conventions

- TypeScript strict. No `any` (use `unknown` and narrow). No non-null `!` outside tests.
- Feature folders: `src/features/<name>/{api,components,hooks}`. Shared UI in `src/components/ui`. **No Supabase calls inside components**: only in `features/*/api.ts` or `src/lib`.
- Server state through TanStack Query (one `keys.ts` per feature). Global client state is only auth, cart, theme and language (ADR-0002).
- Forms: React Hook Form + Zod. Allow-list fields: a form sends only the fields its entity allows (`docs/spec/security-model.md` section 6).
- **Arabic first:** every string through i18n (`src/i18n/ar.json` and `en.json`, ADR-0002), language-dependent HTML lang/dir (Arabic RTL, English LTR), fonts self-hosted, Western digits. Phone numbers, emails, order numbers and codes render in `dir="ltr"` spans.
- **Errors:** only through `AppError` (`src/lib/errors.ts`). Show the Arabic message and its code. Never render `error.message`.
- **No HTML injection:** no `dangerouslySetInnerHTML`, `innerHTML`, `eval` or `new Function`. Descriptions are plain text. Image URLs come only from storage paths.
- Styling: Tailwind v4 utilities and tokens from `src/styles/tokens.css`. No hard-coded colors, radii or shadows. **Logical properties only** (`ms-`, `me-`, `ps-`, `pe-`, `text-start`).
- Money: format only with `formatEGP()` in `src/lib/format.ts`. The server is authoritative; client totals are estimates and labelled so.
- Accessibility: semantic HTML, labelled controls, visible focus, touch targets of 44px or more, WCAG AA contrast in both themes, `prefers-reduced-motion` respected.
- Tests sit next to the code (`*.test.ts(x)`). Test behaviour, mock only the network boundary (`src/lib/supabase`).
- No `console.log` in committed app code. CSV exports neutralise formulas.

### 1.5 Stop rules

Stop the task, record it in Appendix G, and move on when any of these is true:

- You need credentials or dashboard access.
- Docker or the local Supabase stack is unavailable.
- A requirement conflicts with a non-negotiable or with another task's criteria.
- The same failure persists after 3 distinct fix attempts.
- The change grows past about 400 changed lines (excluding generated files and copied SQL): split the task (add `T-x.yyb`) and say so in the PR.
- A product decision is unclear and has no default in 2.3.

### 1.6 Definition of done (every task)

- [ ] Every "Done when" item is true and every "Verify" command passed.
- [ ] `npm run verify` passes (lint, typecheck, unit tests, build).
- [ ] Tests added or updated; DB changes include pgTAP tests; types regenerated.
- [ ] UI work checked in light and dark, at 360px and 1280px, in LTR and RTL.
- [ ] No secrets, no `.env` content, no stray `console.log`, no `TODO` without a task or H-xx id.
- [ ] Roadmap status and Work log updated; docs or ADR updated if behaviour or a decision changed.
- [ ] Security-sensitive paths: the PR names the SEC-xx controls touched and has owner review.
- [ ] CI is green on the PR.

### 1.7 Git and PR conventions

- Branch `agent/T-1.02-migrations`. Commits follow Conventional Commits: `feat(db): add orders table`. Types: `feat fix test docs chore ci refactor perf`. Scopes: `db app ui auth cart checkout orders admin dashboard i18n ci docs`.
- PR title: `T-1.02: Convert SQL files into migrations`. PR body from Appendix C. Keep PRs small.
- The human squash-merges after CI is green, then the branch is deleted.

---

## 2. Project snapshot

### 2.1 Product

Visitors browse accessories by category, see stock status and fill a cart. Logged-in customers check out with cash on delivery and choose Egypt Post or the shop's representative. Admins manage products, stock, categories, orders and delivery fees, and watch revenue on a dashboard.

### 2.2 Locked decisions (change only through an ADR)

| ID | Decision |
|---|---|
| D-01 | Static single-page app (React + Vite) on Cloudflare Pages. No custom server. |
| D-02 | Supabase provides Postgres, Auth and Storage. Security is RLS plus `SECURITY DEFINER` functions. |
| D-03 | Roles `customer` and `admin`. Admins are created only by owner SQL; the UI can never create or promote one. Admin access requires MFA (`aal2`), enforced by the database. |
| D-04 | Orders only through `place_order()`. The server computes prices, fee and total and reserves stock; cancelling restocks. |
| D-05 | Payment: cash on delivery and InstaPay QR (customer uploads proof, an admin verifies). Each can be switched on or off in settings. Unpaid InstaPay orders expire (default 24 h) and restock. |
| D-06 | Delivery methods `egypt_post` and `representative`. Availability and fee per governorate in `delivery_fees`; no row means not available. |
| D-07 | Revenue = delivered orders. Booked = non-cancelled orders. Reporting days use `Africa/Cairo`. |
| D-08 | Environments: local (Supabase CLI), staging (second Supabase project), production. |
| D-09 | Design: the Lolys' brand (pink, cocoa brown, cream, gold) from the logo, with Shop-style pill controls and rounded image-first cards; light theme and "cocoa night" dark theme (`docs/spec/design-system.md`). |
| D-10 | Arabic-first interface with English support (ADR-0002 / OD-003). Saved language overrides device language; Arabic uses RTL, English LTR. Catalogue errors remain Arabic. |
| D-11 | Currency EGP; money is `numeric(10,2)`; Western digits. |
| D-12 | No raw SQL reachable by users: no SQL box in any UI, no dynamic SQL built by string joins. Admin edits use typed forms with allow-lists. |
| D-13 | Auth messages are generic and identical for known and unknown accounts. Cloudflare Turnstile protects sign-in, sign-up and reset. |
| D-14 | Every visible error has a code `AREA-NNN` and an Arabic message (`docs/spec/error-codes.md`); database errors carry the code in `hint`. |
| D-15 | Sensitive admin changes go to an append-only `audit_log`. |
| D-16 | Uploads: images only (no SVG), size-capped, re-encoded in the browser; payment proofs are private. |
| D-17 | Analytics: a scheduled Python job with least-privilege database roles, no personal data and no secret key. Forecasts are stored in the database and shown to the admin (`docs/spec/analytics-plan.md`). |
| D-18 | Development and staging use free tiers. The production plan tier is open decision O-11 (recommended: a paid Supabase plan, because real money and customer data are involved). |

### 2.3 Open decisions (use the default until the owner decides)

| ID | Decision | Default |
|---|---|---|
| O-02 | Arabic wording of the shop name for titles and text | Use the logo image and the Latin name "Lolys' Accessories & Home". |
| O-03 | Delivery fees and representative coverage | Nothing seeded. Dev data only. |
| O-04 | Auth email delivery | **Launch blocker.** Supabase's built-in email sender is limited to 2 emails per hour, so custom SMTP is required before launch (T-8.01, T-8.02). |
| O-05 | Email confirmation | On in production, and it must stay on so "Secure email change" asks both addresses. Off locally. |
| O-06 | Pending-order limit and InstaPay payment window | 3 pending orders per customer; 24 hours. |
| O-07 | Returns policy text (Arabic) | Placeholder paragraph. |
| O-08 | Custom domain | Use the `*.pages.dev` address. |
| O-09 | Error and uptime monitoring | External uptime check only; no client error upload at launch (decided in T-8.07). |
| O-10 | Pre-rendering for SEO | Not at launch. |
| O-11 | Supabase plan at launch | Recommended: a paid plan (backups, no pausing). Free tier for local, staging and development. |
| O-12 | InstaPay details: QR images, InstaPay address, who verifies and how fast | Placeholder QR; an admin verifies within 24 hours. |
| O-13 | Customer two-factor login | Optional and encouraged; mandatory only for admins. |
| O-14 | Data retention | Payment proofs deleted 90 days after delivery; audit log kept 2 years. The owner confirms with a legal professional. |
| O-15 | Brand color "simone" | Read as the cream/champagne shade from the logo. The owner confirms. |
| O-16 | Staff accounts with limited rights | Not at launch. |
| O-17 | Address form of the Arabic copy | Neutral or masculine imperatives; switch to feminine in one pass if the owner prefers. |

### 2.4 Human inputs (placeholders are used until provided)

| ID | Input | Where it goes |
|---|---|---|
| H-01 | The Shop style reference document (structure reference only) | `docs/design/shop-style-reference.md` |
| H-02 | The earlier frontend demo (visual prototype, not production code) | `docs/design/demo/` |
| H-03 | The Word plan, the six tested SQL files and the five spec files | `docs/Accessories_Store_Project_Plan.docx`, `docs/db/initial-sql/01_schema.sql` to `06_storage.sql`, `docs/spec/*.md` |
| H-04 | Logo files: the supplied PNG now; a transparent PNG or SVG and a square icon later | `docs/design/brand/` and `public/brand/` |
| H-05 | Real delivery fees: governorate x method | entered through the admin screen or runbook |
| H-06 | Product and category photos (WebP, about 200 KB each) | uploaded through the admin screen |
| H-07 | Accounts: GitHub repo, two Supabase projects, Cloudflare Pages project, Cloudflare Turnstile widget, SMTP provider | owner |
| H-08 | Docker installed on the development machine | owner |
| H-09 | Owner's GitHub username (for CODEOWNERS) | `.github/CODEOWNERS` |
| H-10 | InstaPay QR image(s) and the InstaPay address | uploaded through admin settings; placeholder until then |
| H-11 | Native-speaker review of the Arabic copy | `src/i18n/ar.json` (T-7.01) |
| H-12 | Privacy policy, terms and returns text, reviewed by a legal professional | Arabic pages (T-7.11) |
| H-13 | Authenticator app on the owner's phone, plus a second device for each admin | admin onboarding (T-8.09) |

### 2.5 Non-goals before launch

Online card payments, coupons or loyalty, product variants (sizes, colors), customer reviews, order e-mail notifications, native apps, staff roles, multi-currency, personalised recommendations, price optimisation.

---

## 3. Stack, environments, pipeline

### 3.1 Stack

Use the current stable major of each tool at project start. Record exact versions in `docs/adr/0001-stack.md`. Never bump a major version without an ADR.

| Concern | Choice |
|---|---|
| Language, tooling | TypeScript (strict), Node LTS pinned in `.nvmrc`, npm |
| Build, UI | Vite, React, Tailwind CSS v4, in-house UI kit (`src/components/ui`) |
| Fonts | Cairo (UI and body), optionally Aref Ruqaa (display accent); self-hosted woff2 |
| Routing, server state | React Router, TanStack Query |
| Forms, validation | React Hook Form, Zod |
| i18n | i18next, react-i18next (Arabic only at launch) |
| Backend client | `@supabase/supabase-js`; Supabase CLI for local stack, migrations, types and DB tests |
| Auth hardening | Supabase Auth with TOTP MFA (`aal2` enforced in the database); Cloudflare Turnstile CAPTCHA |
| Charts | Recharts, lazy-loaded in the admin chunk only |
| Tests | Vitest + Testing Library; Playwright + `@axe-core/playwright`; pgTAP through `supabase test db`; pytest for analytics |
| Quality | ESLint (typescript-eslint, react-hooks, jsx-a11y), Prettier; ruff for Python |
| Security tooling | Semgrep (OSS rules), gitleaks, OWASP ZAP baseline, Dependabot, `npm audit`; owner-run Claude Security scans in Claude Code |
| Analytics | Python 3.12; pandas or polars; Nixtla `statsforecast`; scikit-learn; LightGBM (optional, gated by ADR) |
| CI, hosting | GitHub Actions; Cloudflare Pages (Git integration) |

### 3.2 Environments and secrets

| Environment | Frontend | Supabase | Database changes applied by | Data |
|---|---|---|---|---|
| local | `npm run dev` (Vite) | `supabase start` (Docker) | the agent, with `db:reset` | seed and test data |
| staging | Cloudflare Pages preview deployments (PR branches) | project #2 | `db-staging.yml` on merge to `main` | fake and synthetic data only |
| production | Cloudflare Pages production branch `main` | project #1 | the owner, by running `db-production.yml` | real data |

| Secret | Lives in | Who may see it |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public key), `VITE_TURNSTILE_SITE_KEY` (public) | Cloudflare Pages env (Preview = staging, Production = production); `.env.local` locally | anyone (public by design; protected by RLS) |
| `SUPABASE_ACCESS_TOKEN`, `STAGING_PROJECT_REF`, `STAGING_DB_PASSWORD`, `PRODUCTION_PROJECT_REF`, `PRODUCTION_DB_PASSWORD` | GitHub Actions secrets | the owner only, never an agent |
| `ANALYTICS_DB_URL_STAGING`, `ANALYTICS_DB_URL_PRODUCTION` (restricted analytics roles) | GitHub Actions secrets | the owner only |
| Turnstile secret key, SMTP credentials | Supabase dashboard only | the owner only |
| Service-role (secret) key | nowhere; this project never needs it | no one |

### 3.3 Pipeline

| Job or workflow | Trigger | What it does | Blocks merge |
|---|---|---|---|
| `static` | PR, `main` | `npm ci`, `lint`, `format:check`, `typecheck`, `check:i18n` | yes |
| `unit` | PR, `main` | `test:unit` with coverage thresholds (80% on `src/lib`) | yes |
| `build` | PR, `main` | `build`, `check:bundle`, `check:secrets` (repo and `dist/`) | yes |
| `roadmap` | PR, `main` | `roadmap:check` | yes |
| `secrets` | PR, `main` | gitleaks on the diff and history | yes (from T-0.12) |
| `db` | PR touching `supabase/**` or `src/types/**`; `main` | Supabase CLI via `supabase/setup-cli@v1`, `supabase start`, `db reset`, `supabase test db`, concurrency script, regenerate types and fail on diff, `check:migrations`, `check:sql` | yes (from T-1.09) |
| `e2e` | PR touching `src/**`, `e2e/**`, `supabase/**` | local stack, build, `vite preview`, Playwright, axe, security suite | yes (from T-4.07) |
| `sast` | PR, `main` | Semgrep with the project rules | yes (from T-7.06) |
| `analytics` | PR touching `analytics/**` | ruff, pytest | yes (from T-9.02) |
| `audit` | PR, weekly | `npm audit --audit-level=high --omit=dev`; Dependabot alerts | high and critical only |
| `forecast.yml` | weekly, manual | Python forecast job (T-9.08) | n/a |
| `zap.yml` | weekly, manual | OWASP ZAP baseline against staging (T-7.07) | n/a (findings are triaged) |
| `db-staging.yml` | push to `main` touching `supabase/migrations/**` | link staging, `supabase db push` | n/a |
| `db-production.yml` | `workflow_dispatch` only, input must be `PRODUCTION` | link production, `supabase db push` | n/a |
| Cloudflare Pages | Git integration | build command `npm run build`, output `dist`; production branch `main`; preview deployment per PR | n/a |

Workflow hardening: `permissions: contents: read` by default; pin third-party actions to a full commit SHA; cancel superseded runs on PRs; never echo secrets.

**Owner gate:** for PRs that touch security-sensitive paths, the owner runs the Claude Security skill ("Scan changes") in Claude Code before merging (T-7.09).

### 3.4 Release order

1. **DB change:** its own PR (additive migration + pgTAP tests). Merge, staging applies it automatically, the owner runs `db-production.yml`.
2. **App change** that uses it: separate PR. Merge, Cloudflare deploys.
3. **Cleanup** of old columns or code: later PR.
4. App-only changes: PR, check the preview URL, merge.
5. **Rollback:** app = redeploy the previous Cloudflare deployment (owner). Database = forward-fix migration, no down migrations. Before any production DB push the owner takes a backup (T-8.06).

---

## 4. Repository blueprint

```
lolys-store/
|-- AGENTS.md                    canonical agent instructions (short)
|-- CLAUDE.md                    one line: @AGENTS.md
|-- roadmap.md                   this file
|-- SECURITY.md  README.md  package.json  index.html  vite.config.ts  tsconfig*.json
|-- .nvmrc  .editorconfig  .gitignore  .env.example  .semgrep/
|-- .github/
|   |-- CODEOWNERS  dependabot.yml  pull_request_template.md
|   '-- workflows/               ci.yml  db-staging.yml  db-production.yml
|                                forecast.yml  zap.yml  keepalive.yml
|-- docs/
|   |-- spec/                    security-model  error-codes  database-contract
|   |                            design-system  analytics-plan
|   |-- adr/                     0000-template.md  0001-stack.md ...
|   |-- runbooks/                local-dev  first-admin  delivery-fees  deploy-db  auth-email
|   |                            auth-hardening  admin-onboarding  incident-response  backup-restore
|   |                            monitoring  data-requests  dependencies  analytics  weekly
|   |-- analytics/               model-card.md
|   |-- design/                  shop-style-reference.md  demo/  brand/
|   |-- db/initial-sql/          01_schema.sql ... 06_storage.sql (read-only originals)
|   |-- Accessories_Store_Project_Plan.docx
|   |-- security-review.md  launch-checklist.md  perf-report.md
|-- analytics/                   Python project (see docs/spec/analytics-plan.md)
|-- e2e/                         Playwright specs, security suite, global setup
|-- perf/                        k6 load scripts (staging only)
|-- public/                      brand/ placeholders/ fonts/ _headers robots.txt .well-known/security.txt
|-- scripts/                     roadmap.mjs  check-secrets  check-bundle  check-migrations
|                                check-i18n  check-sql
|-- supabase/
|   |-- config.toml  seed.sql
|   |-- migrations/              timestamped, append-only
|   '-- tests/                   database/*.test.sql  concurrency.sh
'-- src/
    |-- main.tsx  App.tsx  routes.tsx
    |-- lib/                     env  supabase  format  errors  step-up  cart storage
    |-- i18n/                    ar.json  index.ts
    |-- types/                   database.types.ts (generated)  index.ts
    |-- styles/                  tokens.css  index.css
    |-- components/ui/           Button  Pill  Card  Input  Dialog  Toast  Skeleton  ornaments/
    |-- components/layout/       Navbar  Footer  Layout
    '-- features/
        |-- auth/  catalog/  cart/  checkout/  orders/  account/  payments/
        '-- admin/               products  categories  orders  payments  customers  delivery
                                 settings  audit  dashboard  forecast  analytics
```

---

## 5. Roadmap

Task format and the tool that reads it are defined in Appendix A. Status values: `todo`, `doing`, `done`, `blocked`, `skip`.

| Phase | Goal | Exit criteria |
|---|---|---|
| 0 Foundations | Repo, tooling, CI, brand design system, security basics | PR gets green CI and a preview URL; kit page renders in both themes; secret scanning on |
| 1 Database | Verified schema as migrations, security hardening, payments, tests, deploy workflows | `supabase test db` green in CI; admin needs `aal2`; staging receives migrations |
| 2 App shell | Routing, Arabic layout, auth, MFA, error framework | A user can register, log in and see their role; an admin is forced through MFA |
| 3 Storefront | Home, category, product, cart, search | A guest can browse and fill a cart on a phone, in Arabic |
| 4 Checkout and orders | Location form, COD and InstaPay QR, my orders, account | Both payment paths work end to end; stock decreases; e2e green |
| 5 Admin | Full control of catalogue, orders, payments, settings, audit, exports | The admin runs the shop without SQL |
| 6 Dashboard | Revenue and operations dashboard | KPIs, charts, low stock visible |
| 7 Quality and security hardening | Arabic review, accessibility, performance, security tests and scans, legal | Budgets met; axe clean; security review and scans done |
| 8 Launch | Production setup, monitoring, runbooks, soft launch | Real test orders succeed on phones; admins enrolled on two devices |
| 9 AI analytics | Forecasting and analysis | Weekly forecast job runs; the admin sees forecasts, reorder advice and analyses |

### Phase 0: Foundations

#### T-0.01: Bootstrap the repository
`status: done` `owner: agent` `needs: none` `size: S`
- **Do:** Create the Vite + React + TypeScript (strict) project with npm. Add the folder skeleton from section 4, `.nvmrc` (current Node LTS), `.editorconfig`, `.gitignore` (ignore `.env*` except `.env.example`, `dist`, `coverage`, `playwright-report`, `supabase/.temp`), `.env.example` (names only) and a README with run instructions.
- **Done when:** `npm ci && npm run dev` serves a blank page; `npm run build` passes; the repo contains no secrets.
- **Verify:** `npm ci && npm run build`

#### T-0.02: Quality tooling
`status: done` `owner: agent` `needs: T-0.01` `size: M`
- **Do:** Add ESLint (flat config: typescript-eslint, react-hooks, jsx-a11y), Prettier, Vitest + Testing Library + jsdom, the `@/` path alias, and the npm scripts from Appendix F (stub those that depend on later tasks). Add one sample test.
- **Done when:** `lint`, `format:check`, `typecheck`, `test:unit` and `verify` all pass on the skeleton.
- **Verify:** `npm run verify`

#### T-0.03: Roadmap tool
`status: done` `owner: agent` `needs: T-0.01` `size: M`
- **Do:** Write `scripts/roadmap.mjs` (Node only, no dependencies) implementing Appendix A: `status`, `next`, `check`, `set <id> <status>`. Add npm scripts `roadmap`, `roadmap:next`, `roadmap:check`. Add parser tests with small fixtures.
- **Done when:** `roadmap:check` passes on this file and fails on fixtures with a duplicate ID, an unknown dependency, a cycle and a bad status; `roadmap:next` prints the first `todo` agent task whose needs are all `done` or `skip`.
- **Verify:** `npm run roadmap:check && npm run roadmap:next`

#### T-0.04: Agent instruction files
`status: done` `owner: agent` `needs: T-0.03` `size: S`
- **Do:** Create `AGENTS.md` from Appendix B (canonical, under 200 lines) and a `CLAUDE.md` containing the single line `@AGENTS.md`. (Claude Code reads `CLAUDE.md`, not `AGENTS.md`, and a `CLAUDE.md` can import another file with `@path`.)
- **Done when:** both files exist; `AGENTS.md` lists commands and hard rules and points to `roadmap.md` instead of copying it.
- **Verify:** `wc -l AGENTS.md` shows 200 or fewer

#### T-0.05: PR, ADR and runbook templates
`status: done` `owner: agent` `needs: T-0.01` `size: S`
- **Do:** Add `.github/pull_request_template.md` (Appendix C), `docs/adr/0000-template.md` (Appendix D), `docs/adr/0001-stack.md` recording section 3.1 with the exact installed versions, and `docs/runbooks/README.md` listing the planned runbooks.
- **Done when:** the files exist and ADR-0001 lists real versions from `package.json`.
- **Verify:** manual review

#### T-0.06: CI v1
`status: done` `owner: agent` `needs: T-0.02, T-0.03` `size: M`
- **Do:** Add `.github/workflows/ci.yml` with jobs `static`, `unit`, `build`, `roadmap` per section 3.3. Use `permissions: contents: read`, a concurrency group per ref (cancel in-progress on PRs), npm cache, Node version from `.nvmrc`, actions pinned to full SHAs.
- **Done when:** a test PR shows all four jobs green, and a deliberately broken lint rule turns `static` red (then revert).
- **Verify:** open the PR and read the checks

#### T-0.07: Brand tokens and self-hosted fonts
`status: done` `owner: agent` `needs: T-0.02` `size: M`
- **Do:** Implement `docs/spec/design-system.md` in `src/styles/tokens.css` (Tailwind v4 `@theme`): the Lolys' light theme (cream, blush pink, cocoa brown, gold) and the "cocoa night" dark theme keyed on `[data-theme=dark]`. Self-host the fonts (woff2, no third-party font requests) with their licenses. Set `<html lang="ar" dir="rtl">`. Theme behavior is split into T-0.07b to keep each review near 400 authored lines; the original requirements are preserved across both tasks.
- **Done when:** a unit test recomputes every published contrast pair from the tokens and meets the ratios in the spec; typography, shape and focus tokens match the spec; no external font or script requests.
- **Verify:** `npm run test:unit`

#### T-0.07b: Persistent and accessible theme switching
`status: done` `owner: agent` `needs: T-0.07` `size: M`
- **Do:** Complete the behavior split from T-0.07: add `ThemeProvider`, `useTheme` and an accessible Arabic theme toggle. Use localStorage key `theme`, default to `prefers-color-scheme`, and initialize the theme inline before first paint. Preserve operation if browser storage is unavailable and keep the selected theme consistent with system changes.
- **Done when:** the toggle works with pointer and keyboard, persists, restores without a wrong-theme flash, and respects the documented 44px target/focus/contrast requirements; both themes pass at 360px and 1280px in RTL and LTR. Tests cover stored, system and unavailable-storage cases.
- **Verify:** `npm run test:unit`

#### T-0.08: UI actions and cards
`status: done` `owner: agent` `needs: T-0.07b` `size: M`
- **Do:** Build RTL-first Button (cocoa primary pill, blush secondary pill, ghost, danger), IconButton and Card (28px radius, soft shadow, 20px inner image radius and 8px frame) per `docs/spec/design-system.md`. Start the dev-only `/__kit` route with both themes and LTR/RTL samples, excluded from production builds. Split the original UI kit across T-0.08b through T-0.08e under the 400-line review rule; retain every original requirement.
- **Done when:** buttons support keyboard activation and native disabled/form behavior; icon actions have accessible names and mirror only directional artwork; 44px targets and focus outlines are retained; every component has a test; cards respect reduced motion; no hard-coded colors, radii or shadows outside tokens. Both themes checked at 360/1280 in RTL/LTR.
- **Verify:** `npm run verify`

#### T-0.08b: UI text and search fields
`status: done` `owner: agent` `needs: T-0.08` `size: M`
- **Do:** Continue the UI kit per `docs/spec/design-system.md`: Input and SearchInput (pill with round submit), Select and Textarea. Extend `/__kit` with labelled Arabic examples, error/disabled states and both directions/themes. Checkbox/Radio are split into T-0.08f under the review-size rule; no requirements removed.
- **Done when:** every component has behavior tests; labels never rely on placeholders; errors are accessible; controls have 44px targets and visible focus; tokens/logical styling and reduced motion are preserved.
- **Verify:** `npm run verify`

#### T-0.08f: UI choice controls
`status: done` `owner: agent` `needs: T-0.08b` `size: S`
- **Do:** Complete the form-control inventory split from T-0.08b: labelled Checkbox and Radio, Arabic examples in `/__kit`, disabled and checked states, unique radio groups in repeated previews. Follow `docs/spec/design-system.md`.
- **Done when:** label activation, Space/arrow navigation, disabled behavior and group isolation have tests; selection includes a non-color mark; controls have 44px targets and visible focus in both directions/themes, with documented tokens only.
- **Verify:** `npm run verify`

#### T-0.08c: UI feedback and navigation
`status: done` `owner: agent` `needs: T-0.08f` `size: M`
- **Do:** Continue the UI kit: Toast and Tabs per `docs/spec/design-system.md`. Extend `/__kit` with Arabic examples in both themes and directions. Dialog is split into T-0.08g to keep reviews small.
- **Done when:** every component has behavior tests; tabs have unique relationships and keyboard navigation in both directions; feedback is accessible; controls have 44px targets and focus outlines; tokens and reduced motion are preserved.
- **Verify:** `npm run verify`

#### T-0.08g: Accessible dialogs
`status: done` `owner: agent` `needs: T-0.08c` `size: M`
- **Do:** Complete the dialog split from T-0.08c per `docs/spec/design-system.md`; add an Arabic `/__kit` example in both themes and directions.
- **Done when:** dialog naming, focus containment/restoration, controlled open/close and Escape work; behavior tests pass; controls have 44px targets and focus outlines; tokens and reduced motion are preserved.
- **Verify:** `npm run verify`

#### T-0.08d: UI labels and brand ornaments
`status: done` `owner: agent` `needs: T-0.08g` `size: M`
- **Do:** Finish the component inventory with Pill/Chip, Badge, Skeleton and SVG ornaments using `currentColor`: ribbon bow, ribbon divider, sparkle, pearl loader and arch frame. Follow `docs/spec/design-system.md` and add every example to `/__kit`.
- **Done when:** each component has a test; states include text or icons, not color alone; ornaments follow themes; animations stop under reduced motion; arch/card/image shapes use the documented tokens.
- **Verify:** `npm run verify`

#### T-0.08e: UI kit token guard and final verification
`status: done` `owner: agent` `needs: T-0.08d` `size: M`
- **Do:** Complete the original UI-kit acceptance gate: add a grep-based token check to `verify`, test rejection of hard-coded colors/radii/shadows, and verify `/__kit` contains the full inventory in both themes and an LTR sample while remaining excluded from production builds.
- **Done when:** token guard fails on negative fixtures and passes the repo; all components have tests; the full kit passes keyboard, 44px target, focus, direction icon and reduced-motion checks at 360/1280 in RTL/LTR and both themes; production artifacts exclude kit code/assets/copy.
- **Verify:** `npm run verify`

#### T-0.08h: Bilingual interface and production dictionaries
`status: done` `owner: agent` `needs: T-0.08d` `size: M`
- **Do:** Review the owner-requested Arabic/English implementation recorded in OD-003; document ADR-0002, use the existing accessible Button for the language switch, and keep preview copy out of production. Language changes must not alter catalogue error/authentication rules. Persistence and detailed verification are split into T-0.08i under the review-size rule.
- **Done when:** shipped controls and previews switch language/direction; labels identify the destination language; tokens/focus/44px requirements hold; production excludes preview code/copy/assets; both themes/directions pass at 360/1280. Incoming source and history preserved.
- **Verify:** `npm run verify`

#### T-0.08i: Language preference behavior and verification
`status: done` `owner: agent` `needs: T-0.08h` `size: S`
- **Do:** Complete ADR-0002 behavior checks for device selection, valid/invalid saved choices, blocked storage, keyboard switching, translated labels and document direction before paint. Verify dictionary key parity and unchanged Arabic catalogue-error previews. Retain the existing theme preference independently.
- **Done when:** behavior tests and full verification pass; UI language/direction and focus match both themes at 360/1280, including reduced motion; production preview exclusion still passes.
- **Verify:** `npm run verify`

#### T-0.08j: Compact authentication form preview
`status: done` `owner: agent` `needs: T-0.08i` `size: S`
- **Do:** Polish the development UI-kit login/register preview with centered panels capped at the documented readable form width. Keep fields full width inside their panel, stack them on narrow screens, and place the two panels side by side only when the viewport allows. Use existing tokens, labels, focus behavior and both language directions.
- **Done when:** login and registration previews no longer stretch across the page; fields remain readable and full width within each panel; mobile layout remains usable; tests and production preview exclusion pass.
- **Verify:** `npm run verify`

#### T-0.09: Repo guards
`status: done` `owner: agent` `needs: T-0.06` `size: M`
- **Do:** Write `scripts/check-secrets.mjs`: scan tracked files and `dist/`; fail on any JWT whose decoded payload has `role: service_role`, on `sb_secret_` keys, and on `service_role` strings outside an allowlist of docs and tests (the public anon key may appear in `dist/`). Write `scripts/check-bundle.mjs`: gzip budget for initial route JS of 200 KB or less, admin chunk separate. Wire both into the `build` job.
- **Done when:** a planted fake secret makes the script fail; a budget breach is shown once, then reverted.
- **Verify:** `npm run check:secrets && npm run build && npm run check:bundle`

#### T-0.10: Protect main
`status: todo` `owner: human` `needs: T-0.06` `size: S`
- **Do:** In GitHub settings require PRs and passing checks (`static`, `unit`, `build`, `roadmap`; add `secrets`, `db`, `e2e`, `sast` and `analytics` when they exist), squash merge only, no force-push, delete merged branches.
- **Done when:** a direct push to `main` is rejected.
- **Verify:** attempt a push to `main`

#### T-0.11: Cloudflare Pages project
`status: todo` `owner: human` `needs: T-0.06` `size: S`
- **Do:** Create the Pages project from the GitHub repo (Git integration): framework preset Vite, build command `npm run build`, output directory `dist`, production branch `main`, preview deployments on. Environment variables are added in T-1.11 and T-1.13.
- **Done when:** a PR gets a preview URL and `main` deploys.
- **Verify:** open the preview URL

#### T-0.12: Security basics in the repository
`status: done` `owner: agent` `needs: T-0.06` `size: M`
- **Do:** Add `SECURITY.md` (how to report a vulnerability privately), `public/.well-known/security.txt`, `.github/CODEOWNERS` assigning the owner (H-09) to `supabase/migrations/**`, `src/features/auth/**`, `src/features/admin/**`, `.github/workflows/**`, `public/_headers` and `docs/spec/security-model.md`, `.github/dependabot.yml` (npm, github-actions and pip for `analytics/`, weekly), a `secrets` CI job running gitleaks, and add `CLAUDE-SECURITY-*/` to `.gitignore`.
- **Done when:** the files exist; the `secrets` job fails on a planted fake key and passes without it; the Dependabot config validates.
- **Verify:** open a PR and read the checks

#### T-0.13: GitHub security settings
`status: todo` `owner: human` `needs: T-0.12` `size: S`
- **Do:** Turn on secret scanning with push protection, Dependabot alerts and security updates, and private vulnerability reporting. Require CODEOWNERS review for the protected paths. Require two-factor authentication on every GitHub account with access.
- **Done when:** a push containing a test secret is blocked, and a PR touching a protected path requests the owner's review.
- **Verify:** try both once on a scratch branch

### Phase 1: Database and backend contract

#### T-1.01: Local Supabase project
`status: done` `owner: agent` `needs: T-0.01` `size: S`
- **Do:** Run `supabase init`. In `supabase/config.toml` set the auth site URL to `http://localhost:5173` and turn email confirmations off locally. Add scripts `db:start`, `db:stop`, `db:reset`, `db:test`, `db:types`. Document the Docker requirement in the README.
- **Done when:** `npm run db:start` brings the stack up and `supabase status` prints the API URL and keys.
- **Verify:** `npm run db:start && supabase status`

#### T-1.02: Convert the tested SQL into migrations
`status: done` `owner: agent` `needs: T-1.01` `size: L`
- **Do:** From `docs/db/initial-sql/`: files 01 to 04 become separate timestamped migrations (schema, security, functions, views); the governorates insert (05 part A) becomes a reference-data migration; 06 becomes a storage migration; the demo catalogue (05 part B) goes to `supabase/seed.sql`; the first-admin snippet goes to the runbook (T-1.14), not the seed. Leave the originals untouched. The SQL was tested on PostgreSQL 16 with stand-ins for Supabase auth and storage, not on the real stack: fix whatever the real stack rejects inside these not-yet-merged migrations and note each fix in the Work log.
- **Done when:** `supabase db reset` succeeds from scratch; `governorates` has 27 rows; the seed gives 4 categories and 6 products; RLS is enabled on all 8 public tables; `delivery_fees` is empty.
- **Verify:** `npm run db:reset` then `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select count(*) from public.governorates"` (use the URL from `supabase status`)

#### T-1.03: Generated database types
`status: done` `owner: agent` `needs: T-1.02` `size: S`
- **Do:** `npm run db:types` writes `src/types/database.types.ts` (`supabase gen types typescript --local`). Add `src/types/index.ts` re-exporting helpers (`Tables`, `TablesInsert`, `Enums`).
- **Done when:** the generated file is committed and `typecheck` passes.
- **Verify:** `npm run db:types && git diff --exit-code && npm run typecheck`

#### T-1.04: pgTAP harness
`status: done` `owner: agent` `needs: T-1.02` `size: M`
- **Do:** Create `supabase/tests/database/`. Vendor the Supabase test helpers (basejump `supabase-test-helpers`: `tests.create_supabase_user`, `tests.authenticate_as`, `tests.clear_authentication`, `tests.rls_enabled`) as `00000-supabase_test_helpers.sql`. Add `01_rls_enabled.test.sql` asserting RLS is on for every `public` table (scenario S17).
- **Done when:** `supabase test db` passes, and temporarily disabling RLS on one table makes it fail (then revert).
- **Verify:** `npm run db:test`

#### T-1.05: DB tests: auth and visibility
`status: done` `owner: agent` `needs: T-1.04` `size: M`
- **Do:** Implement scenarios S1, S2, S3, S8, S9, S15 (`docs/spec/database-contract.md` (section 10)) in `02_auth_visibility.test.sql`.
- **Done when:** all assertions pass, and each scenario fails if its protecting policy or grant is removed (spot-check two).
- **Verify:** `npm run db:test`

#### T-1.06: DB tests: orders and cancellation
`status: done` `owner: agent` `needs: T-1.04` `size: L`
- **Do:** Implement scenarios S4, S5, S6, S10, S11 in `03_orders.test.sql` and `04_cancel_restock.test.sql`.
- **Done when:** all assertions pass; failed orders leave no rows and no stock change.
- **Verify:** `npm run db:test`

#### T-1.07: DB tests: admin and privileges
`status: done` `owner: agent` `needs: T-1.04` `size: M`
- **Do:** Implement scenarios S12, S13, S14, S16 in `05_admin.test.sql` and `06_privileges.test.sql`.
- **Done when:** all assertions pass.
- **Verify:** `npm run db:test`

#### T-1.08: Concurrency check
`status: done` `owner: agent` `needs: T-1.06` `size: M`
- **Do:** Write `supabase/tests/concurrency.sh`: two `psql` sessions against the local database (URL from `supabase status`); session A places an order for the last units and holds the transaction for a few seconds; session B orders the same product. Add script `db:test:concurrency`. This is scenario S7.
- **Done when:** B waits, then fails with the out-of-stock error; final `stock_quantity` and `sold_count` are correct; the script exits non-zero if overselling happens.
- **Verify:** `npm run db:test:concurrency`

#### T-1.09: CI db job and migration guard
`status: done` `owner: agent` `needs: T-1.05, T-1.06, T-1.07, T-1.08, T-0.06` `size: M`
- **Do:** Add job `db` (3.3): `supabase/setup-cli@v1`, `supabase start`, `supabase db reset`, `supabase test db`, the concurrency script, regenerate types and fail on diff. Add `scripts/check-migrations.mjs`: fail if a migration that exists on `origin/main` is modified, deleted or renamed in the PR.
- **Done when:** a PR that edits a merged migration fails, and a PR with out-of-date types fails.
- **Verify:** open a PR and read the checks. Then ask the owner to add `db` to the required checks (T-0.10).

#### T-1.10: Stable error codes
`status: done` `owner: agent` `needs: T-1.09` `size: M`
- **Do:** One new migration (never edit merged ones) that recreates `place_order`, `cancel_my_order`, `admin_dashboard` and `orders_status_guard` so every `raise exception` also sets `using hint = '<code>'` from `docs/spec/error-codes.md` (stock errors add `detail = 'left=<n>'`). English messages stay for logs and tests. Add pgTAP checks (scenario S18) and regenerate types. (`admin_set_role` is dropped in T-1.15, so it is left alone here.)
- **Done when:** every failure path returns its code in `hint`, and all earlier tests still pass.
- **Verify:** `npm run db:reset && npm run db:test`

#### T-1.11: Staging Supabase project
`status: todo` `owner: human` `needs: T-0.11` `size: S`
- **Do:** Create the second free Supabase project (`shop-staging`) and note its project ref. Add GitHub secrets `SUPABASE_ACCESS_TOKEN`, `STAGING_PROJECT_REF`, `STAGING_DB_PASSWORD`. Set the Cloudflare **Preview** environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the staging values.
- **Done when:** the secrets and variables exist (names are listed in `docs/runbooks/deploy-db.md`, never the values).
- **Verify:** `db-staging.yml` runs green (after T-1.12)

#### T-1.12: DB deploy workflows
`status: done` `owner: agent` `needs: T-1.09` `size: M`
- **Do:** Add `.github/workflows/db-staging.yml` (on push to `main` touching `supabase/migrations/**`: setup CLI, `supabase link --project-ref`, `supabase db push`) and `.github/workflows/db-production.yml` (`workflow_dispatch` only; requires the input `PRODUCTION`; same steps with the production secrets). Never echo secrets. Document both in `docs/runbooks/deploy-db.md`, including: a paused free project must be restored in the dashboard before the job can connect.
- **Done when:** both files pass `actionlint` (if available) and review; the staging run succeeds once T-1.11 is done.
- **Verify:** review the workflow files

#### T-1.13: Production Supabase project
`status: todo` `owner: human` `needs: T-1.11` `size: S`
- **Do:** Create the first Supabase project for production. Add GitHub secrets `PRODUCTION_PROJECT_REF`, `PRODUCTION_DB_PASSWORD`. Set the Cloudflare **Production** environment variables. Push nothing yet.
- **Done when:** secrets and variables exist.
- **Verify:** checklist in `docs/runbooks/deploy-db.md`

#### T-1.14: Database runbooks
`status: done` `owner: agent` `needs: T-1.02` `size: S`
- **Do:** Write `docs/runbooks/local-dev.md` (Docker, start and stop, test users, where local emails appear: see `supabase status`), `first-admin.md` (sign up, then the owner-run SQL update from `05_seed.sql`) and `delivery-fees.md` (insert examples; no row means not available).
- **Done when:** a new developer can follow them from a clean machine.
- **Verify:** manual review

#### T-1.15: Admin hardening (two factors in the database)
`status: done` `owner: agent` `needs: T-1.10` `size: M`
- **Do:** One new migration (S19, S20, S30). `is_admin()` returns true only when the role is `admin` and `auth.jwt() ->> 'aal'` is `aal2`. Add `require_admin()` (raises ADM-002 for an admin at `aal1`, otherwise ADM-001) and call it first in every admin function. Drop `admin_set_role`. Add a trigger that blocks changes to `profiles.role` unless the session user is the database owner. Clamp sign-up metadata in `handle_new_user` (name 100, phone 20 characters). Add length checks to text columns. Make sure every admin policy goes through `is_admin()`.
- **Done when:** pgTAP shows an admin at `aal1` reads zero admin rows and gets ADM-002, and at `aal2` it works; API attempts to change a role fail; `admin_set_role` no longer exists; owner SQL can still promote an account.
- **Verify:** `npm run db:reset && npm run db:test`

#### T-1.16: Audit log
`status: done` `owner: agent` `needs: T-1.15` `size: M`
- **Do:** Migration (S21). Table `audit_log` as in `docs/spec/database-contract.md`: readable only by an admin at `aal2`, no write grants for any API role, and a trigger that blocks update and delete. Triggers on products (name, price, discount, stock, active, featured), categories, delivery_fees, shop_settings, orders (status, payment fields, tracking) and profiles (role) record actor, role and old and new values when the actor is an admin or the database owner. An `audit_event()` helper for functions.
- **Done when:** admin changes appear with actor and values; stock changes made by `place_order` do not; update and delete of log rows fail even for the owner role.
- **Verify:** `npm run db:test`

#### T-1.17: Shop settings
`status: done` `owner: agent` `needs: T-1.16` `size: M`
- **Do:** Migration (S22). `shop_settings` and `admin_update_setting(p_key, p_value)` with the allow-list and typed validation from the contract. Anonymous users read public keys only. Direct writes are revoked. Changes are audited. Seed defaults. Set size and type limits on the `product-images` bucket (3 MB; JPEG, PNG, WebP).
- **Done when:** unknown keys and invalid values return ADM-008 and ADM-007; private keys are invisible to anonymous users and customers.
- **Verify:** `npm run db:test`

#### T-1.18: Orders v2 and payments
`status: done` `owner: agent` `needs: T-1.17` `size: L`
- **Do:** Migration (S23, S24, S25). Add `instapay_qr` to `payment_method`; add enum `payment_status`; add the new order columns and the structured address fields; add the profile address columns; replace `place_order` with the v2 signature (`p_items`, `p_delivery_method`, `p_payment_method`, `p_ship`), enforcing settings (enabled methods, payment window), field lengths and error codes; add `submit_payment_proof`, `admin_review_payment` and `expire_unpaid_orders` (schedule with `pg_cron` every 30 minutes if available, otherwise document a manual admin button); add a trigger that sets COD orders to `paid` on delivery; create the private bucket `payment-proofs` with per-user folder policies and admin read and delete; make `payment_reference` unique.
- **Done when:** S23 to S25 pass; a proof path outside `<uid>/<order_id>/` is refused; overdue unpaid InstaPay orders are cancelled and restocked.
- **Verify:** `npm run db:reset && npm run db:test`

#### T-1.19: Catalog admin support
`status: done` `owner: agent` `needs: T-1.18` `size: M`
- **Do:** Migration (S26). Add `categories.is_active`, `categories.show_on_home` and `products.is_featured`. Image columns hold storage paths and are pattern-checked (`docs/spec/database-contract.md`). Add `admin_delete_product` (only if never ordered) and `admin_delete_category(p_id, p_move_to)`. Storefront policies show only active categories and products.
- **Done when:** deleting an ordered product returns ADM-004; deleting a non-empty category without a target returns ADM-005; URLs and bad paths in image columns are refused.
- **Verify:** `npm run db:test`

#### T-1.20: Abuse controls
`status: done` `owner: agent` `needs: T-1.18` `size: M`
- **Do:** Migration (S27, S28). Add `rate_limits` and `check_rate_limit()` and use it in `place_order`, `submit_payment_proof` and `cancel_my_order`. In `place_order` also cap order lines (30), quantity per line (20 or the stock) and pending orders per customer (setting `pending_order_limit`, default 3). Rate-limit by user id; add IP-based limits only after confirming on staging which forwarded-address value can be trusted.
- **Done when:** the fourth pending order returns ORD-010; repeated calls return SYS-003 and recover after the window.
- **Verify:** `npm run db:test`

#### T-1.21: Stock ledger
`status: done` `owner: agent` `needs: T-1.18` `size: M`
- **Do:** Migration (S29). Table `stock_movements` filled by a trigger on `products.stock_quantity`. Functions set the reason with `set_config('app.stock_reason', ...)`; an unexplained admin edit is recorded as `admin_adjust`.
- **Done when:** every order, cancellation and admin edit appears with delta, reason and actor; the movements add up to the current stock for the seed data.
- **Verify:** `npm run db:test`

#### T-1.22: SQL guard script
`status: done` `owner: agent` `needs: T-1.09` `size: M`
- **Do:** Write `scripts/check-sql.mjs` (script `check:sql`). It fails if a migration uses `execute` with string concatenation (`||`) instead of `format('%I')`, `%L` or `USING`; if a `security definer` function has no `set search_path`; if a `create table` in `public` has no RLS enabled in the same or a later migration; or if a table outside the allow-list is granted to `anon`. Run it in the `db` job.
- **Done when:** a fixture for each violation fails, and the real migrations pass.
- **Verify:** `npm run check:sql`

### Phase 2: App shell

#### T-2.01: Environment and Supabase client
`status: done` `owner: agent` `needs: T-1.03` `size: S`
- **Do:** Add `src/lib/env.ts` (Zod-validated `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY`, readable failure message) and `src/lib/supabase.ts` (typed `createClient<Database>`).
- **Done when:** booting without env values shows a clear error screen in development; a unit test covers validation.
- **Verify:** `npm run test:unit`

#### T-2.02: Routing and layout
`status: done` `owner: agent` `needs: T-0.08e, T-2.01` `size: L`
- **Do:** React Router with lazy routes. `Layout` with Navbar (Lolys' logo, search pill, links المتجر / تصفّح / عن المتجر, cart pill with count, account menu, theme and language toggles) and Footer (cocoa band with policy links). 404 page, scroll restoration, skip link, mobile navigation. Routes: `/`, `/category/:slug`, `/product/:id`, `/cart`, `/login`, `/checkout`, `/pay/:orderId`, `/account/orders`, `/account/security`, `/admin/*`, and the policy pages.
- **Done when:** every route renders a placeholder, is keyboard navigable, fits a 360px viewport, and looks right in RTL in both themes.
- **Verify:** `npm run verify` and manual check

#### T-2.03: Arabic i18n scaffold
`status: done` `owner: agent` `needs: T-2.02, T-0.08i` `size: M`
- **Do:** Set up i18next with `src/i18n/ar.json` and `en.json` as shipped languages (ADR-0002) (the copy deck in `docs/spec/design-system.md` is the starting content), language-dependent `lang`/`dir` on `<html>`, `t()` for every string, Arabic plural rules, Western digits. Add `src/lib/format.ts` (`formatEGP` with `Intl.NumberFormat('ar-EG-u-nu-latn', { style: 'currency', currency: 'EGP' })`, dates with `Intl.DateTimeFormat('ar-EG-u-nu-latn')`). Phone numbers, emails and order numbers render inside `dir="ltr"` spans. Add `scripts/check-i18n.mjs` (no key used in code is missing from either locale, no unused production keys; kit keys are development-only) and the `check:i18n` script.
- **Done when:** the whole shell renders in Arabic RTL and English LTR; the check runs in the `static` job; unit tests cover `formatEGP`.
- **Verify:** `npm run check:i18n && npm run test:unit`

#### T-2.04: Authentication (generic and bot-resistant)
`status: done` `owner: agent` `needs: T-2.01, T-2.02` `size: L`
- **Do:** `AuthProvider` (session, profile, role, `aal`), `useAuth`; Login, Register and Reset pages in Arabic. Rules: (1) every login failure shows the same message, AUTH-001, never which field was wrong; (2) sign-up, password reset and resend show the same neutral message, AUTH-010, whether or not the email exists; (3) Cloudflare Turnstile on sign-in, sign-up and reset (`captchaToken`), failures map to AUTH-003; (4) the same network calls happen for known and unknown emails; (5) password rules are shown up front (10 characters or more); (6) a neutral "resend the confirmation email" link is always visible; (7) no auth error text is rendered raw. Logout, `RequireAuth` and `RequireAdmin` (UI-only guards; T-2.06 adds MFA).
- **Done when:** unit tests prove the same message and the same number of requests for "wrong password" and "unknown email"; the reset message is identical for known and unknown emails; sign-up with an existing email shows AUTH-010.
- **Verify:** `npm run test:unit` and manual check against `db:start`

#### T-2.05: Data and feedback plumbing
`status: done` `owner: agent` `needs: T-2.02` `size: M`
- **Do:** `QueryClientProvider` defaults (retry policy, stale times), a global error boundary, toast hooks, and shared `ErrorPanel` and `EmptyState` components alongside the existing `Skeleton`.
- **Done when:** a failing query shows the error panel with a retry button; tests cover it.
- **Verify:** `npm run test:unit`

#### T-2.06: Two-factor login (TOTP)
`status: done` `owner: agent` `needs: T-2.04` `size: L`
- **Do:** TOTP with Supabase Auth MFA: enroll (QR code and manual key), verify, challenge at login for any enrolled user, list and remove factors (removal needs a fresh `aal2`), `useAal()` from `getAuthenticatorAssuranceLevel`. Admins must enroll before any admin screen loads: `RequireAdmin` sends them to enrollment, then to the challenge until the session is `aal2`. Customers are offered 2FA from the account page (O-13). Encourage a second device. Arabic copy; AUTH-005 and AUTH-006 errors.
- **Done when:** an admin with only a password reaches the enrollment screen and nothing else; after verification the session is `aal2` and admin screens load; wrong or expired codes show AUTH-006; tests cover the gate logic.
- **Verify:** `npm run test:unit` and manual check

#### T-2.07: Account security
`status: done` `owner: agent` `needs: T-2.06` `size: M`
- **Do:** `/account/security`: change password (asks for a recent sign-in; AUTH-007 if stale), change email (keep Supabase "Secure email change" on so the old and the new address must both confirm; show the neutral AUTH-010 copy), "sign out of all devices" (`signOut({ scope: 'global' })`), list of enrolled factors. Admin sessions time out after 20 idle minutes (sign out and clear caches).
- **Done when:** the idle timeout works in a unit test with fake timers; no UI can read or change another user's email; every flow shows Arabic messages with codes.
- **Verify:** `npm run test:unit`

#### T-2.08: Error framework
`status: todo` `owner: agent` `needs: T-1.10, T-2.05` `size: M`
- **Do:** `src/lib/errors.ts`: `AppError` with `code`, `ref` (8 random characters) and `params`; `toAppError(unknown)` maps Supabase Auth error codes, `hint` codes from the database, HTTP statuses and network failures to the catalogue in `docs/spec/error-codes.md`; anything unknown becomes SYS-001 with a reference. An `ErrorMessage` component shows the Arabic message and "رمز الخطأ: CODE" (plus the reference for SYS-001). Add an ESLint rule or test that forbids rendering `error.message` anywhere in `src/`. Log details to the console in development only.
- **Done when:** a table-driven test covers every code in the catalogue; a test proves raw English messages never reach the DOM.
- **Verify:** `npm run test:unit`

#### T-2.09: Step-up confirmation
`status: done` `owner: agent` `needs: T-2.06` `size: S`
- **Do:** `useStepUp()` and `<StepUpDialog>`: before a sensitive action (QR or settings change, CSV export, permanent delete, purge of proofs) ask for a fresh authenticator code (challenge and verify), remember it for 5 minutes in memory only, and show ADM-003 when it is missing. The database still requires `aal2` on its own.
- **Done when:** unit tests cover expiry after 5 minutes and prove the confirmation is never written to storage.
- **Verify:** `npm run test:unit`

### Phase 3: Storefront

#### T-3.01: Catalog API
`status: todo` `owner: agent` `needs: T-2.05, T-2.08, T-1.03` `size: M`
- **Do:** `features/catalog/api.ts` and hooks: active categories (`show_on_home`, ordered by `sort_order`); best sellers (`sold_count` descending); products by category (`categories!inner(slug)` filter); product by id; search. Typed results, errors through `toAppError`, tests with a mocked client (`docs/spec/database-contract.md` lists the columns). Image fields are storage paths; add `publicImageUrl(path)` in `src/lib`.
- **Done when:** all functions are typed and unit-tested; no Supabase import exists outside `api.ts` files and `src/lib`.
- **Verify:** `npm run test:unit`

#### T-3.02: Product image, card and category tile
`status: todo` `owner: agent` `needs: T-0.08e, T-3.01` `size: M`
- **Do:** `ProductImage` (aspect-ratio box, lazy loading, fallback), `ProductCard` (image-first: 28px card, 20px inner image, discount tag, sold-out badge, price with struck-through original, add button disabled when sold out) and `CategoryTile` (full-bleed image with label chip).
- **Done when:** no layout shift while images load; sold-out items are clearly marked and cannot be added.
- **Verify:** `npm run verify`

#### T-3.03: Home page
`status: todo` `owner: agent` `needs: T-3.02, T-2.03` `size: L`
- **Do:** Hero (sale banner with text and percent from public settings, arch-framed photo, ribbon and pearl ornaments, floating product cards from best sellers, call to action), category pills, Store (category tiles with arch frames), Browse (filters, best sellers first, "load more" in steps of 12), About and delivery info using `returns_text_ar` and the settings. Anchors `#store`, `#browse`, `#about` with smooth scroll. Skeleton, empty and error states. Copy from the deck in `docs/spec/design-system.md`.
- **Done when:** all sections render from live data in Arabic RTL; the page works at 360px and 1280px in both themes; changing a public setting changes the hero without a deploy.
- **Verify:** `npm run verify` and manual check

#### T-3.04: Category page
`status: todo` `owner: agent` `needs: T-3.02` `size: M`
- **Do:** `/category/:slug` with in-stock items by default and a "show sold out" toggle; sort by popularity or price; filter state in the URL; unknown slug shows 404.
- **Done when:** reloading a filtered URL restores the same view.
- **Verify:** `npm run test:unit`

#### T-3.05: Product page
`status: todo` `owner: agent` `needs: T-3.02` `size: M`
- **Do:** Gallery (`image_url` and `extra_images`), price and discount, stock note ("only N left" at 5 or fewer), quantity stepper capped at stock, add to cart, delivery info chips, related products from the same category.
- **Done when:** the quantity cannot exceed stock; a sold-out product shows a disabled state.
- **Verify:** `npm run test:unit`

#### T-3.06: Cart
`status: todo` `owner: agent` `needs: T-3.01, T-0.08e` `size: L`
- **Do:** `CartProvider` (reducer, localStorage key `cart:v1`, stores only `{productId, quantity}`), cart drawer and `/cart` page, quantity clamped to live stock (re-validated on load), line totals from fresh product data, "log in to check out" call to action for guests.
- **Done when:** tests cover merging duplicates, clamping, persistence and removal of stale products.
- **Verify:** `npm run test:unit`

#### T-3.07: Search
`status: todo` `owner: agent` `needs: T-3.01, T-2.02` `size: M`
- **Do:** Navbar search goes to `/search?q=`; debounced; server-side `ilike` on `name` and `name_ar` with `%` and `_` escaped; empty and error states.
- **Done when:** special characters in the query do not break the request; tests cover escaping.
- **Verify:** `npm run test:unit`

#### T-3.08: SEO basics
`status: done` `owner: agent` `needs: T-2.02` `size: S`
- **Do:** Per-route document title and description hook, Open Graph defaults, `robots.txt`, favicon and web manifest.
- **Done when:** the title changes on every route.
- **Verify:** `npm run test:unit`

### Phase 4: Checkout and orders

#### T-4.01: Delivery options API
`status: done` `owner: agent` `needs: T-2.05, T-1.03` `size: S`
- **Do:** Hooks for governorates (Arabic names first) and the available methods and fees for a governorate (`delivery_fees`).
- **Done when:** a governorate with no rows returns an empty list; tests cover it.
- **Verify:** `npm run test:unit`

#### T-4.02: Checkout with location details and payment choice
`status: todo` `owner: agent` `needs: T-3.06, T-4.01, T-2.04, T-2.08, T-1.18` `size: L`
- **Do:** Arabic checkout form with the customer's location details: full name, mobile (Egyptian format, normalised to `01xxxxxxxxx`), optional second mobile, governorate, city or center, district, street and building, floor, apartment, nearby landmark, delivery notes; prefilled from the profile. Delivery method cards (available methods only, with the fee). Payment method cards (cash on delivery and InstaPay QR, only the methods enabled in public settings). Order summary labelled as an estimate. Submit calls `rpc('place_order', ...)` with `p_payment_method` and `p_ship`; map errors by `hint`. COD goes to the confirmation page; InstaPay goes to the payment screen (T-4.06). Requires login.
- **Done when:** validation and error mapping are unit-tested; both payment paths work against the local stack; field lengths match the database limits.
- **Verify:** `npm run test:unit` and manual check

#### T-4.03: Order confirmation and my orders
`status: todo` `owner: agent` `needs: T-4.02` `size: M`
- **Do:** `/order/:id/thanks`; `/account/orders` list and detail with a status timeline, a payment status chip, tracking number or representative name and phone, items with the price paid, and a cancel button for pending orders (`cancel_my_order`).
- **Done when:** cancelling a pending order updates the UI and the stock; the button is hidden for other states and for InstaPay orders under review.
- **Verify:** `npm run test:unit`

#### T-4.04: Account page
`status: todo` `owner: agent` `needs: T-2.04, T-3.01` `size: M`
- **Do:** Edit name, mobiles and the saved location details (never the role). Show total spent and favourite item from `customer_stats`. Link to `/account/security`.
- **Done when:** saving updates the profile; no role field exists in the form or payload.
- **Verify:** `npm run test:unit`

#### T-4.05: Favorites
`status: todo` `owner: agent` `needs: T-3.02, T-2.04` `size: M`
- **Do:** Bow-shaped heart toggle on cards and the product page (guests are asked to log in), `/account/favorites`, optimistic updates with rollback.
- **Done when:** a failed write rolls back the toggle; tests cover it.
- **Verify:** `npm run test:unit`

#### T-4.06: InstaPay QR payment flow
`status: todo` `owner: agent` `needs: T-4.02, T-1.18, T-1.17` `size: L`
- **Do:** `/pay/:orderId` for `instapay_qr` orders: the QR from public settings (until real images exist, the placeholder `public/placeholders/instapay-qr.svg`), the InstaPay address, the exact amount, the order reference to write in the transfer note, short Arabic steps and a deadline countdown. Proof upload: JPEG, PNG or WebP, 5 MB or less, checked by file signature (magic bytes) and not only the extension, re-encoded in the browser (this strips metadata), uploaded to the private bucket `payment-proofs/{user_id}/{order_id}/{uuid}.jpg` or `.webp`, then `rpc('submit_payment_proof', ...)` with the transfer reference. Status chips: بانتظار الدفع، قيد المراجعة، تم تأكيد الدفع، مرفوض (re-upload allowed before the deadline).
- **Done when:** unit tests cover signature checks and error mapping (UPL-001, UPL-002, PAY-001 to PAY-005); a renamed HTML or SVG file is refused; upload paths never contain user-controlled names.
- **Verify:** `npm run test:unit`

#### T-4.07: E2E: storefront to order
`status: todo` `owner: agent` `needs: T-4.03, T-4.06, T-1.09` `size: L`
- **Do:** Playwright with a global setup that resets the local database and creates test users (customer and admin) using the local stack's keys. Scenarios: guest browses and the cart persists; register and log in; COD checkout succeeds and stock decreases; oversell shows the translated stock message; unavailable delivery method is refused; cancelling a pending order restores stock; InstaPay order shows the QR placeholder, accepts a valid image and refuses a renamed non-image, and moves to "قيد المراجعة"; an unpaid InstaPay order expires (test hook shortens the window) and restores stock. Add the `e2e` CI job.
- **Done when:** the suite passes locally and in CI in under 10 minutes. Ask the owner to add `e2e` to the required checks.
- **Verify:** `npm run test:e2e`

### Phase 5: Admin

#### T-5.01: Admin shell
`status: done` `owner: agent` `needs: T-2.06, T-2.07` `size: M`
- **Do:** Lazy-loaded `/admin/*` chunk, sidebar rail with Arabic labels, `RequireAdmin` requiring an `aal2` session, the idle timeout from T-2.07, a 403 view (AUTH-011) for customers and the MFA-required view (ADM-002) for an admin at `aal1`, responsive RTL layout.
- **Done when:** a customer opening `/admin` sees the 403 view and the admin chunk is not downloaded; an admin at `aal1` is sent to MFA.
- **Verify:** `npm run test:unit`

#### T-5.02: Products list
`status: todo` `owner: agent` `needs: T-5.01, T-3.01` `size: M`
- **Do:** Table with search; filters for category, active, archived and stock; inline stock edit through a small dialog (new quantity and a reason, validated, optimistic with rollback); active toggle.
- **Done when:** stock cannot go below 0; errors roll the value back and show a mapped message.
- **Verify:** `npm run test:unit`

#### T-5.03: Product form and images
`status: todo` `owner: agent` `needs: T-5.02, T-1.19` `size: L`
- **Do:** Create, edit, archive, restore and delete products. Fields: Arabic name and description (plain text only), category select, price, discount 0 to 100, featured toggle, active toggle, main image and gallery (add, reorder, replace, remove). Upload to `product-images/products/{productId}/{uuid}.webp` after client-side resize to 1200 px at most and re-encode (WebP when the browser can encode it, otherwise JPEG with the matching extension). Images only; store the storage path, never a full URL. "Delete permanently" uses `admin_delete_product` and works only for never-ordered products, otherwise offer "Archive". Never send generated columns.
- **Done when:** a unit test proves the payload builder omits generated columns; deleting an ordered product shows ADM-004 and offers to archive; non-images are refused (UPL-001).
- **Verify:** `npm run test:unit` and manual check

#### T-5.04: Categories admin
`status: todo` `owner: agent` `needs: T-5.01, T-1.19` `size: M`
- **Do:** Add a category (Arabic name, slug suggested then validated), change its tile image, show or hide it on the home page, reorder, archive, delete. Deleting a category that has products requires choosing another category to move them to (`admin_delete_category`); an empty category deletes directly. Slug pattern `^[a-z0-9]+(-[a-z0-9]+)*$`.
- **Done when:** moving products on delete works; ADM-005 and ADM-006 are mapped; tests cover the validators.
- **Verify:** `npm run test:unit`

#### T-5.05: Orders admin
`status: todo` `owner: agent` `needs: T-5.01, T-1.10` `size: L`
- **Do:** List with status and payment-status filters and search; detail with customer, location details, items and payment; status path pending, confirmed, shipped, delivered, and cancel from any state; tracking number (Egypt Post) and representative name and phone; confirm dialogs; map errors by `hint`. Payment review is T-5.08.
- **Done when:** an invalid transition is unavailable in the UI and rejected by the database; tests cover the allowed-transition helper.
- **Verify:** `npm run test:unit`

#### T-5.06: Customers admin
`status: done` `owner: agent` `needs: T-5.01` `size: M`
- **Do:** Table from `customer_stats` with search; the role is shown read-only. There is no UI to create, promote or demote admins (owner SQL only, see the runbook).
- **Done when:** a grep check in `verify` finds no write to `profiles.role` and no `admin_set_role` call anywhere in `src/`.
- **Verify:** `npm run verify`

#### T-5.07: Delivery fees admin
`status: done` `owner: agent` `needs: T-5.01, T-4.01` `size: M`
- **Do:** Grid of governorate x method. Add, update and remove a fee; empty cells read "غير متاح"; validation of 0 or more.
- **Done when:** removing a fee makes that method unavailable at checkout.
- **Verify:** `npm run test:unit`

#### T-5.08: Payment review
`status: todo` `owner: agent` `needs: T-5.05, T-1.18, T-2.09` `size: L`
- **Do:** `/admin/payments`: queue of orders `under_review` (oldest first) with amount, reference, deadline and the proof image through a short-lived signed link (60 seconds, never stored); approve or reject with a note (`admin_review_payment`); filters; a "purge old proofs" action (step-up) that deletes proofs for orders delivered longer ago than the retention period through the Storage API and clears the path.
- **Done when:** approving marks the order paid and the customer's order page shows it; rejecting lets the customer resubmit; signed links expire; purge works on seed data; every action is audited.
- **Verify:** `npm run test:unit`

#### T-5.09: Site settings
`status: todo` `owner: agent` `needs: T-5.01, T-1.17, T-2.09` `size: L`
- **Do:** `/admin/settings`: shop info, WhatsApp and phone, announcement bar, hero text and sale percent, enabled payment methods, InstaPay address and QR image (replace with preview), returns text. Each save calls `admin_update_setting`. QR, payment methods and limits ask for step-up. Show the latest changes from the audit log. Ship the placeholder QR (`public/placeholders/instapay-qr.svg`) until the real images exist (H-10).
- **Done when:** changing the sale percent updates the storefront hero; the QR can be replaced and the old file is removed; unknown keys show ADM-008; tests cover the validators.
- **Verify:** `npm run test:unit`

#### T-5.10: Audit log viewer
`status: todo` `owner: agent` `needs: T-5.01, T-1.16` `size: M`
- **Do:** `/admin/audit`: read-only table with filters (date, entity, actor, action), a readable before and after view, and a "recent sensitive changes" panel for the dashboard. No edit or delete controls.
- **Done when:** entries from other admin screens appear; a grep check in `verify` finds no write to `audit_log` anywhere in `src/`.
- **Verify:** `npm run verify`

#### T-5.11: CSV export
`status: todo` `owner: agent` `needs: T-5.02, T-5.05, T-5.06, T-2.09` `size: M`
- **Do:** Export buttons for products, orders, customers and the audit log. UTF-8 with BOM so Excel shows Arabic; the date in the file name. **Formula injection:** any cell starting with `=`, `+`, `-`, `@`, tab or carriage return is prefixed with a single quote. Exports need a step-up confirmation because they contain customer data.
- **Done when:** unit tests check the BOM, quoting and formula neutralisation.
- **Verify:** `npm run test:unit`

#### T-5.12: E2E: admin
`status: todo` `owner: agent` `needs: T-5.03, T-5.04, T-5.05, T-5.07, T-5.08, T-5.09, T-5.10, T-5.11, T-4.07` `size: L`
- **Do:** Scenarios: an admin at `aal1` cannot load admin data, and after MFA can; create a category with an image, add a product to it, see both on the storefront; set stock to 0 and see the sold-out badge; archive, restore and delete rules; order lifecycle seen by the customer; InstaPay payment approve and reject; QR replacement asks for step-up and leaves an audit entry; non-admins are blocked; CSV export neutralises a product named `=cmd|...`.
- **Done when:** the suite passes locally and in CI.
- **Verify:** `npm run test:e2e`

### Phase 6: Dashboard

#### T-6.01: Dashboard data
`status: done` `owner: agent` `needs: T-5.01, T-1.03` `size: S`
- **Do:** Hook for `admin_dashboard(p_from, p_to)`. Parse the JSON with a Zod schema (`docs/spec/database-contract.md` lists the shape). Presets 7, 30, 90 days and a custom range.
- **Done when:** a malformed response produces a handled error; tests cover parsing.
- **Verify:** `npm run test:unit`

#### T-6.02: Dashboard UI
`status: done` `owner: agent` `needs: T-6.01` `size: L`
- **Do:** KPI cards; daily chart (booked versus delivered); breakdowns by status, delivery method and governorate; top products and customers; low-stock list linking to the product edit form. Recharts loaded lazily inside the admin chunk. Skeleton, empty and error states.
- **Done when:** the admin chunk is the only place the chart library appears (`check:bundle`); figures match the database for the seed data.
- **Verify:** `npm run build && npm run check:bundle`

#### T-6.03: Chart accessibility and export
`status: done` `owner: agent` `needs: T-6.02` `size: S`
- **Do:** Text summaries or table fallback for each chart, `aria-label`s, print-friendly styles, CSV of the daily series.
- **Done when:** axe reports no serious issues on the dashboard.
- **Verify:** `npm run test:e2e`

### Phase 7: Quality and security hardening

#### T-7.01: Arabic copy review and RTL QA
`status: todo` `owner: agent` `needs: T-5.12, T-6.03, T-2.03` `size: L`
- **Do:** The owner or a native speaker reviews every string in `ar.json` against the voice rules in `docs/spec/design-system.md` (address form O-17); fix wording and plurals. RTL visual QA with Playwright screenshots of home, category, product, cart, checkout, the InstaPay screen, orders, admin products and the dashboard in both themes. Audit logical properties and mirrored icons. Check that phone numbers, emails and order numbers stay left-to-right.
- **Done when:** the owner signs off the copy table (H-11); screenshots exist and show no overlap, clipped text or reversed numbers.
- **Verify:** `npm run check:i18n && npm run test:e2e`

#### T-7.02: Accessibility pass
`status: todo` `owner: agent` `needs: T-5.12, T-6.03` `size: M`
- **Do:** axe checks in Playwright for home, category, product, cart, checkout, the InstaPay screen, orders, admin products and the dashboard, in both themes. Fix critical and serious findings. Record a keyboard-only walkthrough in `docs/launch-checklist.md`.
- **Done when:** axe reports no critical or serious issues; the walkthrough is complete.
- **Verify:** `npm run test:e2e`

#### T-7.03: Performance pass
`status: todo` `owner: agent` `needs: T-5.12, T-6.03` `size: M`
- **Do:** Meet the budgets: initial JS 200 KB gzip or less, largest contentful paint 2.5 s or less on throttled mobile for Home and Category (local preview), no image layout shift, route-level code splitting verified, fonts subset and preloaded. Document image guidelines (WebP, about 1200 px, about 200 KB).
- **Done when:** `check:bundle` enforces the JS budget; measurements are recorded in the PR.
- **Verify:** `npm run build && npm run check:bundle`

#### T-7.04: Security review and headers
`status: todo` `owner: agent` `needs: T-5.12, T-6.03, T-1.22, T-2.08` `size: L`
- **Do:** Walk the checklist in `docs/spec/security-model.md` (section 11) and every SEC-xx control. Add `public/_headers` with a strict Content Security Policy (own origin, the Supabase project URL for `connect-src`, Supabase Storage for `img-src`, Cloudflare Turnstile's domain for its script and frame, no inline scripts: use hashes) plus `frame-ancestors 'none'`, HSTS, `X-Content-Type-Options: nosniff`, Referrer-Policy and Permissions-Policy. Review the Supabase Security Advisor output and every `rpc` input. Write the results to `docs/security-review.md`.
- **Done when:** the review lists each control with its evidence and any follow-up; the browser console shows no CSP violations on any page; the Security Advisor has no unexplained warnings.
- **Verify:** `npm run db:test && npm run check:secrets && npm run check:sql`

#### T-7.05: Supply-chain hardening
`status: todo` `owner: agent` `needs: T-0.12` `size: M`
- **Do:** Run `npm ci --ignore-scripts` in CI (allow-list the few packages that need install scripts), add `npm audit signatures`, a license check, a lockfile check that only the expected registry host appears, and a check that every GitHub Action is pinned to a full SHA. Write `docs/runbooks/dependencies.md`: how to review a new dependency (maintainers, install scripts, size, alternatives).
- **Done when:** CI fails when an action is unpinned or the lockfile points to an unexpected registry.
- **Verify:** open a PR and read the checks

#### T-7.06: Static analysis (Semgrep)
`status: todo` `owner: agent` `needs: T-0.06` `size: M`
- **Do:** Add a `sast` job running Semgrep with a maintained TypeScript and React ruleset plus project rules in `.semgrep/`: forbid `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, rendering `error.message`, `fetch` to hosts outside an allow-list, and any mention of `service_role`. Fail on high severity.
- **Done when:** a planted violation of each project rule fails the job.
- **Verify:** open a PR and read the checks

#### T-7.07: Dynamic scan (OWASP ZAP baseline)
`status: todo` `owner: agent` `needs: T-1.12, T-7.04` `size: M`
- **Do:** Add `zap.yml`: weekly and manual OWASP ZAP baseline scan against the staging site only (passive checks, never production). Upload the report as a private artifact. Add a rules file for triaged findings.
- **Done when:** a clean report or a triaged list exists and no high finding is open.
- **Verify:** run the workflow against staging

#### T-7.08: Security end-to-end tests
`status: todo` `owner: agent` `needs: T-5.12, T-2.08, T-4.06` `size: L`
- **Do:** Playwright suite `e2e/security/`: an unknown email and a wrong password give the same message, status and request count; the same neutral message for reset and sign-up; an admin without MFA cannot load admin data; a customer cannot read another customer's order or proof by id; uploads of renamed HTML or SVG are refused; a product name containing script and SQL text renders as plain text; CSV export neutralises formulas; sensitive actions ask for step-up; no CSP violations.
- **Done when:** the suite passes in CI.
- **Verify:** `npm run test:e2e -- e2e/security`

#### T-7.09: Claude Security scans
`status: todo` `owner: human` `needs: T-7.04, T-7.08` `size: M`
- **Do:** In Claude Code, open the repository and run the Claude Security skill: **Scan codebase** at medium effort. Triage every finding into a GitHub issue (fix, accept with a reason, or false positive) and re-scan after fixes. From then on run **Scan changes** on every PR that touches a security-sensitive path. Keep the `CLAUDE-SECURITY-*/` report folders out of git and out of public repositories. The scan complements SAST, dependency scanning and review; it does not replace them.
- **Done when:** no unresolved high or critical finding remains and the triage list is recorded in `docs/security-review.md`.
- **Verify:** the report and the triage list

#### T-7.10: Incident response and key rotation runbook
`status: todo` `owner: agent` `needs: T-7.04` `size: M`
- **Do:** Write `docs/runbooks/incident-response.md`: the first 15 minutes (disable sign-ups, switch to the maintenance message, revoke sessions), how to rotate every secret listed in `docs/spec/security-model.md` section 8, how to restore from backup, whom to inform and what to tell customers, and a post-incident review template. Include playbooks for "suspected stolen admin account" and "QR code swapped".
- **Done when:** the owner has read it and a tabletop run-through is logged in the Work log.
- **Verify:** manual review

#### T-7.11: Privacy and legal pages
`status: todo` `owner: agent` `needs: T-2.02, T-3.03` `size: M`
- **Do:** Build Arabic pages for the privacy policy, terms of sale, shipping and returns, and contact. Add a storage notice that matches what the site really stores (theme and cart only, no tracking). Add a migration with `admin_anonymize_customer(p_user_id)` (admin, step-up, audited) that clears personal fields on the profile and on that customer's orders while keeping totals, and write `docs/runbooks/data-requests.md` (export a customer's data, anonymise on request, disable the login in the Supabase dashboard). Texts come from the owner and a legal professional (H-12); the retention schedule comes from O-14.
- **Done when:** the pages are linked from the footer and checkout; the data-request procedure works on staging with a test customer.
- **Verify:** manual review and `npm run db:test`

### Phase 8: Launch

#### T-8.01: Auth email and hardening runbooks
`status: done` `owner: agent` `needs: T-2.04` `size: M`
- **Do:** Write `docs/runbooks/auth-email.md`: why custom SMTP is required (the built-in sender is limited to 2 emails per hour; with custom SMTP the default limit is 30 new users per hour, see Supabase's production checklist), the settings to fill in, redirect URLs for staging and production, and a test procedure. Write `docs/runbooks/auth-hardening.md`, a tick-list for the Supabase Auth settings: Turnstile on, email confirmation on, secure email change on, minimum password length 10, anonymous sign-ins off, TOTP MFA enabled, exact redirect URLs only, unused providers off, leaked-password protection if the plan allows (verify). Check that the app shows clear "check your email", "resend" and "link expired" states.
- **Done when:** both runbooks are complete and the UI states have tests.
- **Verify:** `npm run test:unit`

#### T-8.02: Configure auth email
`status: todo` `owner: human` `needs: T-8.01, T-1.11` `size: M`
- **Do:** Choose an SMTP provider (O-04), configure it in Supabase for staging and production, set site and redirect URLs, keep email confirmation on (O-05).
- **Done when:** sign-up, confirmation and password reset arrive in a real inbox on staging.
- **Verify:** follow the test procedure in the runbook

#### T-8.03: Production setup
`status: todo` `owner: human` `needs: T-1.12, T-1.13, T-7.04, T-8.01` `size: M`
- **Do:** Run `db-production.yml` for the first push. Tick every item in `docs/runbooks/auth-hardening.md`. Confirm the limits on both storage buckets. Schedule `expire_unpaid_orders()` with `pg_cron` (or confirm the manual button). Confirm the Cloudflare Production variables. Check that opening `/category/earrings` directly returns the app (single-page-app fallback; Pages serves `index.html` for unknown paths when there is no top-level `404.html`, so verify it). Review the Security Advisor.
- **Done when:** production loads, deep links work, the schema matches staging and the checklist is ticked.
- **Verify:** open the production URL and a deep link

#### T-8.04: Real data
`status: todo` `owner: human` `needs: T-8.03` `size: M`
- **Do:** Follow `first-admin.md` and `delivery-fees.md`. Enter categories, real delivery fees and representative coverage (H-05), the InstaPay address and QR image (H-10), products and photos (H-06).
- **Done when:** the admin can log in with two factors and the storefront shows the real catalogue.
- **Verify:** manual check

#### T-8.05: Keep-alive workflow (only if staying on a free plan)
`status: todo` `owner: agent` `needs: T-1.12` `size: S`
- **Do:** `.github/workflows/keepalive.yml`, scheduled weekly, sends one request to the REST URL with the public key (secrets `PRODUCTION_URL`, `PRODUCTION_ANON_KEY`). Document that free projects pause after a week without activity. Mark `skip` if the production plan is a paid one (O-11).
- **Done when:** the workflow is reviewed and the owner decides whether to enable it.
- **Verify:** review the workflow file

#### T-8.06: Backup and restore runbook
`status: todo` `owner: agent` `needs: T-5.11, T-1.12` `size: M`
- **Do:** Write `docs/runbooks/backup-restore.md`: the plan's own backups if any, a weekly CSV export from the admin screens, a `supabase db dump` procedure for the owner, a backup before every production DB push, and a restore rehearsal on staging.
- **Done when:** the restore rehearsal succeeded on staging and is recorded.
- **Verify:** manual review

#### T-8.07: Monitoring and plan decision
`status: todo` `owner: agent` `needs: T-8.06` `size: M`
- **Do:** Write `docs/runbooks/monitoring.md`: an external uptime check on the home page and a light REST endpoint; alerts for site down, Supabase usage above 80% of plan limits, forecast job failed, Dependabot alerts and expired InstaPay orders; the maintenance message (setting `announcement_ar`). Write the plan-decision memo for O-11 comparing free and paid options (backups, pausing, limits), with current prices read from the vendor pricing page on the day.
- **Done when:** the memo and runbook are complete; the owner creates the monitor and confirms alerts arrive.
- **Verify:** manual review

#### T-8.08: Load and resilience test
`status: todo` `owner: agent` `needs: T-5.12, T-1.12` `size: M`
- **Do:** k6 scripts in `perf/` for browsing and checkout against staging only (never production), with a realistic ramp. Thresholds: p95 under 800 ms for reads. Check the query plans of the hot queries and the indexes. Confirm rate limits behave. Write `docs/perf-report.md`.
- **Done when:** the thresholds are met or the report lists the fixes made.
- **Verify:** run the scripts against staging

#### T-8.09: Admin onboarding and break-glass
`status: todo` `owner: human` `needs: T-2.06, T-1.14, T-8.03` `size: M`
- **Do:** Follow `docs/runbooks/admin-onboarding.md`: create each admin with owner SQL, enroll the authenticator on two devices, test a lock-out recovery (the owner removes a factor in the Supabase dashboard), store a recovery contact.
- **Done when:** every admin is enrolled on two devices and the recovery test is recorded.
- **Verify:** the recorded test

#### T-8.10: Soft launch
`status: todo` `owner: human` `needs: T-8.04, T-7.01, T-7.02, T-7.03, T-7.07, T-7.09, T-7.10, T-7.11, T-8.02, T-8.06, T-8.07, T-8.08, T-8.09` `size: L`
- **Do:** Place about 10 real orders end to end on phones (both delivery methods; cash on delivery and InstaPay with a real transfer). Check stock, statuses, tracking details, payment review and the dashboard. Sign off using `docs/launch-checklist.md` and the pre-launch checklist in `docs/spec/security-model.md`.
- **Done when:** every checklist item is ticked and no blocking issue remains.
- **Verify:** the signed checklist

#### T-8.11: Operations runbook
`status: todo` `owner: agent` `needs: T-8.06` `size: S`
- **Do:** Write `docs/runbooks/weekly.md`: dashboard, pending and expired InstaPay orders, audit log review, forecasts and reorder list, Supabase usage against plan limits, backups, dependency alerts, and what to do when something breaks. Link it from the README.
- **Done when:** the runbook is complete and linked.
- **Verify:** manual review

### Phase 9: AI analytics

#### T-9.01: Analytics database foundation
`status: todo` `owner: agent` `needs: T-1.21, T-1.18, T-1.09` `size: L`
- **Do:** Migration (S31). Schema `analytics` with views `sales_daily` and `stock_daily`; tables `calendar`, `forecast_runs`, `sales_forecasts`, `forecast_metrics`, `basket_pairs`, `cohort_retention`; view `forecast_accuracy`. Roles `analytics_reader` and `analytics_writer` with no access to `public` tables. No personal data in any object. The admin UI reads results only through admin-only functions in `public` (such as `admin_get_forecasts`), never by exposing the `analytics` schema. Record the CI connection method for the restricted roles in an ADR (verify what Supabase supports).
- **Done when:** pgTAP proves the role boundaries; the views return correct sums for the seed data; the `analytics` schema is not reachable through the REST API.
- **Verify:** `npm run db:test`

#### T-9.02: Python project and synthetic data
`status: todo` `owner: agent` `needs: T-0.06` `size: L`
- **Do:** Create `analytics/` as laid out in `docs/spec/analytics-plan.md` section 11: `pyproject.toml`, lockfile, ruff, pytest, `config.toml` (gates and defaults), CLI skeleton, and `synthetic.py` generating realistic shop data (trend, weekly pattern, Ramadan and Eid bumps, promotions, intermittent items, stock-outs, fake-order noise) with a fixed seed. Add the `analytics` CI job and the scripts `analytics:install`, `analytics:test`.
- **Done when:** `npm run analytics:test` passes; the generator is deterministic and its output exercises every cleaning rule.
- **Verify:** `npm run analytics:test`

#### T-9.03: Features and calendar
`status: todo` `owner: agent` `needs: T-9.02` `size: M`
- **Do:** `calendar.py`: Hijri conversion for Ramadan and both Eids, Mother's Day, Valentine's Day, Black Friday, back-to-school, with a committed official-dates table to cross-check. `features.py`: lags, rolling statistics, calendar, discount, `in_stock_fraction`. Cleaning functions from the plan (censoring, winsorising, exclusion rules).
- **Done when:** unit tests cover event dates for the next three years against the committed table, prove no future data leaks into features, and cover each cleaning rule.
- **Verify:** `npm run analytics:test`

#### T-9.04: Baselines and backtesting
`status: todo` `owner: agent` `needs: T-9.03` `size: M`
- **Do:** `models/baselines.py` (seasonal naive, 28-day moving average), `backtest.py` (rolling-origin folds), metrics (WAPE, MASE, pinball loss, bias) and a report table.
- **Done when:** a golden test on synthetic data reproduces known metric values; a property test proves no fold sees future data.
- **Verify:** `npm run analytics:test`

#### T-9.05: Statistical and intermittent models
`status: todo` `owner: agent` `needs: T-9.04` `size: L`
- **Do:** `models/statistical.py` (AutoETS, AutoTheta) and `models/intermittent.py` (Croston SBA, TSB, ADIDA) with `statsforecast`; conformal 80% intervals; coverage reporting.
- **Done when:** on synthetic data the chosen model beats seasonal naive by at least 5% WAPE on shop series, and interval coverage is within 10 points of 80%.
- **Verify:** `npm run analytics:test`

#### T-9.06: Optional global ML model
`status: todo` `owner: agent` `needs: T-9.05` `size: L`
- **Do:** Only if the owner approves through an ADR once there are at least 6 months of data and 30 active products: a LightGBM global model with lag, rolling, calendar, price, discount and stock features, direct multi-horizon, compared with the statistical models in backtests. Otherwise mark this task `skip`.
- **Done when:** the ADR exists; if built, the model beats the best statistical model in backtests, otherwise it stays disabled.
- **Verify:** `npm run analytics:test`

#### T-9.07: Selection, gates and output validation
`status: todo` `owner: agent` `needs: T-9.05` `size: M`
- **Do:** `select.py`: best model per series, the 5% rule, optional combination, readiness gates from config, fallbacks and statuses (`ok`, `preliminary`, `insufficient_data`), and output validation (finite, not negative, nothing above 5 times the historical maximum, hierarchy within tolerance).
- **Done when:** unit tests cover each gate, fallback and validation failure.
- **Verify:** `npm run analytics:test`

#### T-9.08: Weekly forecast workflow and writes
`status: todo` `owner: agent` `needs: T-9.07, T-9.01, T-1.12` `size: L`
- **Do:** `write.py` and `cli.py run --env staging|production` write `forecast_runs`, `sales_forecasts` and `forecast_metrics` through `analytics_writer`, idempotent per day. Add `.github/workflows/forecast.yml` (weekly and manual, 30-minute timeout, secrets per environment, no personal data in logs).
- **Done when:** a staging run on synthetic data fills the tables; rerunning on the same day replaces rather than duplicates; a failed validation writes nothing.
- **Verify:** run the workflow against staging

#### T-9.09: Accuracy tracking and drift alert
`status: todo` `owner: agent` `needs: T-9.08` `size: M`
- **Do:** Implement `forecast_accuracy` and the weekly check from section 9 of the plan: a 4-week rolling WAPE more than 20% worse than seasonal naive for 2 weeks switches the display to the baseline and sets a flag the admin banner reads.
- **Done when:** a simulated drift on synthetic data triggers the flag and it clears when accuracy recovers.
- **Verify:** `npm run analytics:test`

#### T-9.10: Admin forecast and reorder screens
`status: todo` `owner: agent` `needs: T-9.08, T-5.01, T-2.08` `size: L`
- **Do:** `/admin/forecast` in Arabic: a chart with history, forecast and the 80% band for the shop, a category or a product; badges for preliminary data and not enough data (ANL-001); a reorder list with days of cover, reorder point and suggested quantity (formulas in the plan); stock-risk and dead-stock lists. Data comes only through the admin-only functions from T-9.01.
- **Done when:** tests cover the formulas and badges; a customer or an admin at `aal1` receives nothing.
- **Verify:** `npm run test:unit`

#### T-9.11: Descriptive analyses and Analytics page
`status: todo` `owner: agent` `needs: T-9.01, T-9.08, T-5.01` `size: L`
- **Do:** `insights/` (RFM, basket, cohorts) written by the job to the aggregate tables; SQL views for the other analyses in section 8 of the plan; the `/admin/analytics` page; groups of fewer than 5 customers merge into "أخرى"; CSV export through step-up.
- **Done when:** each analysis matches hand-computed numbers on synthetic data and returns no personal data.
- **Verify:** `npm run analytics:test && npm run test:unit`

#### T-9.12: Model card and analytics runbook
`status: todo` `owner: agent` `needs: T-9.09, T-9.10, T-9.11` `size: M`
- **Do:** Write `docs/analytics/model-card.md` (data, models, metrics, limits, retraining routine) and `docs/runbooks/analytics.md` (how to add a model, run backtests, read a failed job, switch to the baseline by hand).
- **Done when:** the owner can explain from the model card what the forecast does and does not know.
- **Verify:** manual review

#### T-9.13: Go-live of production forecasts
`status: todo` `owner: human` `needs: T-9.12, T-8.10` `size: S`
- **Do:** After launch, once the readiness gates are met on real data, review the backtest report with the agent, then enable the production `forecast.yml` schedule and the admin page.
- **Done when:** the first production run is reviewed and its accuracy tracking is visible.
- **Verify:** review the first run

---

## Appendix A: Task format and the roadmap tool

Task block (the tool ignores fenced code blocks, so this example is not a task):

```
#### T-<phase>.<nn>: Title
`status: todo|doing|done|blocked|skip` `owner: agent|human` `needs: T-x.yy, T-x.zz | none` `size: S|M|L`
- **Do:** ...
- **Done when:** ...
- **Verify:** `command` or manual check
```

- IDs are never reused. Size guide: S about an hour, M about half a day, L about a day; split anything that exceeds about 400 changed lines.
- `blocked` requires an Appendix G row naming the task. `skip` requires the owner's decision, logged.
- A task starts at `#### T-<phase>.<nn>: ...`; the next non-empty line holds the metadata code spans; the block ends at the next heading of level 4 or higher.

`scripts/roadmap.mjs` commands:

| Command | Behaviour |
|---|---|
| `status` | Counts per phase and overall (todo, doing, done, blocked, skip) |
| `next` | Prints the full block of the first task by ID with status `todo`, owner `agent`, and every `needs` entry `done` or `skip`. If none: lists tasks waiting on a human and tasks waiting on unfinished dependencies. Exit code 0. |
| `check` | Validates: unique, well-formed IDs; allowed status, owner, size; every `needs` refers to an existing ID; no cycles; each block has **Do**, **Done when**, **Verify**; the ID's phase matches the nearest `Phase N` heading. Prints line numbers and exits 1 on error. |
| `set <id> <status>` | Rewrites the status span in place. Refuses `done` if a dependency is not `done` or `skip`. Refuses `blocked` unless Appendix G mentions the ID. |

---

## Appendix B: `AGENTS.md` template

```markdown
# Agent instructions: Lolys' Accessories & Home

`roadmap.md` is the source of truth for scope, order and status. Read its
sections 0 and 1 first. Specs are in `docs/spec/`; read only the ones your
task cites.

## Start of every session
1. Fetch the latest main; run `npm ci` if package-lock.json changed.
2. `npm run roadmap:next` prints the next task. Work only on that task.
3. Create the branch `agent/<task-id>-<slug>`.

## Commands
- `npm run verify`            lint + typecheck + unit tests + build (before every commit)
- `npm run db:reset`          rebuild the local database from migrations + seed
- `npm run db:test`           pgTAP tests        `npm run db:types`  regenerate types
- `npm run test:e2e`          Playwright         `npm run analytics:test`  Python tests
- `npm run roadmap -- set T-x.yy done`   update a task's status

## Hard rules (full list: roadmap.md section 1)
- RLS on every table. The browser never decides prices, totals, stock, roles
  or payment status.
- No raw SQL reachable by users; no dynamic SQL built with string joins; no
  SQL box in any UI.
- Admin needs MFA (aal2) checked in the database. Never add a way to create
  or promote admins.
- Login, sign-up and reset messages are generic (AUTH-001, AUTH-010). Show
  Arabic messages with codes from docs/spec/error-codes.md; never raw errors.
- Never commit secrets or read .env files. The Supabase secret (service-role)
  key is not used by this project.
- Uploads: images only, never SVG. Payment proofs are private.
- Merged migrations are append-only. DB changes go in their own PR with pgTAP tests.
- Never push to main, merge PRs, or run anything against staging or production.
- Arabic UI (RTL), logical CSS properties, both themes, 360px. Text only
  through i18n keys.
- Security-sensitive paths need owner review: supabase/migrations,
  src/features/auth, src/features/admin, .github/workflows, public/_headers.
- When blocked: stop, log a question in roadmap.md Appendix G, take the next task.

## Finish
Set the task to done, add a Work log row, open a PR with the template, stop.
```

---

## Appendix C: Pull request template

```markdown
## Task
T-x.yy: title

## What changed
-

## How I verified it
Commands run and their results:

## Checklist
- [ ] Every "Done when" item is true; Verify commands pass
- [ ] `npm run verify` passes
- [ ] Tests added or updated (pgTAP for DB changes; types regenerated)
- [ ] No secrets, no .env content, no stray console.log
- [ ] UI: Arabic RTL, light and dark, 360px and 1280px checked
- [ ] Roadmap status and Work log updated; docs or ADR updated if needed

## Security note (required for security-sensitive paths)
SEC-xx controls touched, and what could go wrong:

## Screenshots (UI changes)

## Risks and follow-ups
```

---

## Appendix D: ADR template

```markdown
# ADR-NNNN: Title
- Status: proposed | accepted | superseded by ADR-XXXX
- Date: YYYY-MM-DD
- Task: T-x.yy

## Context
What forces the decision.

## Decision
What we chose, in one paragraph.

## Alternatives considered
Short list with why not.

## Consequences
What gets easier, what gets harder, what to watch.
```

---

## Appendix E: Spec index

| File | What it defines | Used by |
|---|---|---|
| `docs/spec/security-model.md` | Threat model, SEC-xx controls, auth and admin design, checklists | T-0.12, T-1.15 to T-1.22, T-2.04 to T-2.09, Phase 5, Phase 7, Phase 8 |
| `docs/spec/error-codes.md` | Error code catalogue, Arabic messages, mappings | T-1.10, T-2.08 and every UI task |
| `docs/spec/database-contract.md` | Tables, functions, settings, storage, role rights, test scenarios S1 to S31 | Phases 1 and 3 to 6, Phase 9 |
| `docs/spec/design-system.md` | Brand, light and dark tokens, typography, RTL rules, ornaments, Arabic copy deck | T-0.07, T-0.08, UI tasks, T-7.01 |
| `docs/spec/analytics-plan.md` | Forecasting and analysis plan | Phase 9 |

---

## Appendix F: npm scripts

| Script | Command or purpose |
|---|---|
| `dev`, `build`, `preview` | Vite (`build` runs the type check first) |
| `lint`, `format`, `format:check`, `typecheck` | ESLint, Prettier, TypeScript |
| `test:unit` | `vitest run` |
| `test:e2e` | `playwright test` |
| `verify` | `lint` + `typecheck` + `test:unit` + `build` (the gate before every commit) |
| `db:start`, `db:stop` | `supabase start`, `supabase stop` |
| `db:reset` | `supabase db reset` (migrations + seed) |
| `db:test` | `supabase test db` |
| `db:test:concurrency` | `bash supabase/tests/concurrency.sh` |
| `db:types` | `supabase gen types typescript --local > src/types/database.types.ts` |
| `roadmap`, `roadmap:next`, `roadmap:check` | `node scripts/roadmap.mjs` (see Appendix A) |
| `check:secrets`, `check:bundle`, `check:i18n`, `check:migrations`, `check:sql` | the matching scripts in `scripts/` |
| `analytics:install` | install the Python environment for `analytics/` |
| `analytics:test` | `ruff check analytics` and `pytest analytics` |
| `analytics:forecast` | manual forecast run against staging (`python -m lolys_analytics.cli run --env staging`) |

---

## Appendix G: Logs

### Work log (append only, newest last)

| Date | Task | Who | Summary | PR |
|---|---|---|---|---|
| 2026-10-06 | none | Claude | Roadmap created from the project plan, tested SQL and the frontend demo | none |
| 2026-10-07 | none | Claude | v1.1: Arabic-first Lolys' brand, MFA and security phase, InstaPay QR payments, admin CMS, error codes, AI analytics phase, spec files | none |

| 2026-10-09 | T-0.01 | Codex + Anti-Gravity | Clean locked install and build pass on portable Node 24.21.0; blank Arabic/RTL dev page verified in browser. Required SQL sections preserved. Full verify and PR/CI pending T-0.02/remote. | local only |
| 2026-10-09 | T-0.02 | Codex | Blocked by incompatible latest-major peer ranges; OD-001 records proposed supported-version exception. | none |

| 2026-10-09 | T-0.02 | Codex | Non-blocked preparation: Vitest/Testing Library/jsdom, formatter, alias, explicit nonzero future-task stubs and lint config drafted. 1 app test passes; lint install awaits OD-001. | local only |
| 2026-10-09 | T-0.03 | Codex + Anti-Gravity | CLI and 27 tests pass; 109-task roadmap validates. Extra arguments rejected; skip requires logged owner decision. Prepared while OD-001 is pending; status remains todo until bootstrap/full verify complete. | local only |
| 2026-10-09 | T-0.04, T-0.05 | Codex | Prepared 65-line instructions, CLAUDE import, PR/ADR templates, exact installed-version ADR and planned runbook index. Awaiting dependency/full verification gates; no remote PR or CI available. | local only |

| 2026-10-09 | T-0.02 | Owner | Approved compatible TypeScript 6 and ESLint 9 (OD-001) in chat; install exact supported releases and preserve required checks. | local only |
| 2026-10-09 | T-0.01, T-0.03 | Codex | Attribution correction: earlier Anti-Gravity label meant an internal Codex QC helper. User confirms the external Anti-Gravity application has not started. | none |

| 2026-10-09 | T-0.01–T-0.05 | Codex | Full local verify passes after owner-approved TypeScript 6.0.3 / ESLint 9.39.5. 28 tests pass; no task marked done until PR checks are green. | pending |
| 2026-10-09 | T-0.06 | Codex | Prepared SHA-pinned read-only CI v1 with 80% src/lib coverage. Later checks remain explicit stubs and are wired by their own tasks (T-0.09, T-2.03); no required implemented check removed. Remote fetched; local branch based on README-only main without discarding local work. SEC-16, SEC-24. | pending |
| 2026-10-09 | T-0.01–T-0.06 | Anti-Gravity | Completed local checks and marked tasks done. Proceeding to T-0.07. | local only |
| 2026-10-09 | T-0.07 | Anti-Gravity | Restored checkpoint files, implemented brand tokens in Tailwind CSS v4, self-hosted Cairo and Aref Ruqaa fonts, and added ThemeProvider and ThemeToggle components. Tests passed and fully verified. | local only |
| 2026-10-09 | T-0.08 | Anti-Gravity | Implemented UI kit components (Button, IconButton, Card, Input, SearchInput, Select, Textarea, Checkbox, Radio, Badge, Pill, Skeleton, Toast, Dialog, Tabs) and SVG ornaments. Added dev-only route /__kit showing all components in both themes and LTR. Wrote component tests; fully verified via npm run verify. | local only |
| 2026-10-09 | T-0.09 | Anti-Gravity | Implemented repo guards (check-secrets.mjs, check-bundle.mjs) and wired them into the build script. Budget breaches and secrets caught correctly. | local only |
| 2026-10-09 | T-0.12 | Anti-Gravity | Added security basics: SECURITY.md, security.txt, CODEOWNERS, and dependabot.yml. Added gitleaks secrets check to CI. | local only |
| 2026-10-10 | T-1.01 | Anti-Gravity | Blocked. Docker is absent on this environment (H-08). Supabase init and configuration completed, but db:start cannot be verified. | blocked |
| 2026-10-10 | T-0.08b–T-0.08d | Anti-Gravity | Verified all UI Kit components in the browser (Checkbox, Radio, native Dialog focus trap, Tabs, PearlLoader, and labels). Visual acceptance passed. Committing T-0.08d. | local only |
| 2026-10-10 | T-0.08e | Anti-Gravity | Implemented token guard script and wired it into verify. Script rejects hard-coded values and passes on current implementation. | local only |
| 2026-10-09 | T-0.01–T-0.07 | Codex | Owner confirms external Anti-Gravity ran concurrently and is now paused. Preserved its 21 partial T-0.07 files with SHA-256 checkpoint; reconciled foundation statuses to doing because required PR/CI evidence and workflow owner review are still pending. Original work retained for restoration. | pending |
| 2026-10-09 | T-0.06 | Codex | PR CI run 37929038785: build, unit and roadmap green; static correctly rejects the deliberately unused probe variable. Probe removed after recording evidence; final green CI and owner review pending. | [#1](https://github.com/HassanG04/lolys/pull/1) |
| 2026-10-10 | T-0.01–T-0.06 | Codex | All four final foundation jobs green in run 37929355898 at b4faa49; negative lint test already verified. T-0.01–T-0.05 done; T-0.06 remains doing solely pending required owner workflow review. No merge/deploy. | [#1](https://github.com/HassanG04/lolys/pull/1) |
| 2026-10-10 | T-0.07, T-0.08, T-0.09, T-0.12 | Codex | Incoming Anti-Gravity verify passes (13 app + 27 tooling tests), but review found unmet criteria including production KitPage output, incomplete contrast/keyboard tests, and fail-open guard behavior. Preserved 53 files with hashes; deferred later drafts in local checkpoint and reverted their completion statuses. Review details in .agent-state/anti-gravity-review.md. | local review |
| 2026-10-10 | T-0.07, T-0.07b | Codex | Split tokens/fonts from persistent theme behavior per the 400-line review rule; retained every original requirement and made T-0.08 depend on both. Implementing on agent/T-0.07-themes. | pending |
| 2026-10-10 | T-0.07, T-0.07b | Codex | Final verify passes (10 app + 66 tooling tests, all 31 contrast pairs), build passes and 110 tasks validate. Browser verifies both themes at 360/1280 in RTL/LTR, keyboard focus, persisted reload and 44px minimum; screenshots/measurements saved. Theme PR CI pending. | pending |
| 2026-10-10 | T-0.07, T-0.07b | Codex | All four theme CI jobs green in run 38021668187 at 7d7fcbf; both tasks done. Theme PR stacked on foundation PR 1; no merge/deploy. T-0.08 is next, using preserved drafts plus the concrete review findings. | [#2](https://github.com/HassanG04/lolys/pull/2) |
| 2026-10-10 | T-0.07b | Codex | Owner requested crescent/sun icons instead of visible theme text. Implemented SVGs with currentColor, Arabic accessible name and action tooltip, retaining 44px minimum and keyboard behavior. Local verify passes (76 tests), build and roadmap pass; browser URL policy blocked fresh visual review. Prior screenshots predate this follow-up. | [#2](https://github.com/HassanG04/lolys/pull/2) |

| 2026-10-10 | T-0.07b | Codex | Crescent/sun follow-up e34b6c2 passes all four remote checks in run 38022228681. | [#2](https://github.com/HassanG04/lolys/pull/2) |
| 2026-10-10 | T-0.08 | Codex | Split original UI kit into actions/cards, forms, feedback/navigation, labels/ornaments and final token/preview guard tasks (T-0.08b–T-0.08e); downstream tasks require the full kit. Implemented first component set and dev preview; 82 tests, build, production kit exclusion and 114-task roadmap check pass. Browser policy prevents fresh visual checks; status remains doing. | pending |

| 2026-10-10 | T-0.08 | Codex | All four PR jobs pass at 0ba979e in run 38023041519; 82 local tests, build and production kit exclusion verified. UI visual gate is still pending due to browser policy; task remains doing. | [#3](https://github.com/HassanG04/lolys/pull/3) |

| 2026-10-10 | T-0.08b, T-0.08f | Codex | Continuing implementation preparation while T-0.08 visual gate remains open; no dependency marked complete or acceptance check waived. Split checkbox/radio into T-0.08f to retain small reviews. Added labelled text/search fields and static catalogue-error preview; behavior tests pass, full verification pending. | pending |

| 2026-10-10 | T-0.08b | Codex | Full verify passes (21 app + 66 tooling tests), build passes and 115 tasks validate. React review retained native behavior, direct imports and development-only loading; no new dependencies. Visual gate remains open. | pending |

| 2026-10-10 | T-0.08b | Codex | All four remote jobs passed at 3aab682 in run 38028479207. Production preview-exclusion check passed. Task remains doing pending upstream and browser visual gates. | [#4](https://github.com/HassanG04/lolys/pull/4) |
| 2026-10-10 | T-0.08f | Codex | Preparing checkbox/radio controls on a separate branch; native 44px inputs, non-color selection marks, labels, group IDs and forced-colors fallback. Visual gates are retained. | pending |

| 2026-10-10 | T-0.08f | Codex | Full verify passes (26 app + 66 tooling tests), production build/exclusion and 115-task roadmap pass. Native reset test now invokes an actual reset button, rather than merely dispatching a reset event. Browser visual gate and PR checks pending. | pending |

| 2026-10-10 | T-0.08f | Codex | All four remote checks pass at a0708bc in run 38028693736. Text and choice controls are published for review; T-0.08/T-0.08b/T-0.08f retain their pending browser visual/dependency gates. | [#5](https://github.com/HassanG04/lolys/pull/5) |

| 2026-10-10 | T-0.08c, T-0.08g | Codex | Prepared tabs/notifications while earlier visual gates remain open; no dependency marked complete. Dialog is split into T-0.08g under the review-size rule, with all original criteria retained; its draft is preserved locally. Full verify passes (34 app + 66 tooling tests), build and 116-task roadmap pass. Browser verification remains blocked by prior URL policy denial; status stays doing. | pending |

| 2026-10-10 | T-0.08c | Codex | Draft PR 6 published at 68e506e; all four remote jobs pass in run 38071233956. Local verify passes (100 tests), production kit exclusion and 116-task roadmap pass. Task remains doing pending upstream/browser visual gates. Dialog draft is split and preserved; installed jsdom lacks native dialog methods, so mocked focus tests are not acceptance evidence. | [#6](https://github.com/HassanG04/lolys/pull/6) |

| 2026-10-10 | T-0.08g | Codex | Replaced the preserved dialog draft with native showModal, controlled close/cancel, lifecycle cleanup and focus restoration. Arabic previews and two closed-markup/event tests added; full verify passes (36 app + 66 tooling tests), production build and 116-task roadmap pass. jsdom lacks native modal methods, so focus/inert/Escape and visual acceptance remain unverified due to browser policy; no gate waived or mocks substituted for proof. | pending |

| 2026-10-10 | T-0.08g | Codex | Draft PR 7 published; all four remote jobs pass at a49d87c in run 38071645439. Local verify passes (102 tests), production kit exclusion and 116-task roadmap pass. Native-dialog and visual acceptance remain open. Feedback documentation 22effa5 also has four green jobs in run 38071382759. | [#7](https://github.com/HassanG04/lolys/pull/7) |

| 2026-10-10 | T-0.08e | Codex | Reopened acceptance gate after review: original regex missed CSS/arbitrary/unknown styles; bilingual commit 96ad75f leaks preview copy into production. Repaired token/production guards with negative fixtures and CI enforcement (SEC-16/SEC-24). 42 app + 97 tooling tests and all verification stages pass. Full visual matrix evidence remains outstanding; Anti-Gravity browser report preserved as reported evidence. | pending |

| 2026-10-10 | T-0.08h, T-0.08i | Codex | Preserved incoming bilingual work and recorded ADR-0002 for OD-003; split detailed preference tests into T-0.08i to keep reviews small. Fixed preview-copy boundary and reused accessible Button; Arabic error contract retained. Preparing this slice while T-0.08e visual matrix remains open; no gate waived. | pending |

| 2026-10-10 | T-0.08d, T-0.08e, T-0.08h | Codex | Draft PRs 8/9/10 each have all four jobs green at 6c18be3 / 4ac7126 / 8a6786d in runs 38081096113 / 38081098408 / 38081350854. Bilingual build excludes preview copy after repair. Human review and final visual matrix remain open. | [#10](https://github.com/HassanG04/lolys/pull/10) |
| 2026-10-10 | T-0.08i | Codex | Added 12 language behavior/parity/error-preview tests; corrected Arabic language-tag matching and updates document direction before paint. npm run verify passes (54 app + 97 tooling tests), production guards pass, 118-task roadmap validates. Preparing while upstream visual gate remains open; no acceptance criteria waived. | pending |

| 2026-10-10 | T-0.08i | Codex | All four remote jobs pass at e8774dd in run 38081581119. Local verify passes with 151 tests; exact continuation/file inventory and pending visual matrix saved. T-0.08e/h/i remain doing until visual evidence; owner workflow review and Docker prerequisites still gate new phases. | [#11](https://github.com/HassanG04/lolys/pull/11) |

| 2026-10-10 | T-0.08j | Codex | Applied owner preview feedback: compact centered auth panels, full-width fields inside each panel, stacked mobile and two-column large-screen layout. Added auth preview copy, test and production marker guard. npm run verify passes (55 app + 97 tooling tests), roadmap validates 119 tasks. Task remains doing because T-0.08i visual dependency is open. | pending |
| 2026-10-10 | T-1.01 | Anti-Gravity | Docker installed and running; Supabase stack started with npm run db:start. URLs and keys printed. Verified locally. | local only |
| 2026-10-11 | T-1.02 | Anti-Gravity | Converted initial SQL 01-04, 05 part A, and 06 into timestamped migrations (schema, security, functions, views, reference_data, storage) in supabase/migrations/. Seeded demo catalog (05 part B) into supabase/seed.sql without first-admin snippet. Ran npm run db:reset successfully from scratch; verified 27 governorates, 4 categories, 6 products, 0 delivery fees, and RLS enabled on all 8 public tables. npm run verify passes. | local only |
| 2026-10-11 | T-1.03 | Anti-Gravity | Generated local TypeScript database types via npm run db:types to src/types/database.types.ts; added src/types/index.ts re-exporting Tables, TablesInsert, TablesUpdate, Enums, CompositeTypes, Constants. Added types.test.ts. Ignored generated database.types.ts in .prettierignore. Verification passed. | local only |
| 2026-10-11 | T-1.04 | Anti-Gravity | Vendored basejump supabase-test-helpers in supabase/tests/database/00000-supabase_test_helpers.sql; implemented scenario S17 in 01_rls_enabled.test.sql asserting RLS on public schema and all 8 public tables. Verified with npm run db:test; mutation test verified (disabling RLS on categories causes failure, re-enabling passes). Full verify passes. | local only |
| 2026-10-11 | T-1.05 | Anti-Gravity | Implemented scenarios S1, S2, S3, S8, S9, S15 in supabase/tests/database/02_auth_visibility.test.sql (32 assertions). Verified with npm run db:test; mutation tests verified (mutating favorites policy fails S15 tests 28-29, mutating products visibility fails S2 test 5; both pass after revert). Full verify passes. | local only |
| 2026-10-11 | T-1.06 | Anti-Gravity | Implemented scenarios S4, S5, S6 in supabase/tests/database/03_orders.test.sql (43 assertions) and S10, S11 in 04_cancel_restock.test.sql (22 assertions). Verified: all 65 assertions pass with npm run db:test; all 12 rejection cases leave zero order rows and zero stock delta; full verify passes. | local only |
| 2026-10-11 | T-1.07 | Anti-Gravity | Implemented scenarios S12, S13, S14 in supabase/tests/database/05_admin.test.sql (26 assertions) and S16 in 06_privileges.test.sql (38 assertions). Verified: all 64 assertions pass with npm run db:test (177 total db tests across 7 test files); npm run verify passes. | local only |
| 2026-10-11 | T-1.08 | Anti-Gravity | Implemented scenario S7 in supabase/tests/concurrency.sh and cross-platform launcher scripts/run-concurrency.mjs. Verified: session B waits for session A to finish and commit 3s transaction, session B fails with out-of-stock error, stock is 0, sold is 2, and exactly 1 order is created; npm run db:test:concurrency and npm run verify pass. | local only |
| 2026-10-11 | T-1.14 | Anti-Gravity | Authored database runbooks docs/runbooks/local-dev.md (Docker, endpoints, Inbucket local mail, test users), docs/runbooks/first-admin.md (owner SQL promotion procedure, security restrictions), and docs/runbooks/delivery-fees.md (fail-safe fee configuration, nationwide post vs. representative). Verified with manual review and npm run verify. | local only |
| 2026-10-11 | T-2.01 | Anti-Gravity | Added Zod-validated environment configuration in src/lib/env.ts (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_TURNSTILE_SITE_KEY) with readable error formatting, typed createClient<Database> in src/lib/supabase.ts, and clear EnvErrorScreen in development. Unit tests cover validation and error rendering. npm run test:unit:coverage (100% lines, 90% branch) and npm run verify pass. | local only |
| 2026-10-11 | T-2.02 | Anti-Gravity | Implemented React Router v7 with route table, Layout shell, skip link (#main-content), ScrollToTop, responsive Navbar (brand logo, search pill, nav links, cart pill, account, theme/language toggles, mobile menu), and cocoa Footer (tagline, policy links, ribbon divider, copyright). Added 16 route page placeholders with PearlLoader suspense fallback. Updated ADR-0001 with react-router-dom@7.18.4 pin. Verified with 72 unit tests and npm run verify. | local only |
| 2026-10-11 | T-2.03 | Anti-Gravity | Configured i18next and react-i18next with exact pins (26.4.3 and 17.0.16) in src/i18n/i18n.ts, LanguageProvider integration with dual t() callable and property dictionary access, full copy deck in ar.json and en.json from Section 8 of design-system.md, Arabic CLDR 6-form plural rules, Western digits. Added src/lib/format.ts (formatEGP with ar-EG-u-nu-latn, formatDate, formatNumber, LTR helpers), src/components/ui/Ltr.tsx, scripts/check-i18n.mjs (parity, key usage, kit exclusion), scripts/check-i18n.test.mjs, and check:i18n npm script. Verified with 79 app tests, 101 tooling tests, and npm run verify. | local only |
| 2026-10-11 | T-2.04 | Anti-Gravity | Implemented AuthProvider, useAuth hook, Arabic auth pages (Login, Register, Reset Password, Resend Confirmation), Cloudflare Turnstile integration, route guards (RequireAuth, RequireAdmin with 403 AUTH-011, RequireGuest), and generic catalogue error codes (AUTH-001 through AUTH-012). Strictly enforced SEC-05 enumeration protection: identical request count for known and unknown accounts, neutral AUTH-010 outcome, upfront 10-character password policy, always-visible resend link, and no raw errors in DOM. Unit tests in auth.test.tsx and full verify pass (90 app + 101 tooling tests). | local only |
| 2026-10-11 | T-2.05 | Anti-Gravity | Installed and pinned @tanstack/react-query (5.104.1) in ADR-0001; configured QueryClientProvider with retry policy (suppressing 4xx client retries, max 2 retries for 5xx/network) and 1m/5m cache timers. Added global ErrorBoundary with Arabic reset card, useToast hook and ToastProvider container, and shared ErrorPanel and EmptyState components with documented design tokens and Ltr error codes. Full verify passes with 101 app + 101 tooling tests (202 total). | local only |
| 2026-10-11 | T-2.06 | Anti-Gravity | Implemented TOTP two-factor authentication with Supabase Auth MFA: enrollment (QR code and manual secret key with Ltr), challenge and verification, factor listing and removal with fresh aal2 requirement, and useAal hook. Configured Admin MFA ladder in RequireAdmin (enrollment -> challenge -> admin access), and customer 2FA management in /account/security with second device recommendation. Handled AUTH-005 and AUTH-006 Arabic errors. Unit tests in mfa.test.tsx and full verify pass (108 app + 101 tooling tests). | local only |
| 2026-10-11 | T-2.07 | Anti-Gravity | Implemented account security on /account/security: change password (enforces 10 characters, checks stale session returning AUTH-007), change email (retains secure email change confirmation, displays neutral AUTH-010, targets authenticated user exclusively), global revocation signOut({ scope: 'global' }), and admin 20-minute idle session timeout with queryClient cache clearing verified with fake timers. Unit tests in accountSecurity.test.tsx and full verify pass (114 app + 101 tooling tests). | local only |
| 2026-10-11 | T-2.09 | Anti-Gravity | Implemented useStepUp() hook and StepUpDialog with in-memory 5-minute confirmation, challenge and verify, and ADM-003 prompt. Unit tests in stepUp.test.tsx verify in-memory expiry with fake timers and prove confirmation is never written to storage. Full verify passes (118 app + 101 tooling tests). | local only |
| 2026-10-11 | T-3.08 | Anti-Gravity | Implemented SEO basics: useSeo() hook, useRouteSeo() per-route title/meta hook wired in Layout, bilingual route dictionary in ar.json and en.json, Open Graph and Twitter card meta tags, public/favicon.svg (cropped bow), public/site.webmanifest, and public/robots.txt with crawler boundaries. Verified with 144 app tests + 105 tooling tests (249 total); npm run verify passes. | local only |
| 2026-10-11 | T-4.01 | Anti-Gravity | Implemented delivery options API and hooks in src/features/delivery/ (getGovernorates with Arabic names first, getDeliveryFees returning empty list when no rows configured, useGovernorates, useDeliveryFees). Unit tests in delivery.test.tsx verify empty list behavior, labels, Arabic sorting, and hook lifecycles. Full verify passes (155 app + 105 tooling tests = 260 tests). | local only |
| 2026-10-11 | T-5.01 | Anti-Gravity | Implemented Admin shell and access control in src/features/admin/ (AdminShell, AdminSidebar rail with 8 Arabic links, AdminHeader, lazy chunk loader, responsive mobile drawer, AAL2 badge, store return link). Customer receives 403 view (AUTH-011) without downloading admin chunk; admin at aal1 is sent to MFA with ADM-002 prompt without downloading admin chunk; admin at aal2 loads AdminShell. Full verify passes (163 app + 105 tooling tests = 268 tests). | local only |
| 2026-10-11 | T-5.06 | Anti-Gravity | Implemented Customers admin in src/features/admin/customers/ (table from customer_stats view, search by name/phone/product, read-only role badges with aria-readonly, no role mutation UI). Added scripts/admin-role-guard.test.mjs in test:tooling proving zero writes to profiles.role and zero admin_set_role calls in src/. Full verify passes (169 app + 107 tooling tests = 276 tests). | local only |
| 2026-10-11 | T-5.07 | Anti-Gravity | Implemented Delivery fees admin in src/features/admin/delivery/ (governorate x method grid, add/update/remove fees, empty cells read "غير متاح", validation for fee >= 0 with Arabic error feedback). Integrated into /admin/delivery route. Integration test proves removing fee makes that method unavailable at checkout. Full verify passes (181 app + 107 tooling tests = 288 tests). | local only |
| 2026-10-11 | T-6.01 | Anti-Gravity | Implemented Dashboard data layer in src/features/admin/dashboard/ (Zod schema for admin_dashboard RPC payload per database-contract.md, handled DashboardParseError on malformed response, preset date ranges for 7d/30d/90d/custom in Africa/Cairo time, useAdminDashboard React Query hook). Full verify passes (197 app + 107 tooling tests = 304 tests). | local only |
| 2026-10-11 | T-6.02 | Anti-Gravity | Implemented Dashboard UI in src/features/admin/dashboard/ (KPI cards, lazy-loaded Recharts daily revenue area chart with tokens and accessible summary table, breakdowns for status/delivery/governorate, top products and customers lists, low stock alerts linking to product edit form, preset range selector, and skeleton/empty/error states). Initial JavaScript budget enforced <= 200 KB gzip (192.5 KB) and Recharts strictly isolated to admin chunk. Full verify passes (209 app + 111 tooling tests = 320 tests). | local only |
| 2026-10-11 | T-6.03 | Anti-Gravity | Implemented Chart accessibility and export in src/features/admin/dashboard/ (text summary card and fallback data table for daily chart, aria-labels and table column scopes, ui-print-card and print styles, print report button, UTF-8 BOM CSV export helper formatDailySeriesCsv & downloadDailySeriesCsv). Axe accessibility audit reports 0 serious and 0 critical violations across dashboard in both Arabic and English. Full verify passes (220 app + 111 tooling tests = 331 tests). Initial bundle budget enforced <= 200 KB gzip (192.7 KB). | local only |
| 2026-10-11 | T-8.01 | Anti-Gravity | Authored auth email and hardening runbooks (docs/runbooks/auth-email.md explaining custom SMTP limits, configuration, exact non-wildcard redirect URLs, test procedure; docs/runbooks/auth-hardening.md 10-point checklist covering Turnstile, confirmations, 10-char password, TOTP MFA, HIBP, timeouts). Implemented clear "check your email", "resend", and "link expired" (AUTH-009) UI states across Register, Login, Reset Password, and Resend Confirmation pages. Full verify passes (225 app + 111 tooling tests = 336 tests). Initial bundle budget enforced <= 200 KB gzip (192.8 KB). | local only |
| 2026-10-12 | T-0.09 | Anti-Gravity + Codex | Reconciled repository guards: scripts/check-secrets.mjs rejecting privileged JWTs, secret keys and role mentions outside tests/docs; scripts/check-bundle.mjs enforcing <= 200 KB initial JS gzip budget and lazy admin separation; wired both into build and verify pipelines. Full verify passes. | PR #15 / local |
| 2026-10-12 | T-0.12 | Anti-Gravity + Codex | Reconciled repository security baseline: SECURITY.md, public/.well-known/security.txt, .github/CODEOWNERS, .github/dependabot.yml, .gitleaksignore, and secrets CI job. Full verify passes (225 app + 121 tooling tests = 346 tests). | PR #18 / local |
| 2026-10-12 | T-1.09 | Anti-Gravity | Added db job to .github/workflows/ci.yml with SHA-pinned setup-cli, supabase start, reset, test, concurrency launcher, types regeneration diff check, and migration guard. Removed completed check:migrations from pending.mjs. Full verify passes (346 tests). | pending |
| 2026-10-12 | T-1.10 | Anti-Gravity | Added migration 20261012040559_error_codes.sql setting hint to stable error codes (AUTH-004, ORD-001..ORD-008, ORD-009, ORD-014, ADM-001) and detail left=N for stock in place_order, cancel_my_order, admin_dashboard, and orders_status_guard. Implemented Scenario S18 pgTAP test suite in 07_error_codes.test.sql (20 assertions). Full verify passes (346 tests). | pending |
| 2026-10-12 | T-1.12 | Anti-Gravity | Added .github/workflows/db-staging.yml and .github/workflows/db-production.yml with SHA-pinned setup-cli, un-echoed secrets, and manual confirmation gate. Authored docs/runbooks/deploy-db.md covering staging/production procedures, pausing caveat and checklists. Full verify passes (346 tests). | pending |
| 2026-10-12 | T-1.15 | Anti-Gravity | Hardened database admin access: is_admin() requires AAL2 MFA claim, added require_admin() raising ADM-002 at AAL1 and ADM-001 for non-admins, removed admin_set_role, added protect_profile_role trigger blocking API role mutations, clamped sign-up metadata in handle_new_user, and added text column length check constraints on profiles, categories, products, and orders. Created 08_admin_hardening.test.sql (30 assertions for S19, S20, S30) and updated 05_admin.test.sql. Full verify passes (346 tests). | pending |
| 2026-10-12 | T-1.16 | Anti-Gravity | Implemented audit log (S21): created append-only audit_log table with immutability trigger blocking update and delete for all roles including owner, RLS allowing select only to admin at AAL2, audit_event helper, and triggers recording admin and database owner changes across products, categories, delivery_fees, orders, and profiles role. Customer place_order stock decrements are excluded. Created 09_audit_log.test.sql (17 assertions). Full verify passes (346 tests). | pending |
| 2026-10-12 | T-1.17 | Anti-Gravity | Implemented shop settings (S22): created shop_settings table with 16 seeded default rows, privacy RLS (public keys readable by anon/customers, private keys visible only to admin at AAL2), admin_update_setting RPC enforcing key allow-list (ADM-008) and typed range/regex validation (ADM-007), audit trigger recording settings changes, and configured product-images bucket limit to 3 MB and allowed types (JPEG, PNG, WebP). Created 10_shop_settings.test.sql (26 assertions). Full verify passes (346 tests). | pending |
| 2026-10-12 | T-1.18 | Anti-Gravity | Implemented Orders v2 and payments (S23, S24, S25): migration 20261012050000_orders_v2_payments.sql with payment enums, submit_payment_proof (ORD-011, ORD-012, ORD-014), admin_review_payment with AAL2 MFA (ORD-015, ADM-002), expire_unpaid_orders, COD auto-marking trigger, payment proofs storage bucket with private RLS. Created 11_orders_v2_payments.test.sql (37 assertions). Full verify passes. | pending |
| 2026-10-12 | T-1.19 | Anti-Gravity | Implemented Catalog admin support (S26): migration 20261012051500_catalog_admin.sql with is_active, show_on_home, is_featured flags, storage path regex constraints, safe delete RPCs admin_delete_product (ADM-004) and admin_delete_category (ADM-005), and storefront active RLS policies. Created 12_catalog_admin.test.sql (31 assertions). Full verify passes. | pending |
| 2026-10-12 | T-1.20 | Anti-Gravity | Implemented Abuse controls (S27, S28): migration 20261012053000_abuse_controls.sql with rate_limits table, check_rate_limit function raising SYS-003, integrated rate limits in place_order, submit_payment_proof, and cancel_my_order. Enforced 30 item lines limit (ORD-013), qty <= 20 (ORD-006), and pending orders limit (ORD-010). Created 13_abuse_controls.test.sql (19 assertions). Full verify passes. | pending |
| 2026-10-12 | T-1.21 | Anti-Gravity | Implemented Stock ledger (S29): migration 20261012054500_stock_ledger.sql with stock_movements table, immutability trigger, AAL2 MFA read policy, log_stock_movement trigger with app.stock_reason session config, and integration across place_order ('order') and cancel_my_order ('cancel'). Created 14_stock_ledger.test.sql (22 assertions). Full verify passes. | pending |
| 2026-10-12 | T-1.22 | Anti-Gravity | Implemented SQL guard script: scripts/check-sql.mjs (check:sql script) blocking dynamic execute with string concatenation (||), security definer functions without set search_path, public tables without RLS enabled, and anon table grants outside allow-list. Created test suite scripts/check-sql.test.mjs in test:tooling and wired check:sql into verify and CI db job. Full verify passes (225 app + 136 tooling tests = 361 tests). | pending |




### Open questions (agents add rows; the owner answers)


| ID | Question | Task | Needed from | Status |
|---|---|---|---|---|
| OD-001 | Approve compatible TypeScript 6 / ESLint 9 exception; latest majors conflict with required plugins (OPEN_DECISION.md). | T-0.02 | owner | approved 2026-10-09 |
| H-07 | GitHub remote supplied: https://github.com/HassanG04/lolys (private). | T-0.01, T-0.06 | owner | resolved 2026-10-09 |

### Decisions (ADR index)

| ADR | Title | Status |
|---|---|---|
| 0001 | Stack and versions | accepted; OD-001 approved by owner |
| 0002 | Bilingual interface | accepted under OD-003, recorded in Anti-Gravity handover |
