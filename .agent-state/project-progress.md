# Shared project progress

Updated 2026-10-12 (Africa/Cairo). Codex isolated branch `agent/T-0.12-repository-security`.

```yaml
Current task: T-0.12 implemented in PR 18; owner workflow review pending.
Completed:
  - Private reporting policy and security.txt use the owner-approved temporary mailbox (H-14).
  - CODEOWNERS protects sensitive paths, tooling, scanner exceptions and dependency manifests.
  - Dependabot weekly npm/Actions/pip configuration parses and matches the required ecosystems.
  - Read-only secrets CI job installs checksum-pinned Gitleaks 8.30.1 and scans full Git history.
  - Three scanner tests pass: fake-token/history rejection with redacted output, environment-name rejection, and unavailable-scanner failure.
  - Reviewed three historical mock-value false positives; exceptions use exact commit/file/rule/line fingerprints only.
  - Remote rejection proved at 74cbc22 in run 38176155631: scanner installation and tests succeeded; only the history scan rejected the synthetic runner commit. The temporary probe is now removed.
Files changed:
  - SECURITY.md, public/.well-known/security.txt, .github/CODEOWNERS, .github/dependabot.yml
  - .github/workflows/ci.yml, .gitleaksignore, scripts/check-history-secrets.mjs, scripts/test-gitleaks.mjs
  - roadmap.md, .agent-state/project-progress.md, HANDOVER_TO_ANTI_GRAVITY.md
Tests executed:
  - Real Windows Gitleaks rejection tests passed; archive checksum verified against official release metadata.
  - Dependabot and CI YAML parsed with the installed js-yaml dependency; required settings validated.
  - Full npm run verify passed: 55 app + 111 tooling tests, lint/format/types/build, migration/secret/bundle guards. Three additional real-scanner tests passed locally and on Linux CI.
Problems found:
  - Historical mock MFA and environment-validation values triggered generic-api-key; exact reviewed exclusions added.
  - Owner workflow review and final remote recovery checks remain pending; PR https://github.com/HassanG04/lolys/pull/18 is stacked on PR 17.
Next action: Read final PR 18 checks; owner reviews and integrates the stacked PRs. Preserve Anti-Gravity's newer application stack; do not merge or deploy.
```

## Previous session

Updated 2026-10-11 (Africa/Cairo). Codex working alongside Anti-Gravity.

```yaml
Current task: T-1.09b verified and published in PR 17; owner workflow review pending.
Completed:
  - PR 15 secret guard and PR 16 bundle guard are ready for review; final PR 16 checks passed at 08c18b3 in run 38135882538.
  - Owner confirmed no hosted Supabase project exists. Prepared .agent-state/cloud-database.md with owner setup and remaining deployment gates.
  - Split the independently testable migration guard from T-1.09; original database/type/PR acceptance remains there. Anti-Gravity has since published its cumulative stack through T-8.01 at 7986020; its original checkout is clean.
  - Guard compares HEAD, index and working files against origin/main; push CI uses the pre-push commit. Missing history fails; new migrations remain editable.
Files changed:
  - scripts/check-migrations.mjs
  - scripts/check-migrations.test.mjs
  - scripts/pending.mjs
  - package.json
  - .github/workflows/ci.yml
  - roadmap.md
  - .agent-state/project-progress.md
  - .agent-state/cloud-database.md
  - HANDOVER_TO_ANTI_GRAVITY.md
Tests executed:
  - Five real-Git tests pass: additions, staged/unstaged/committed edits, restoration, renames/deletions, pre-push protection, missing history and Windows line endings.
  - Full verify passes with 55 app + 111 tooling tests (166 total), migration/token guards, lint, formatting, TypeScript, production build, preview exclusion, secret and bundle guards. Roadmap validates 121 tasks.
  - All four PR 17 checks pass at 697e8c5 in run 38137004058. Cloud remains unprovisioned; no remote database verification is claimed.
Problems found:
  - No cloud deployment is available yet. T-1.09 database CI, T-1.12 deployment workflows, and human-owned T-1.11/T-1.13 remain open.
  - This branch stacks on PR 16. No Supabase command, database reset or remote deployment ran. Workflow changes require owner review; no agent merge.
  - The earlier automatic approval-review usage failure is resolved; the retry committed and pushed successfully.
Next action: Owner reviews PRs 15, 16 and 17 in order. Reconcile the published Anti-Gravity stack with current main/guards on an implementation branch, preserving its newer dependencies and npm checks; then complete T-1.09 database CI and T-1.12 deployment workflows. Owner creates shop-staging using the cloud checklist.
```

## Previous session: main integration

Updated 2026-10-11 (Africa/Cairo). Codex main integration completed.

