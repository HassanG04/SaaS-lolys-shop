# Review of the 2026-10-09 Anti-Gravity handover

Reviewed 2026-10-10. The complete incoming changes are preserved, with SHA-256
hashes, in `.tools/anti-gravity-20261010/checkpoint-manifest.json`. Deferred file
paths are in `deferred-files.json`. No source was discarded.

The incoming `npm ci --ignore-scripts` and `npm run verify` passed: 13 application
tests, 27 tooling tests, and build. Passing those tests did not cover every task
criterion. Status corrections are recorded in the roadmap work log.

## T-0.07: theme review

- Only two light contrast pairs were tested. All published pairs need checks.
- First click on a system-dark theme selected dark again instead of light.
- Browser storage denial crashed initialization; system changes were not observed.
- Tailwind dark variants used media preference rather than `data-theme`.
- Nested light previews inherited dark values; alias tokens need inline mapping.
- Toggle was absent from the app, under 44px, and lacked the specified focus style.
- Font license files and the complete typography scale were missing.

## T-0.08: deferred UI kit review

- The production build emitted `KitPage-Bwjjpmto.js` (43.80 kB). The unconditional
  lazy import defeats the required exclusion of the development kit.
- Dialog lacks an accessible name, focus containment, Escape handling and focus
  restoration. Tabs lack keyboard navigation and create duplicate IDs in the kit.
- Checkboxes/radios have 24px targets; selected state relies on color alone.
- Some controls lack labels; `error` does not set `aria-invalid` on Input.
- Ornaments animate without reduced-motion handling; arch radius is inline.
- Kit uses hard-coded English strings and an external placeholder image.
- No token-usage guard in verify; rendering-only tests omit several components.
- Three extra dependencies have no ADR or exact pins; reassess before restoring.

## T-0.09: deferred repository guards

- Secret scanner exempts whole documentation files from real key/JWT detection,
  ignores file-read failures and Git failure, and does not exclude environment files.
- Scan runs before the build, so newly emitted artifacts are not scanned.
- Bundle guard silently ignores missing scripts and admin-named initial scripts;
  it omits statically imported chunks and module preloads from the budget.
- Add negative fixtures and fail-closed checks before claiming verification.

## T-0.12: deferred security configuration

- Gitleaks action uses a mutable version tag rather than a full SHA.
- The required planted-secret red/green CI test has not run on this change.
- Validate the private reporting route and its owner-owned prerequisite instead
  of claiming dashboard features are enabled. Deployment target is Cloudflare
  Pages, not Vercel. Owner setup remains separate from agent implementation.

Foundation PR 1 has four green checks at `b4faa49`; its workflow owner review is
still pending. These later drafts were never included in that CI run.
