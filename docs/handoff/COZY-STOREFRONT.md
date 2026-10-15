# Cozy storefront integration handoff — 2026-10-15

Draft review: [PR #28](https://github.com/HassanG04/SaaS-lolys-shop/pull/28). Implementation checkpoints: `35df0a2` (loading/motion) and `eb703de` (art direction).

## Current objective

Complete the owner's warmer storefront, animations and loading-state request.
Work lives on `agent/T-3.09-cozy-storefront` in
`D:/Projects/Programming/الاء/.tools/cozy-storefront`, based on `7f9b21c` from
`agent/T-9.11-descriptive-analyses-and-analytics-page`.
The root checkout belongs to Anti-Gravity. Its working files have not been
overwritten. No main merge, deployment or dashboard changes were made.

## Completed

- Replaced the storefront/category arch with wide or square rounded frames.
- Bundled responsive decorative still-life artwork; catalogue images still
  come from the existing product/category data.
- Added warm section spacing, photo captions, ribbons and bilingual hero copy.
- Preserved public hero overrides and removed the invented default discount.
  Homepage payment badges now reflect enabled shop settings.
- Added shared localized catalogue skeletons, image load/error/source-change
  recovery, bow placeholders, gentle entrance/hover motion and reduced-motion CSS.
- Adjusted the mobile header after observing overflow at 360px.
- Added behavioural regressions for image loading, settings fallbacks, payment
  badges and loading-to-content transitions.

## Remaining

1. Combine with Anti-Gravity's foundation fixes only after they are committed.
   Keep this PR in draft until all gates and visual checks pass.
2. Resolve the existing initial-download budget failure on the combined branch.
   A clean archive of the unchanged base `7f9b21c` builds but measures **201,984
   gzip bytes**, above the unchanged **200,000-byte** gate. This independently
   confirms an inherited failure; it does not excuse the refreshed branch's gate.
3. Recheck all 360px/1280px × Arabic/English × light/dark combinations. Desktop
   Arabic light and English dark were observed. The mobile header fix remains
   visually unverified. Also exercise slow images and reduced motion.
4. Browser automation refused further access to the local preview under its URL
   security policy. No browser workaround was used. Continue visual QA when
   permitted browser access is available.
5. Verify the integrated build with `npm run verify` and the existing UI/e2e
   checks. Database, payment and hosted launch verification are outside this
   visual change and have not been claimed.

## Integration conflicts to preserve

| Path                                                             | Resolution                                                                                                                          |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/layout/Navbar.tsx`                               | Keep Anti-Gravity's extracted search/lazy-loading work and this branch's mobile spacing/wordmark fix; recheck 360px and 640–1024px. |
| `src/components/ui/LanguageToggle.tsx`                           | Keep a compact 44px-high control; do not reintroduce mobile overflow.                                                               |
| `src/components/ui/Skeleton.tsx`                                 | Use one pending animation, not both Tailwind pulse and `ui-skeleton`; keep reduced-motion behavior.                                 |
| `src/i18n/ar.json`, `src/i18n/en.json`                           | Preserve both sets of keys, including these new `hero` keys and Anti-Gravity's About/delivery changes.                              |
| `src/i18n/translations.ts`, `vite.config.ts`, cart and SEO files | This branch does not modify them; retain Anti-Gravity's optimizations.                                                              |
| `roadmap.md`, `.agent-state/project-progress.md`                 | Keep both agents' entries; T-3.09 and T-3.09b remain `doing` until their gates pass.                                                |

## Separate launch issue found during review

The base Home, Category and Search pages render `ProductCard` without an
`onAddToCart` handler; the card's existing click handler only calls that optional
callback. This is a source-review finding, not a reproduced live transaction.
Coordinate that existing shopping-flow gap with Anti-Gravity's cart work and
add a real catalogue-to-cart regression before launch. This visual PR does not
claim that the full shopping flow is ready.

## Evidence

See `../design/cozy-storefront.md` for the final gate table, asset provenance and
desktop screenshot. Local detailed logs live under the ignored `.tools/`
directory in the UI checkout. Remote CI has not been asserted as passing.

## Next exact command

From the UI checkout, using the Node version in `.nvmrc`:

```powershell
npm run verify
```

Then finish the listed visual checks and review the integration conflicts before
the owner chooses whether to merge. Do not merge or deploy automatically.