```yaml
Current task: Published foundation/UI stack integrated into main; branch protection remains blocked by the GitHub plan.
Completed:
  - Confirmed all 12 implementation PR heads have passing static, unit, build and roadmap checks and form one cumulative stack ending at bbc77ac.
  - Combined the published stack and README work in an isolated worktree; Anti-Gravity's active checkout and uncommitted Phase 2 work were not changed.
  - Added the supplied Lolys JPEG to the README, preserved byte-for-byte, and restored working local setup and relative specification links.
  - Enabled squash-only merges and automatic merged-branch deletion in GitHub.
  - Squash-merged PR 13 as f5e36db225676191679e1ffacf67245811314dc5 after all four final PR checks passed.
  - Confirmed main exactly matches the verified integration tree and all four post-merge main checks pass.
  - Closed PRs 1-12 as superseded and removed their unchanged remote heads with lease-protected deletion. GitHub automatically removed the PR 13 branch; the remote inventory then contained only main and no open PRs.
  - Fast-forwarded the inactive local main reference. All other local branches and Anti-Gravity's active checkout were preserved.
Files changed:
  - README.md
  - docs/design/brand/README.md
  - docs/design/brand/lolys.jpeg
  - .agent-state/project-progress.md
  - .agent-state/main-integration.md
  - HANDOVER_TO_ANTI_GRAVITY.md
  - roadmap.md
Tests executed:
  - npm ci --ignore-scripts succeeded in the isolated worktree; audit reported zero vulnerabilities.
  - Fresh npm run verify passed with 55 application tests and 97 tooling tests (152 total), token/lint/format/type checks, production build and preview exclusion.
  - Roadmap validation passed with 119 tasks; all 12 source heads are ancestors of the cumulative stack; application and workflow contents are unchanged.
  - Integration-authored whitespace checks and exact logo hash comparison passed.
  - Final PR CI passed at 78b821d (run 38103273443); post-merge main CI passed at f5e36db (run 38103367870).
Problems found:
  - GitHub refused branch protection with HTTP 403 because this private repository requires GitHub Pro. T-0.10 remains incomplete; do not claim main is protected.
  - Published UI acceptance notes retain outstanding browser evidence; merging does not mark those tasks or production readiness complete.
  - Main does not yet include Anti-Gravity's newer local database and Phase 2 work; its checkout had advanced to agent/T-2.02-routing-and-layout during integration.
Next action: Anti-Gravity continues its active task, then merges origin/main into its branch after committing its work. Owner upgrades the private repository's plan before T-0.10 protection can be completed.
```

The owner explicitly authorized branch updates and main merges in this session,
overriding the earlier no-agent-merge rule for this integration. No deployment
or paid account change is authorized. See [integration record](main-integration.md).

## Historical published implementation snapshot (2026-10-10)

The following record is preserved for provenance. Its old Docker, branch and PR
status statements are historical; consult the active implementation checkout for
Anti-Gravity's newer local work.

Updated 2026-10-10 (Africa/Cairo). Active: Codex, reviewing Anti-Gravity's handover.

```yaml
Current task: T-0.08j compact login/register preview implemented and verified
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
  - Compact form polish: npm run verify passes with 55 app + 97 tooling tests (152 total); token scan, lint, formatting, typecheck, production build and preview exclusion pass.
  - PR 11 at e8774dd passes all four GitHub jobs in run 38081581119; no merge or deployment.
  - Latest npm run verify passes with 54 app + 97 tooling tests (151 total); 12 language cases include saved/device/blocked-storage choices, keyboard persistence, theme independence, key parity and Arabic errors.
  - PR 8 at 6c18be3, PR 9 at 4ac7126 and PR 10 at 8a6786d each have all four GitHub jobs green (runs 38081096113, 38081098408, 38081350854).
  - Compact forms are on agent/T-0.08j-compact-forms; review PR follows.
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
Next action: Review PR 12. T-0.08j remains doing until its T-0.08i visual dependency is accepted; owner workflow review and Docker remain open.
```

Repository: https://github.com/HassanG04/lolys. Foundation PR:
https://github.com/HassanG04/lolys/pull/1. No main push, merge or deployment.
Theme PR: https://github.com/HassanG04/lolys/pull/2 (stacked on PR 1).
UI actions PR: https://github.com/HassanG04/lolys/pull/3 (stacked on PR 2).
Text fields PR: https://github.com/HassanG04/lolys/pull/4 (stacked on PR 3).
Choice controls PR: https://github.com/HassanG04/lolys/pull/5 (stacked on PR 4).
Feedback PR: https://github.com/HassanG04/lolys/pull/6 (stacked on PR 5).
Dialog PR: https://github.com/HassanG04/lolys/pull/7 (stacked on PR 6).
Ornaments, guard, bilingual and language-test draft PRs: #8, #9, #10, #11 (stacked in that order).
Current branch: agent/T-0.08i-language-verification. See HANDOVER_TO_ANTI_GRAVITY.md for exact commands and the complete changed-file inventory.

Use Node 24.21.0 from `.nvmrc`; local runtime is
`.tools/node-v24.21.0-win-x64`. Install with `npm ci --ignore-scripts`.

The older October 9 snapshot is `.tools/anti-gravity-20261010/` with
`checkpoint-manifest.json` and `deferred-files.json`. The 27 deferred files were
removed from this task's working tree only after hash verification. Their
original contents are recoverable there. Shared-file changes also remain in
that snapshot. Restore selectively for T-0.08, T-0.09 and T-0.12, never copy old
package.json, roadmap, App or workflow over newer verified work wholesale.

The latest October 10 incoming work is preserved as commits 6c18be3 / a47889f / 96ad75f on agent/T-0.08d-labels-ornaments.

Read `.agent-state/anti-gravity-review.md` for concrete findings before resuming
those tasks. `HANDOVER_TO_CODEX.md` is the preserved incoming report, not current
verification evidence. The older `.tools/anti-gravity-t007-checkpoint/` is retained
for provenance; do not restore it over the newer implementation.
