# Handover to Anti-Gravity — consolidated CI repairs

## Current objective

Finish review of the owner-approved single replacement draft PR for T-7.08b,
T-7.08c and the partial T-7.03b repair. PRs #41–43 were closed without merging.
Do not resume from the primary checkout's older "all tasks completed" report.

- Worktree: `C:\Users\Hassan-PC\.codex\worktrees\ci-consolidation\الاء`.
- Branch: `agent/T-7.08b-consolidated-ci-repairs`.
- Base: main `c6f680c5c19013d614c5258c5086f683e74ffa94`.
- Source checkpoint: `397fd09`; subsequent documentation does not change code.
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

## Remaining

Consolidated coverage passed: statements 93.29%, branches 88.24%, functions
88.4%, lines 93.6%, with 889 app + 204 tooling tests. The complete consolidated
browser rerun finished 101 passed, 2 failed and no skips: only mobile LCP failed
at 2708/2776 ms; CLS 0.0402/0 passed. The local browser bundle is 199,927 bytes.
This complete rerun supersedes the interrupted run.

GitHub run `39170822440` at `6f9eb2d` passed all eight non-browser jobs; its browser
job was still running at the last observation. Check exact remote head/results
before making any CI claim. Documentation-only follow-up commits do not change
the tested source.

Keep T-7.03b blocked under roadmap section 1.5 after the unsuccessful approaches.
Further LCP work requires a revised measured approach; do not repeat experiments
or raise budgets. Keep T-7.08b/T-7.08c doing until their criteria and remote checks
pass. Owner security review and human-owned launch tasks remain. Local widget
simulation does not verify hosted CAPTCHA enforcement or email delivery.

## Current files

Files changed against main (temporary database config excluded):

- `.agent-state/project-progress.md`
- `.github/workflows/ci.yml`
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
- `e2e/ui/loading-layout.spec.ts`
- `eslint.config.js`
- `HANDOVER_TO_ANTI_GRAVITY.md`
- `index.html`
- `roadmap.md`
- `scripts/check-ui-build.mjs`
- `scripts/check-ui-build.test.mjs`
- `scripts/headers.test.mjs`
- `scripts/initial-preload.test.mjs`
- `scripts/initial-preload.ts`
- `src/components/layout/Layout.tsx`
- `src/features/admin/dashboard/dashboardUI.test.tsx`
- `src/features/auth/auth.test.tsx`
- `src/features/auth/Turnstile.test.tsx`
- `src/features/auth/Turnstile.tsx`
- `src/features/seo/seo.test.tsx`
- `src/i18n/ar.json`
- `vite.config.ts`

## Current error

```text
Error: Mobile LCP still exceeds the loading budget.
Expected: LCP <= 2500 ms; CLS <= 0.1; initial JS <= 200000 gzip bytes.
Actual: Consolidated home/category 2708/2776 ms, CLS 0.0402/0, local E2E JS 199927 bytes.
Possible cause: Remaining vendor transfer, lazy route discovery, font and data-request timing.
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
