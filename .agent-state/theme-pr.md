# T-0.07 / T-0.07b: Brand tokens, fonts and reliable Arabic theme switching

Adds the documented light and cocoa-night themes with local Cairo/Aref Ruqaa
fonts and their licenses. A crescent/sun icon toggle with Arabic accessibility
text follows the system preference until
the visitor chooses a theme, persists that choice, initializes before first
paint and continues working when browser storage is unavailable.

This PR is based on foundation PR #1, not main. It includes the two small tasks
split from T-0.07 under the roadmap's review-size rule. T-0.08 UI kit, T-0.09
repository guards and T-0.12 security configuration remain checkpointed for
separate review; the supplied design values and product requirements are unchanged.

## Validation

- `npm ci --ignore-scripts`: exact pins, zero vulnerabilities reported.
- `npm run verify`: lint, format, strict types, 10 app tests, 66 tooling tests
  and production build pass. Tests recompute all 31 documented contrast pairs.
- `npm run roadmap:check`: all 110 tasks valid.
- Browser: both themes at 360px and 1280px, RTL and LTR; no horizontal overflow.
  Original text toggle was 132.95 × 47.75px with a 44px minimum, Cairo at 17px, and a 2px focus
  outline with a 2px offset. Keyboard toggling and persisted reload checked.
- Tests cover saved/system preferences, system updates, invalid/blocked storage,
  cross-tab updates and the pre-paint script. Browser console has no warnings/errors.
- Production output contains the theme app only; no development UI-kit chunk.
- [All four remote checks passed](https://github.com/HassanG04/lolys/actions/runs/38021668187)
  on theme implementation commit `7d7fcbf12693874eb53a8c86cf8786eb274f5902`.
- The documentation follow-up also passed all four checks at `4b56b05`
  ([run](https://github.com/HassanG04/lolys/actions/runs/38021821418)).
- Owner-requested icon follow-up: local verify and all 76 tests pass; accessible
  name, pressed state and action tooltip are retained. Browser URL policy blocked
  a fresh local visual check; screenshots below predate the icon change.
  All four remote jobs passed at `e34b6c2` ([run](https://github.com/HassanG04/lolys/actions/runs/38022228681)).

Screenshots and the eight browser measurements are in `.agent-state/theme-*.jpg`
and `.agent-state/theme-browser-checks.json`.

## Review notes and remaining scope

The app is still a foundation with a theme toggle, not a storefront. The full
i18n runtime is scheduled for T-2.03; theme copy already lives in `ar.json`.
Inline theme initialization needs inclusion in the future CSP work (T-7.04).
No secrets, auth/database/payment logic, deployment or dashboard changes are
included. SEC-16 exact dependency pins retained. Foundation workflow owner review
remains outstanding; agents do not merge or deploy.

The incoming Anti-Gravity report is preserved as provenance. Its completion
claims are superseded by the review and corrected roadmap statuses; see
`.agent-state/anti-gravity-review.md` for deferred defects and checkpoint recovery.
