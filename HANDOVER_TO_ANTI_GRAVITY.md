# Handover to Anti-Gravity — consolidated CI repairs

## Current objective

Finish review of the owner-approved single replacement draft PR for T-7.08b,
T-7.08c and the completed local T-7.03b repair. PRs #41–43 were closed without merging.
Do not resume from the primary checkout's older "all tasks completed" report.

- Worktree: `C:\Users\Hassan-PC\.codex\worktrees\ci-consolidation\الاء`.
- Branch: `agent/T-7.08b-consolidated-ci-repairs`.
- Base: main `c6f680c5c19013d614c5258c5086f683e74ffa94`.
- Reviewed predecessor: `c7f392c`; this follow-up restores typography/sharing quality.
- Use git log for the follow-up SHA; exact-head CI is pending.
- Replacement review: [draft PR #44](https://github.com/HassanG04/ecommerce-lolys-shop/pull/44).
- Repository: `https://github.com/HassanG04/ecommerce-lolys-shop`, redirected from the owner-approved `SaaS-lolys-shop` URL.
- No main merge, deployment, hosted database operation or dashboard change.

## Completed

- Real Turnstile loading; removed production webdriver/synthetic-token shortcut.
  Local widget simulation retains real local Auth and database requests.
- Postal/QR/named-control fixtures; real HTTP CSP and authenticated admin-route
  checks; exact hashes for every inline startup script.
- Preserved main's async fixtures, MFA selectors, payment page, database-output
  parser and security documentation. Fixed the admin fixture's postal code and
  asserted successful setup before checking the product-delete restriction.
- Loading-height reservation with eight language/theme/width regression cases.
- Profiled waterfall: native static import preloads, lazy catalog grouping and
  earlier Arabic display font. No eager admin, removed animations or relaxed gates.
- Fresh consolidated verify passed all 12 gates: 889 application tests, 204
  tooling tests; initial JS 199,730 / 200,000 gzip bytes.

- Mobile defers hidden desktop search until its breakpoint matches; resize is tested.
- Direct route imports avoid an extra promise barrier while warming catalog in parallel.
- Restored Latin fonts, full-size sharing logo and eager hero; separate 4224-byte header
  thumbnail. Retained motion. Added three browser cases and one unit case.

## Remaining

Latest fresh verify passes all 12 gates: 890 app + 204 tooling tests.
Coverage passes (93.32% statements, 88.3% branches, 88.4% functions, 93.61% lines).
Complete isolated browser run: 106 passed, no failures/skips; mobile LCP 2256/2220ms,
CLS 0.0565/0. Standard initial JS 199741 bytes; local browser build 199936.
All eight language/theme/width loading captures reviewed. Local seed product-photo
placeholders are not hosted photography verification.

Previous c7f392c CI run 39181671709 failed static formatting, now fixed locally.
Push this follow-up and check its exact-head CI; keep T-7.03b doing until then.
T-7.08b/T-7.08c also need owner security review. Human-owned launch work remains.
First coverage run hit worker RPC shutdown after passing assertions; unchanged
full rerun passed. No errors ignored or thresholds relaxed.

## Current files

Files changed against main (temporary database config excluded):

- `.agent-state/project-progress.md`
- `.github/workflows/ci.yml`
- `HANDOVER_TO_ANTI_GRAVITY.md`
- `HANDOVER_TO_CODEX.md`
- `docs/handoff/CI-CONSOLIDATION-2026-10-19.md`
- `docs/handoff/CI-REPAIR-2026-10-18.md`
- `e2e/accessibility.spec.ts`
- `e2e/admin.spec.ts`
- `e2e/fixtures/turnstile.js`
- `e2e/global-setup.ts`
- `e2e/helpers/turnstile.ts`
- `e2e/performance.spec.ts`
- `e2e/rtl-qa.spec.ts`
- `e2e/security/security.spec.ts`
- `e2e/storefront-order.spec.ts`
- `e2e/ui/brand-loading.spec.ts`
- `e2e/ui/loading-layout.spec.ts`
- `eslint.config.js`
- `index.html`
- `public/brand/logo-navbar.jpg`
- `public/fonts/README.md`
- `public/fonts/aref-ruqaa.css`
- `public/fonts/cairo.css`
- `roadmap.md`
- `scripts/check-ui-build.mjs`
- `scripts/check-ui-build.test.mjs`
- `scripts/headers.test.mjs`
- `scripts/initial-preload.test.mjs`
- `scripts/initial-preload.ts`
- `src/components/layout/Layout.tsx`
- `src/components/layout/Navbar.tsx`
- `src/features/admin/dashboard/dashboardUI.test.tsx`
- `src/features/auth/Turnstile.test.tsx`
- `src/features/auth/Turnstile.tsx`
- `src/features/auth/auth.test.tsx`
- `src/features/seo/seo.test.tsx`
- `src/i18n/ar.json`
- `src/lib/env.test.ts`
- `src/lib/env.ts`
- `src/pages/HomePage.tsx`
- `src/routes.tsx`
- `src/styles/storefront.css`
- `vite.config.ts`

## Current error

```text
Error: None locally; exact-head PR CI pending.
Expected: LCP <=2500ms; CLS <=0.1; initial JS <=200000 gzip bytes.
Actual: LCP 2256/2220ms, CLS 0.0565/0; local browser JS 199936 bytes; 106 tests pass.
Possible remaining issue: platform differences require normal remote CI.
```

See `docs/handoff/CI-CONSOLIDATION-2026-10-19.md` for evidence and earlier failed
approaches. An earlier primary-checkout run used an unrepaired cloud-configured
build; its login failures are not evidence against this replacement branch.

## Next exact commands

Read this handover, shared progress, status and diff first. Use Node 24.21.0.
Never read `.env` values or print database keys.

```powershell
Set-Location 'C:\Users\Hassan-PC\.codex\worktrees\ci-consolidation\الاء'
git status --short --branch
git diff --check
& 'D:\Projects\Programming\الاء\.tools\node-v24.21.0-win-x64\node.exe' scripts/roadmap.mjs next
```

For a justified browser rerun:

```powershell
& 'D:\Projects\Programming\الاء\.tools\node-v24.21.0-win-x64\node.exe' .tools/run-isolated-e2e.mjs
```

The helper resets only local `lolys-ci-auth-repair` (API 58321, DB 58322), previews
on 4187 and restores config in `finally`. Do not reset concurrently, commit its
temporary config or use the hosted project. Restore only explicitly identified
screenshots generated by your own run.
