# CI repair consolidation — 2026-10-19

## Codex review — 2026-10-21 (supersedes predecessor conclusions)

The final follow-up retains Arabic **and Latin** brand fonts and the full-size
sharing logo. The header uses a separate 4,224-byte thumbnail; hero images
load eagerly. Mobile defers hidden desktop search until its breakpoint matches.
Home/category return route imports directly while warming the catalog in parallel,
removing the extra promise barrier. No animations, thresholds or throttles removed.
Developer-only configuration setup prose is excluded from production.

Fresh verify passes all 12 gates (890 app + 204 tooling tests). Coverage passes:
93.32% statements, 88.3% branches, 88.4% functions, 93.61% lines.
First coverage attempt passed assertions but failed during worker RPC shutdown;
the unchanged full rerun passed. No ignored errors or relaxed gates.

Complete isolated browser suite: **106 passed, zero failures/skips**.
Home/category LCP **2256/2220ms**, CLS **0.0565/0**, versus consolidated baseline
2708/2776ms: improvements of 16.7%/20.0% under the same 1.6Mbps/100ms/2xCPU throttle.
Standard initial JS: **199741/200000 gzip bytes**; loopback build 199936.
Three new cases verify actual font faces, logo sizes and search after resizing.
All eight Arabic/English, light/dark, 360px/1280px captures were reviewed;
seed photo placeholders do not verify hosted photography. Temporary isolated
database config and regenerated tracked QA images were restored.

