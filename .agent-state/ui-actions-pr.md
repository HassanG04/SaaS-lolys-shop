# T-0.08: Accessible actions and cards

Adds the documented button variants, icon actions and cards. Buttons default to
non-submitting actions, retain native keyboard/disabled/form behavior and accept
refs. Icon actions require an accessible label and mirror only directional art.
Card movement respects reduced motion; all colors, shapes and depth use tokens.

`/__kit` previews these components in light/dark and RTL/LTR. Its code, copy and
local image fixture are excluded from production. No extra dependencies.
The remaining original UI-kit requirements are retained in T-0.08b–T-0.08e.
This draft is stacked on theme PR #2 and does not merge or deploy anything.

## Validation

- `npm run verify`: lint, format, strict types, 16 app tests, 66 tooling tests and build pass.
- Tests cover Enter/Space, safe default form behavior, explicit submit, disabled
  activation, refs, icon labels/mirroring and semantic card/image rendering.
- Roadmap validates 114 tasks; production artifact inspection confirms kit route/code/copy/fixture exclusion.
- [All four remote checks passed](https://github.com/HassanG04/lolys/actions/runs/38023041519)
  on implementation commit `0ba979ea16caaa66ef22410366823fc2224e7b9d`.
- Browser URL policy blocked local preview access. The 360/1280 visual, focus,
  touch-target and reduced-motion checks remain outstanding; task stays `doing`.

No security-sensitive paths, dependencies, database/auth changes or live services
are included. Component token aliases reuse the supplied design values.
