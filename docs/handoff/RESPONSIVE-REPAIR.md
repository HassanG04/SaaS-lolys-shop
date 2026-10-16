# Responsive repair — 2026-10-17

Current branch: `agent/T-5.13d-responsive-evidence`, based on responsive
implementation checkpoint `169b452` (`agent/T-5.13c-responsive-navigation`).
Implementation and regression evidence are split for the roadmap review-size limit.
Earlier checkpoints: `52dfb0b` MFA repair; `a561e3c` admin workspace;
`5580295` order/payment navigation. No merge or deployment.

## Changes

- Dashboard label and adjacent toggle sit on the physical right in both languages.
- Admin workspace fills the viewport; only its content scrolls. The header and
  sidebar controls remain reachable. Admin navigation preserves the shell and
  collapsed state; the skip link targets the scrollable content.
- Visibility switch uses a 44px target and an 18px thumb centered inside a 24px
  track, positioned logically in RTL/LTR. Existing mutation/rollback stays intact.
- The supplied TikTok, Instagram and WhatsApp community links appear for guests,
  customers and admins, including the admin sidebar. Small menus show icons with
  accessible names; larger menus show text too. All external links open safely in
  a separate tab. Signed-in customers also have My Orders.
- Narrow storefront header fits account/cart/theme/language/menu controls; long
  menus scroll within the available viewport instead of going offscreen.

## Verification boundaries

The final combined tree passed all 12 `npm run verify` gates (exit 0): 748
application tests in 65 files, 203 tooling tests, and a clean production build.
Initial JavaScript is 199971/200000 gzip bytes; the budget was not increased.
The isolated browser suite passed all 28 checks (16 motion + 12 responsive),
including final switch contrast and social links in the admin sidebar.
Initial strict-lint errors in the new tests were fixed with explicit null guards.
No remote CI or hosted-account verification is claimed.

Isolated browser checks load real component markup exported by unit tests plus
the production CSS. All network requests are aborted; they use no user session
or local-preview navigation. They verify geometry, scrolling, both themes,
Arabic/English and 320/360/1280 widths. They do not prove hosted database behavior.

Reproduce with pinned Node on PATH in PowerShell:

```powershell
$env:EXPORT_UI_FIXTURES = '1'
npx vitest run src/components/layout/responsive-navigation.test.tsx
Remove-Item Env:EXPORT_UI_FIXTURES
npm run build
npx playwright test --config playwright.motion.config.ts
npm run verify
```

The browser config contains 16 motion checks and 12 responsive cases. Fixture
markup and screenshots are ignored under `.tools/layout-fixtures/`.

`db:reset` and `test:e2e` could not run: Docker's `dockerDesktopLinuxEngine` pipe
is absent. Start Docker Desktop and the approved local Supabase stack, then run
the database and E2E gates. Do not bypass the local-environment guard or run
against hosted Supabase. T-5.13/T-5.13b/T-5.13c remain doing until those gates and
review complete.

## Remaining owner request

Editable hero/category shortcuts, postal code persistence, customer notifications,
suggestions and profile photos remain unfinished database-dependent slices in
`docs/spec/owner-experience-change.md`. The QR image at `ip/ip.jpeg` visibly names
`alaa.ahm9624@instapay`, but its encoded payload has not been verified. A receiver
fallback correction alone does not update the hosted shop setting. Existing
settings upload still uses the public product-images bucket; privacy of the
setting does not make the file private. Review that with the payment amendment
before claiming the complete QR flow is fixed.

The prepared reset SQL defaults to rollback and deliberately refuses a reset
that would mutate the append-only stock ledger or leave owned Storage files.
It has not been executed or database-tested. It is not a guaranteed working
reset for a shop with stock history. Never disable those protections to force it.
