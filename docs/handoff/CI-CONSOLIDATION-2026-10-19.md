# CI repair consolidation — 2026-10-19

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

| Measurement                                  | Home LCP | Category LCP | Other evidence                                 |
| -------------------------------------------- | -------- | ------------ | ---------------------------------------------- |
| Before this profiling pass                   | 3308 ms  | 3192 ms      | CLS 0 / 0.0003                                 |
| Final predecessor complete suite (`6ef9811`) | 2604 ms  | 2756 ms      | CLS 0.0402 / 0; 101 passed, 2 failed, no skips |

The request trace showed the initial vendor request starting after the entry
download, followed by multiple waves of small lazy modules. The Arabic display
font started at about 3075 ms in the baseline trace. Native static preloads,
lazy grouping and font scheduling improved that waterfall, but did not meet
the LCP limit. No performance success is claimed.

The predecessor's full `npm run verify` passed all 12 gates: 889 application
tests, 204 tooling tests and initial JS 199,734 bytes. Its isolated local browser
build was 199,931 bytes. One earlier verification process ended without a final
result after a dashboard timeout; the complete replacement run passed without
changing test timeouts or assertions.

## Consolidated branch verification

The predecessor results above are not results for the new branch. Fresh
`npm run verify` on the consolidated source at `397fd09` passed all 12 gates:
889 application tests, 204 tooling tests and initial JS 199,730 / 200,000 gzip
bytes. `npm run test:unit:coverage` also passed: statements 93.29%, branches
88.24%, functions 88.4% and lines 93.6% (889 app + 204 tooling tests).

The complete consolidated browser rerun finished **101 passed, 2 failed, no
skips** in 6.3 minutes. Only home/category LCP failed: **2708/2776 ms**. CLS was
**0.0402/0**, within the limit. All 10 accessibility, 9 admin, 9 RTL, 9 security,
8 storefront, 8 loading-layout, 36 motion and 12 responsive cases passed. The
local browser build fits at **199,927 / 200,000 gzip bytes**. The first run was
interrupted after test 25; this full rerun supersedes it.

GitHub run `39170822440` at `6f9eb2d` passed database, SAST, analytics, static,
roadmap, build, unit/coverage and secrets. Its browser job was still running at
the last observation; this is not an overall green CI claim. Later documentation
commits do not change the tested application, fixtures or build configuration.

Dependency
installation with `npm ci --ignore-scripts` passed with zero reported
vulnerabilities. No dependency or lockfile version changed.

## Remaining work and security review

T-7.03b stays blocked: further LCP tuning stopped under roadmap section 1.5 after
three unsuccessful approaches. Fresh measurements now identify the remaining
initial vendor transfer, route discovery, font and data-request timing. Do not
repeat the same experiments or relax budgets. T-7.08b/T-7.08c remain doing until
their complete acceptance criteria and PR checks are satisfied.

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
