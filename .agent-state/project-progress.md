# Shared project progress

Updated 2026-10-10 (Africa/Cairo). Active: Codex, reviewing Anti-Gravity's handover.

```yaml
Current task: T-0.08 UI actions/cards; implementation complete, visual review and PR checks pending
Completed:
  - Foundation PR 1 published; all four jobs green at b4faa49, including verified lint rejection probe.
  - T-0.01 to T-0.05 verified; T-0.06 implementation verified, owner workflow review pending.
  - Preserved all 53 incoming Anti-Gravity files with SHA-256 hashes.
  - Repaired theme behavior and expanded tests to every documented contrast pair and storage/system cases.
  - Theme PR 2 published; all four jobs green at 7d7fcbf in run 38021668187. Both theme tasks set done.
  - Documentation follow-up 4b56b05 also has four green jobs (run 38021821418).
  - Owner requested icons instead of visible theme text; added crescent/sun SVGs with Arabic accessible name and action tooltip.
  - Icon follow-up e34b6c2 passes all four CI jobs (run 38022228681).
  - Split UI kit into T-0.08 through T-0.08e, preserving its requirements and downstream dependencies.
  - Added Button, IconButton, Card/CardImage and development-only previews; native form/keyboard behavior, required icon labels and directional mirroring tested.
Files changed:
  - Branch agent/T-0.08-ui-actions is based on theme PR 2 at e34b6c2.
  - Theme components, tokens, fonts/licenses, tests, dependency pins, roadmap and review notes.
  - Icon follow-up changes ThemeToggle.tsx, theme.test.tsx, ar.json and continuation/PR documentation.
  - UI actions add three components, actions.test.tsx, src/dev/KitPage.tsx and its local SVG fixture, src/styles/ui.css; update App, Arabic copy, tokens and handover/PR/roadmap docs.
Tests executed:
  - Incoming Anti-Gravity verify passed (13 app tests, 27 tooling tests); review found requirements not covered by those tests.
  - Exact theme dependency installation passed, zero vulnerabilities reported.
  - Repaired implementation verify passed (10 app tests + 66 tooling tests), including 31 contrast pairs.
  - Both themes passed at 360/1280 in RTL/LTR; keyboard focus, 44px minimum and saved reload checked.
  - Final local verify and 110-task roadmap validation pass after the browser-driven CSS fix.
  - Icon follow-up verify passes (76 tests), build, roadmap and remote CI pass.
  - UI actions verify passes (16 app + 66 tooling tests); production route/copy/fixture exclusion and 114-task roadmap pass; PR checks pending.
Problems found:
  - Later UI kit/guards/security drafts did not meet all criteria; statuses corrected to todo with review notes.
  - Owner workflow review and human-owned infrastructure setup remain pending.
  - Docker absent; do not claim database verification or production readiness.
  - Browser URL policy rejected the local preview during icon review; no workaround attempted. Prior screenshots show the text-toggle version.
Next action: Finish T-0.08 PR and read CI; keep doing until actual browser checks pass. Then T-0.08b form controls, using the preserved drafts and review findings.
```

Repository: https://github.com/HassanG04/lolys. Foundation PR:
https://github.com/HassanG04/lolys/pull/1. No main push, merge or deployment.
Theme PR: https://github.com/HassanG04/lolys/pull/2 (stacked on PR 1).

Use Node 24.21.0 from `.nvmrc`; local runtime is
`.tools/node-v24.21.0-win-x64`. Install with `npm ci --ignore-scripts`.

The latest incoming snapshot is `.tools/anti-gravity-20261010/` with
`checkpoint-manifest.json` and `deferred-files.json`. The 27 deferred files were
removed from this task's working tree only after hash verification. Their
original contents are recoverable there. Shared-file changes also remain in
that snapshot. Restore selectively for T-0.08, T-0.09 and T-0.12, never copy old
package.json, roadmap, App or workflow over newer verified work wholesale.

Read `.agent-state/anti-gravity-review.md` for concrete findings before resuming
those tasks. `HANDOVER_TO_CODEX.md` is the preserved incoming report, not current
verification evidence. The older `.tools/anti-gravity-t007-checkpoint/` is retained
for provenance; do not restore it over the newer implementation.
