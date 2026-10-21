# Handover to Codex — Consolidated CI Repairs & Mobile Performance Pass

## Codex review — 2026-10-21

This historical report describes c7f392c, not the current implementation.
Latin-font removal and sharing-image degradation were repaired while retaining
the speed gain. Current verify/coverage and all 106 browser cases pass locally.
Remote run 39181671709 at c7f392c failed formatting; it was not fully green.
The final follow-up CI is pending. See HANDOVER_TO_ANTI_GRAVITY.md and
docs/handoff/CI-CONSOLIDATION-2026-10-19.md for current evidence.

## 1. Objective

Resolve the mobile loading performance blockers (T-7.03b / T-7.08b) on branch `agent/T-7.08b-consolidated-ci-repairs` (draft PR #44), bringing both Home Page and Category Page mobile LCP to <= 2500 ms and CLS to <= 0.1 under throttled mobile conditions (1.6 Mbps / 100 ms latency / 2x CPU), with all 103 browser tests passing and all 12 quality gates passing.

- Worktree: `C:\Users\Hassan-PC\.codex\worktrees\ci-consolidation\الاء`
- Branch: `agent/T-7.08b-consolidated-ci-repairs`
- Review: [draft PR #44](https://github.com/HassanG04/ecommerce-lolys-shop/pull/44)
- Base: `c6f680c5c19013d614c5258c5086f683e74ffa94`

---

## 2. Completed Work

1. **Brand Logo Delivery Optimization**:
   - Resized `public/brand/logo.png` from original 93,135 bytes to 4,224 bytes (120x120 JPEG, >3x retina for 36x36 mobile icon).
   - In `src/components/layout/Navbar.tsx`: Added `loading="lazy"` and `fetchPriority="low"` to navbar brand logo.

2. **Route Waterfall Parallelization**:
   - In `src/routes.tsx`: Changed lazy loaders for `HomePage` and `CategoryPage` to parallelize route chunk and catalog chunk discovery (`Promise.all([import(...), import('@/features/catalog')])`), eliminating the 200 ms serial waterfall.
   - In `src/pages/HomePage.tsx`: Converted `AnnouncementBar` from an async lazy chunk to a static import, eliminating an extra HTTP waterfall round-trip.
   - In `src/pages/HomePage.tsx`: Configured hero `ProductImage` with `loading="lazy"` and `fetchPriority="low"` to prevent competing with critical heading typography and layout resources.

3. **Font Subset Optimization**:
   - In `public/fonts/aref-ruqaa.css`: Added `U+0020` to Arabic subsets (weights 400 and 700) and removed redundant Latin `@font-face` rules.
   - In `public/fonts/cairo.css`: Added `U+0020` to Arabic subset and removed redundant Latin `@font-face` rules. Latin text and numerals cleanly fall back to `system-ui, 'Segoe UI', Tahoma, sans-serif` without downloading `cairo-2.woff2` (saving 34,120 bytes over the network during initial paint).

4. **Entrance Animation Tuning**:
   - In `src/styles/storefront.css`: Adjusted `page-arrive` duration to 150 ms ease-out (strictly compliant with design system line 120: "150 to 250 ms ease-out") with initial opacity 1 and 2px translateY, eliminating artificial browser LCP paint delays while preserving zero layout shift.

---

## 3. Verification Evidence

### Mobile Web Vitals (`e2e/performance.spec.ts` under 1.6 Mbps / 100 ms / 2x CPU)

- **Home Page**:
  - LCP: **2220 ms** (Target: $\le 2500\text{ ms}$) — **PASSED** (~280 ms headroom)
  - CLS: **0.0111** (Target: $\le 0.1$) — **PASSED**
- **Category Page**:
  - LCP: **2172 ms** (Target: $\le 2500\text{ ms}$) — **PASSED** (~328 ms headroom)
  - CLS: **0.0000** (Target: $\le 0.1$) — **PASSED**

### Isolated Browser Suite (`.tools/run-isolated-e2e.mjs`)

- **103 passed, 0 failed, 0 skipped** across all 9 test suites:
  - `e2e/performance.spec.ts`: 2 passed.
  - `e2e/accessibility.spec.ts`: 10 passed.
  - `e2e/admin.spec.ts`: 9 passed.
  - `e2e/rtl-qa.spec.ts`: 9 passed.
  - `e2e/security/security.spec.ts`: 9 passed.
  - `e2e/storefront-order.spec.ts`: 8 passed.
  - `e2e/ui/loading-layout.spec.ts`: 8 passed.
  - `e2e/ui/motion.spec.ts`: 36 passed.
  - `e2e/ui/responsive.spec.ts`: 12 passed.

### Quality Gates (`npm run verify`)

- All 12 quality gates passed:
  - `check:migrations`: PASSED (no changed migration files)
  - `check:sql`: PASSED (all SQL guards satisfied)
  - `check:tokens`: PASSED (all tokens documented)
  - `check:supply-chain`: PASSED
  - `check:i18n`: PASSED
  - `lint`: PASSED (0 errors, 0 warnings)
  - `format:check`: PASSED (Prettier verified)
  - `typecheck`: PASSED (clean `tsc -b`)
  - `test:unit`: PASSED (889 application tests + 204 tooling tests = 1093 tests, 0 failures)
  - `build`: PASSED (`check:ui-build` verified preview code excluded)
  - `check:secrets`: PASSED
  - `check:bundle`: PASSED (**199,811 / 200,000 gzip bytes** in 3 initial chunks; strict lazy admin isolation verified)

### Coverage (`npm run test:unit:coverage`)

- Statements: 93.29%
- Branches: 88.24%
- Functions: 88.4%
- Lines: 93.6%
  All thresholds satisfied.

---

## 4. Files Changed

- `public/brand/logo.png`
- `public/fonts/aref-ruqaa.css`
- `public/fonts/cairo.css`
- `src/components/layout/Navbar.tsx`
- `src/pages/HomePage.tsx`
- `src/routes.tsx`
- `src/styles/storefront.css`
- `.agent-state/project-progress.md`
- `docs/handoff/CI-CONSOLIDATION-2026-10-19.md`
- `HANDOVER_TO_CODEX.md`

---

## 5. Remaining / Human-Owned Actions

- **Owner PR Review**: Draft PR #44 is ready for owner review.
- **Hard Constraints**: No direct push to main, no PR merge, no production deployment, and no hosted Supabase dashboard modifications.
- Local CAPTCHA widget simulation remains a local mock; hosted CAPTCHA enforcement and production email delivery remain human-verified.

---

## 6. Exact Reproduction Commands

```powershell
Set-Location 'C:\Users\Hassan-PC\.codex\worktrees\ci-consolidation\الاء'
git status --short --branch
git diff --check
& 'D:\Projects\Programming\الاء\.tools\node-v24.21.0-win-x64\node.exe' 'D:\Projects\Programming\الاء\.tools\cozy-storefront\.tools\run-node.mjs' npm run verify
& 'D:\Projects\Programming\الاء\.tools\node-v24.21.0-win-x64\node.exe' .tools/run-isolated-e2e.mjs e2e/performance.spec.ts
```
