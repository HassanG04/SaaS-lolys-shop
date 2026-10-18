# Handover to Anti-Gravity — CI and mobile performance repairs

## Current objective

Continue the CI repair and mobile loading investigation for Lolys from the isolated review stack. Keep the existing security controls, original performance budgets and review-only merge policy.

## Completed

- **PR #41 / `75602ec` / `agent/T-7.08b-ci-auth-repairs`**: removed the production webdriver CAPTCHA shortcut and synthetic token; loads the actual Cloudflare Turnstile script and fails closed; moved widget simulation into a localhost-only Playwright fixture; repaired SEO/dashboard unit fixtures; restored LCP 2500 ms and CLS 0.1; added production build guards. Local verify before follow-up: 889 application tests + 203 tooling tests; coverage passed; initial JS 199,709 / 200,000 gzip bytes.
- **PR #42 / `15b378e` / `agent/T-7.08c-browser-fixtures-and-csp`**, stacked on #41: updated postal-code/order fixtures, named checkout selectors, generated QR accessibility selector and local payment-link fixture; authorized the exact motion startup CSP hash; header tests now hash every inline startup script; preview serves the real CSP so authenticated admin pages are tested without HTML interception. Follow-up `npm run verify` passed all 12 gates: 889 app tests + 203 tooling tests, no skips, initial JS 199,717 / 200,000 gzip bytes.
- Targeted local browser runs passed: accessibility 10/10, admin 9/9, RTL 9/9, storefront order 8/8, security 9/9. GitHub run `39139829598` for #42 passed static, unit/coverage, database, build, SAST, secrets, roadmap and analytics; the full browser job finished **93 passed, 2 failed**, with only the home/category performance cases failing.
- **Current branch `agent/T-7.03b-mobile-loading-repair`**, based on #42: retained only `Layout.tsx` main-content viewport reservation and stronger performance measurement that waits for the real heading. The original animations, vendor split, limits and bundle gate were restored after experiments.

## Remaining

- Mobile LCP is still above the unchanged 2500 ms target. Local complete run with the retained height fix: 93 passed, 2 failed; home/category LCP 3260/3184 ms and CLS 0.0161/0.0003. GitHub #42 before the height fix: home 3196–3288 ms LCP, CLS 0.5408–0.5569; category 2432–2472 ms LCP, CLS 0.5628.
- T-7.03b was marked `blocked` after three distinct optimization attempts, per roadmap §1.5. Do not raise thresholds or repeat the failed bundle changes. The next attempt needs fresh evidence about initial dependency payload, font timing and data requests.
- The eight-case loading-layout regression (`e2e/ui/loading-layout.spec.ts`) passes 8/8. It covers Arabic/English, light/dark, 360/1280 and ensures the footer remains below the initial viewport while the lazy home route is delayed.
- Focused loading-layout verification passes 8/8. Final verify on the performance branch is not yet complete. Draft PR #43 (`1e323f8`) contains the safe checkpoint; do not mark T-7.03b done or claim combined CI/launch readiness.

## Current files on this branch

```text
.agent-state/project-progress.md
e2e/performance.spec.ts
e2e/ui/loading-layout.spec.ts
roadmap.md
src/components/layout/Layout.tsx
docs/handoff/CI-REPAIR-2026-10-18.md
HANDOVER_TO_ANTI_GRAVITY.md
```

The checkpoint is committed as `1e323f8` and pushed in draft PR #43. No schema, production settings, secrets or `.env` files were changed. Generated RTL screenshots and the temporary isolated `supabase/config.toml` were restored.

## Current error

```text
Expected: Home and category LCP <= 2500 ms and CLS <= 0.1.
Actual:   Local retained-fix run: LCP 3260/3184 ms; CLS 0.0161/0.0003.
          GitHub #42: 93 passed, 2 failed, only performance.
Possible cause: initial dependency/vendor payload and late font/data work dominate the first mobile paint.
```

Three measured approaches were tried and reverted:

1. Native module preload with current vendor split: 2592/2824 ms, CLS 0.0443/0.0013, but 201,107 initial gzip bytes.
2. Native preload with automatic splitting: 2628/2940 ms and 203,621 initial gzip bytes.
3. Combined entry dependencies/immediate first paint: 2508/2500 ms, home CLS 0.1029, invalid bundle attribution and about 203 kB.

## Next exact commands

From this worktree, using pinned Node 24.21.0:

```powershell
git status --short
git diff --check
npm exec -- prettier --check .
& 'D:\Projects\Programming\الاء\.tools\node-v24.21.0-win-x64\node.exe' .tools/run-isolated-e2e.mjs e2e/ui/loading-layout.spec.ts
npm run verify
```

If the layout test passes, commit and push the checkpoint as a draft PR targeting `agent/T-7.08c-browser-fixtures-and-csp`. If it fails, fix only the layout regression and rerun it. For another LCP attempt, first add measurement evidence and split the task if it exceeds the roadmap change-size rule. Do not merge, push `main`, change Supabase/Cloudflare dashboards, deploy, or weaken any test/security gate.
