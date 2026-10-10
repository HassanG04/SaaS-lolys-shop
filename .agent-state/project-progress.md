# Shared project progress

Updated 2026-10-10 (Africa/Cairo). Active: Codex, reviewing Anti-Gravity's handover.

```yaml
Current task: T-0.08i implementation verified; publishing review and continuation record
Completed:
  - Anti-Gravity reports UI-kit and native-dialog browser checks; complete viewport/theme/direction/reduced-motion evidence is still needed for T-0.08e.
  - T-0.08e guard repair is published in draft PR 9; ornaments are preserved in draft PR 8. Final acceptance remains open.
  - T-1.01: Explored, but formally blocked due to missing Docker environment on this host (H-08).
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
  - Draft UI actions PR 3 published at 0ba979e, stacked on theme PR 2.
  - All four UI actions jobs passed at 0ba979e (run 38023041519).
  - Published the previously local handover commit afd97fe to PR 3; GitHub DNS recovered.
  - Added labelled Input, SearchInput, Select and Textarea; native values/ref/disabled behavior and description IDs tested.
  - Split Checkbox/Radio into T-0.08f; their prepared source is in .tools/form-choice-draft, not discarded.
  - Text-field draft PR 4 published at 3aab682; all four jobs green in run 38028479207.
  - Restored/repaired Checkbox/Radio using native inputs, visible selection marks, 44px minimum dimensions and forced-colors fallback.
  - Choice draft PR 5 published at a0708bc; all four jobs green in run 38028693736.
  - Choice handover commit 5e0ba81 also passes all four jobs in run 38028772831.
  - Added tabs and notifications with Arabic previews; dialog draft preserved for T-0.08g in .tools/feedback-dialog-draft.
  - Feedback draft PR 6 published at 68e506e; all four jobs green in run 38071233956.
  - Feedback documentation 22effa5 also passes all four jobs in run 38071382759.
  - Replaced the dialog draft with a controlled native modal, Arabic labels, lifecycle cleanup and four preview instances. No non-modal fallback or custom focus traversal remains.
  - Dialog draft PR 7 published at a49d87c; all four jobs green in run 38071645439.
  - Dialog handover e5d498b also passes all four jobs in run 38071760275.
  - Owner resolved OD-002: pearls bounce only while loading, static for reduced motion; design spec updated.
Files changed:
  - Branch agent/T-0.08d-labels-ornaments is based on dialog PR 7 at e5d498b.
  - This slice adds Tabs, Toast, feedback.test.tsx and FeedbackExamples; updates kit, Arabic copy, CSS, roadmap and continuation/PR docs.
  - Dialog slice adds Dialog, dialog.test.tsx and DialogExample; updates kit, Arabic copy, CSS, roadmap and continuation/PR docs.
  - Theme components, tokens, fonts/licenses, tests, dependency pins, roadmap and review notes.
  - Icon follow-up changes ThemeToggle.tsx, theme.test.tsx, ar.json and continuation/PR documentation.
  - UI actions add three components, actions.test.tsx, src/dev/KitPage.tsx and its local SVG fixture, src/styles/ui.css; update App, Arabic copy, tokens and handover/PR/roadmap docs.
  - Text fields add Field, Input, Select, Textarea, SearchInput, forms.test.tsx and FormExamples; update kit, CSS, Arabic copy and continuation/PR/roadmap docs.
  - Choice controls add Choice, Checkbox, Radio, choices.test.tsx and ChoiceExamples; update form preview, CSS, Arabic copy and continuation/PR/roadmap docs.
Tests executed:
  - Latest npm run verify passes with 54 app + 97 tooling tests (151 total); 12 language cases include saved/device/blocked-storage choices, keyboard persistence, theme independence, key parity and Arabic errors.
  - PR 8 at 6c18be3, PR 9 at 4ac7126 and PR 10 at 8a6786d each have all four GitHub jobs green (runs 38081096113, 38081098408, 38081350854).
  - Review repair: npm run verify passes with 42 app + 97 tooling tests; build preview guard and token negative fixtures pass. Use npm_config_script_shell=C:\Windows\System32\cmd.exe on this host to bypass profile startup issues.
  - Incoming Anti-Gravity verify passed (13 app tests, 27 tooling tests); review found requirements not covered by those tests.
  - Exact theme dependency installation passed, zero vulnerabilities reported.
  - Repaired implementation verify passed (10 app tests + 66 tooling tests), including 31 contrast pairs.
  - Both themes passed at 360/1280 in RTL/LTR; keyboard focus, 44px minimum and saved reload checked.
  - Final local verify and 110-task roadmap validation pass after the browser-driven CSS fix.
  - Icon follow-up verify passes (76 tests), build, roadmap and remote CI pass.
  - UI actions verify passes (16 app + 66 tooling tests); production route/copy/fixture exclusion, 114-task roadmap and all four PR checks pass.
  - Text fields verify passes (21 app + 66 tooling tests), production exclusion passes, 115-task roadmap valid; all four PR jobs pass.
  - Five choice behavior tests pass, including both directions, native reset, controlled/disabled states and isolated groups.
  - Full choice verify passes: 26 app + 66 tooling tests (92 total), production build/exclusion and 115-task roadmap pass.
  - Feedback verify passes: 34 app + 66 tooling tests (100 total), production build and 116-task roadmap pass. Browser verification remains open.
  - Dialog verify passes: 36 app + 66 tooling tests (102 total), production build and 116-task roadmap pass. Dialog tests cover closed markup/event contracts only; native modality, focus and Escape are unverified.
Problems found:
  - Earlier approval-service usage limit interrupted verification; subsequent local checks ran successfully.
  - Later UI kit/guards/security drafts did not meet all criteria; statuses corrected to todo with review notes.
  - Owner workflow review and human-owned infrastructure setup remain pending.
  - Docker absent; do not claim database verification or production readiness.
  - Browser URL policy rejected the local preview during icon review; no workaround attempted. Prior screenshots show the text-toggle version.
  - Installed jsdom lacks native dialog methods. T-0.08g must not substitute mocked methods for focus/inert/Escape verification or fall back to a non-modal window.
Next action: Record complete UI acceptance evidence for T-0.08e/h/i in a permitted browser session; obtain owner workflow review (T-0.06) and Docker (H-08) before gated tasks. Do not mark these gates complete without evidence.
```

Repository: https://github.com/HassanG04/lolys. Foundation PR:
https://github.com/HassanG04/lolys/pull/1. No main push, merge or deployment.
Theme PR: https://github.com/HassanG04/lolys/pull/2 (stacked on PR 1).
UI actions PR: https://github.com/HassanG04/lolys/pull/3 (stacked on PR 2).
Text fields PR: https://github.com/HassanG04/lolys/pull/4 (stacked on PR 3).
Choice controls PR: https://github.com/HassanG04/lolys/pull/5 (stacked on PR 4).
Feedback PR: https://github.com/HassanG04/lolys/pull/6 (stacked on PR 5).
Dialog PR: https://github.com/HassanG04/lolys/pull/7 (stacked on PR 6).

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