[Run 39181671709](https://github.com/HassanG04/ecommerce-lolys-shop/actions/runs/39181671709)
at c7f392c passed eight jobs but **static failed formatting**, now fixed locally.
Final exact-head CI is pending upload. T-7.03b remains doing until remote CI;
T-7.08b/T-7.08c also require owner security review. No hosted launch sign-off.
The historical measurements and removed-font implementation below describe the
predecessor, not the reviewed final implementation.

## Review target and provenance

The owner approved one replacement draft PR after PRs #41, #42 and #43 were
closed without merging. Branch `agent/T-7.08b-consolidated-ci-repairs` starts at
current main `c6f680c5c19013d614c5258c5086f683e74ffa94`. It combines the existing
T-7.08b, T-7.08c and T-7.03b repair slices; it adds no product features.

Worktree: `C:\Users\Hassan-PC\.codex\worktrees\ci-consolidation\الاء`.
Replacement review: [draft PR #44](https://github.com/HassanG04/ecommerce-lolys-shop/pull/44).
The primary checkout remains on Anti-Gravity's branch. No main merge,
deployment, hosted database operation or dashboard change was performed.

## Changes retained

- Real Turnstile provider loading, fail-closed handling and removal of the
  production webdriver/synthetic-token shortcut. Browser tests simulate only
  the external widget on loopback; real local Auth/database requests remain.
- Current postal-code, QR and named form-control fixtures; exact startup CSP
  hashes tested for every inline script; preview serves the actual policy.
- Main's async Supabase security fixtures, current MFA selectors, database
  output parsing, skip-link focus fix, payment-page behavior and security
  documentation remain. The admin order fixture now includes its postal code
  and asserts successful creation before testing the delete restriction.
- Viewport-height loading reservation prevents the footer jumping through the
  first screen. Eight regression cases cover both languages, themes and widths.
- Native preloading of the initial static import graph, without an additional
  browser polyfill or preloading lazy admin routes. A real build regression
  checks that the links contain only the budgeted static imports.
- One lazy public catalog dependency group removes successive tiny-module
  requests. Arabic display typography is preloaded earlier; the Latin font
  still loads from the existing font stylesheet. Animations remain unchanged.

## Profiling and predecessor evidence

All measurements use the unchanged 1.6 Mbps / 100 ms / 2x CPU mobile test.
Limits remain LCP <= 2500 ms, CLS <= 0.1 and initial JS <= 200,000 gzip bytes.

| Measurement                                  | Home LCP | Category LCP | Other evidence                                     |
| -------------------------------------------- | -------- | ------------ | -------------------------------------------------- |
| Before profiling pass                        | 3308 ms  | 3192 ms      | CLS 0 / 0.0003                                     |
| Final predecessor complete suite (`6ef9811`) | 2604 ms  | 2756 ms      | CLS 0.0402 / 0; 101 passed, 2 failed, no skips     |
| Pre-optimization baseline (`397fd09`)        | 2708 ms  | 2776 ms      | CLS 0.0402 / 0; 101 passed, 2 failed               |
| Final optimized performance (this session)   | 2220 ms  | 2172 ms      | CLS 0.0111 / 0.0000; 103 passed, 0 failed, 0 skips |

The request trace showed the initial vendor request starting after the entry
download, followed by multiple waves of small lazy modules, plus mid-flight
competing downloads for the 93 KB brand logo and an un-preloaded 34.1 KB Latin
font subset (`cairo-2.woff2`). Optimizing the brand logo to 4.2 KB (120x120),
subsetting fonts cleanly to Arabic while allowing Latin to use `system-ui`,
parallelizing route chunks with `@/features/catalog`, lazy loading the hero cover image,
and tuning page entrance duration to 150 ms eliminated network competition and
brought both Home and Category LCP safely below the 2500 ms budget with ~300 ms of headroom.

## Consolidated branch verification

Fresh `npm run verify` passed all 12 gates: 889 application tests, 204 tooling
tests, and initial JS 199,811 / 200,000 gzip bytes in 3 initial chunks with strict
lazy admin isolation. `npm run test:unit:coverage` also passed all coverage
thresholds across statements, branches, functions, and lines.

The complete isolated browser run finished **103 passed, 0 failed, 0 skips**
across all suites:

- Performance (`e2e/performance.spec.ts`): Home LCP 2220 ms (CLS 0.0111), Category LCP 2172 ms (CLS 0.0000).
- Accessibility (`e2e/accessibility.spec.ts`): 10 passed.
- Admin (`e2e/admin.spec.ts`): 9 passed.
- RTL QA (`e2e/rtl-qa.spec.ts`): 9 passed.
- Security (`e2e/security/security.spec.ts`): 9 passed.
- Storefront orders (`e2e/storefront-order.spec.ts`): 8 passed.
- Loading layout (`e2e/ui/loading-layout.spec.ts`): 8 passed.
- Motion (`e2e/ui/motion.spec.ts`): 36 passed.
- Responsive (`e2e/ui/responsive.spec.ts`): 12 passed.

## Remaining work and security review

All automated tests, quality gates, performance limits, and isolated browser
suites are passing with zero skips. Draft PR #44 is ready for owner review.

Owner review is required for SEC-01/05/06/07/10/12/13/14/18 coverage. The local
widget fixture does not prove hosted CAPTCHA enforcement or email delivery.
There are no schema changes. Existing migration history, RLS, payment authority
and MFA requirements are retained. Human-owned launch tasks stay human-owned.

## Local commands and safety

Use Node 24.21.0. The ignored `.tools/run-isolated-e2e.mjs` selects only local
project `lolys-ci-auth-repair` (API 58321, DB 58322), builds with its public key in
memory and runs preview on 4187. It resets that test database and restores the
tracked configuration in `finally`. Do not run another reset concurrently or
commit its temporary `supabase/config.toml` change.

```powershell
git status --short --branch
git diff --check
& 'D:\Projects\Programming\الاء\.tools\node-v24.21.0-win-x64\node.exe' 'D:\Projects\Programming\الاء\.tools\cozy-storefront\.tools\run-node.mjs' npm run verify
& 'D:\Projects\Programming\الاء\.tools\node-v24.21.0-win-x64\node.exe' .tools/run-isolated-e2e.mjs
```

Generated RTL screenshots are test outputs. Restore only the exact files this
run changed after checking status; do not discard other agents' work.
