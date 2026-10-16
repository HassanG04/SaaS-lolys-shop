# Current handover — responsive repairs — 2026-10-17

This section supersedes the historical handover below. Continue the root checkout
on `agent/T-5.13d-responsive-evidence`; do not restart from the old integration
worktree. Read `.agent-state/project-progress.md`, `git status`, `git diff` and
`docs/handoff/RESPONSIVE-REPAIR.md` first.

Current objective: review the verified mobile navigation/switch repairs and
continue remaining owner experience changes without weakening MFA/RLS.

Completed checkpoints: `52dfb0b` MFA; `a561e3c` admin workspace; `5580295`
review navigation; `169b452` responsive implementation. Regression evidence is
on the current child branch. Full verify passed (748 app + 203 tooling), all
28 isolated browser checks passed; no DB/remote/launch success is implied.

Current files: `src/components/layout/{Layout,Navbar,NavbarQuickMenu,SocialMenuLinks}.tsx`,
`src/components/ui/ToggleSwitch.tsx`, `src/features/admin/{AdminHeader,AdminShell,AdminSidebar}.tsx`,
`src/features/admin/products/ProductsPage.tsx`, `src/styles/ui.css`, `src/i18n/{ar,en}.json`,
`src/components/layout/responsive-navigation.test.tsx`, `e2e/ui/responsive.spec.ts`,
`playwright.motion.config.ts`, `docs/spec/owner-experience-change.md`,
`docs/handoff/RESPONSIVE-REPAIR.md`, `roadmap.md`, `.agent-state/project-progress.md`
and this handover. Prior checkpoints retain their own file lists in Git.

Current error: database reset/E2E setup cannot connect to
`dockerDesktopLinuxEngine` (pipe absent). Expected: local Docker/Supabase ready.
Actual: no database tests execute. Possible cause: Docker Desktop is stopped.
No cloud workaround is authorized.

Next exact command after Docker Desktop is available (pinned Node on PATH):
`npm run db:reset`. Then run database tests and database-backed E2E; stop if the
local stack guard fails. Do not repeat the completed UI checks without a change
or new concern. Fixture commands are in `docs/handoff/RESPONSIVE-REPAIR.md`.
No merge, deployment or data reset. Retain reduced-motion support and owner MFA
decision: verified sessions persist; fresh login after logout requires MFA.

---

# Historical database integration handover — 2026-10-15

## Current Objective

Prepare `agent/T-1.09-database-integration` from main `4dfb26c` in
`D:/Projects/Programming/الاء/.tools/merge-day-plan`. Do not switch or reset the
root analytics checkout. This supersedes the static-analysis continuation below.

## Completed

Database-only extraction through cfac9d5, owner-role/audit fixes, isolated local
stack, DB CI, 259 passing pgTAP assertions, five negative probes and recovery,
real blocked-buyer concurrency proof, deterministic regenerated types. Full verify passed: 57
application tests and 114 tooling tests, plus lint, formatting, types, build and guards. Detailed files and
evidence are in shared progress and `docs/handoff/DATABASE-INTEGRATION.md`.

## Remaining

At `4c04816`, all seven implemented checks and the preview passed. The owner
explicitly authorized the main merge on 2026-10-15. The normal merge API refused
it with HTTP 405: one approving review from a write-access reviewer is required,
and required status check `e2e` is expected. Main remains `4dfb26c`; PR26 is open.
Prepare the actual application/E2E integration and obtain an eligible GitHub
review before retrying the authorized merge. Do not bypass or weaken gates, or
import held payment branches before they satisfy the amendment.

The owner's payment QR is `D:/Projects/Programming/الاء/ip/ip.jpeg`, not `ip.png`.
Its QR payload decodes to an InstaPay link matching the supplied recipient.
See the asset receipt in `docs/handoff/DATABASE-INTEGRATION.md`. It has not been
uploaded or configured in cloud settings. Use the supplied QR through the
reviewed admin settings flow; do not invent a per-order QR payload or publish
payment details in frontend defaults.

## Current Files

The latest follow-up changes only `.agent-state/project-progress.md`, this
handover, `docs/handoff/DATABASE-INTEGRATION.md` and `roadmap.md`. Earlier database
implementation files are listed in shared progress. Preserve root analytics
work and the owner's untracked `ip/` folder.

## Current Error

Error: GitHub merge API HTTP 405, repository rule violations.
Expected: squash-merge verified PR26 after the owner's explicit authorization.
Actual: no merge; one write-access approving review and the `e2e` check are missing.
Cause: the rule requires application E2E before that implementation reaches this
database-only branch; chat approval does not create a GitHub PR review.
No known database test failure; all seven implemented remote checks passed.

## Next Exact Command

```powershell
$env:Path='D:\Projects\Programming\الاء\.tools\node-v24.21.0-win-x64;'+$env:Path
$env:npm_config_script_shell='C:\Windows\System32\cmd.exe'
$env:VITEST_MAX_WORKERS='2'
Set-Location -LiteralPath 'D:\Projects\Programming\الاء\.tools\merge-day-plan'
npm run verify
```

## Historical handover — 2026-10-13

## Current Objective

Finish T-7.06 on `agent/T-7.06-semgrep`, stacked on repository-security PR 18.
Your app is at 56529b3 (T-5.04); next app task is T-5.05. Its checkout is untouched.

## Completed / Remaining

Seven project rules plus maintained TypeScript/React packs, a digest-pinned
read-only `sast` workflow, redacted scanner runner and real-binary fixtures.
Both source trees scanned without high findings. Real-scanner fixtures pass;
PR checks are pending. Owner workflow review remains required.
Preserve your newer application/dependencies when integrating this tooling patch.

## Current Files

`.semgrep/project.yml`, `.semgrep/README.md`, `.semgrepignore`,
`.github/workflows/sast.yml`, `.github/CODEOWNERS`, `scripts/check-sast.mjs`,
`scripts/test-semgrep.mjs`, `roadmap.md`, `.agent-state/project-progress.md`,
`.agent-state/sast-pr.md`, `HANDOVER_TO_ANTI_GRAVITY.md`.

## Current Error

No known application scan finding. Expected: fixture and remote PR verification.
Actual: local verify and fixtures pass; PR checks pending. Parser prefiltering and
cross-function taint limits are documented; lint/typecheck and error tests remain.

## Next Exact Command

`git status --short --branch` then read this handover, progress and the PR checks.
Run `node --test scripts/test-semgrep.mjs` with Semgrep 1.179.0 on PATH.
No agent merges, cloud deployments or dashboard changes.

# Previous repository-security handover — 2026-10-12

## Current Objective

T-0.12 on `agent/T-0.12-repository-security`, stacked on migration guard PR 17.
Your published application stack through T-8.01 is unchanged.

## Completed / Remaining

Implemented private email reporting using the owner-approved temporary mailbox,
security.txt, owner review rules, weekly dependency updates, and checksum-pinned
Gitleaks with three real-binary tests. Read progress for final verification/PR
evidence. Owner workflow review remains required (SEC-15, SEC-16, SEC-24).
PR 18 is open. Full verify passes (166 tests) plus three scanner tests. CI run
38176155631 proves rejection on a synthetic runner-only commit; the probe has
been removed. All five clean-head jobs passed at b2da8dc in run 38176275898.
The next independent task in this checkout is T-7.06 (Semgrep).
No main merge, dashboard action or cloud deployment is authorized for agents.

## Current Files

`SECURITY.md`, `public/.well-known/security.txt`, `.github/CODEOWNERS`,
`.github/dependabot.yml`, `.github/workflows/ci.yml`, `.gitleaksignore`,
`scripts/check-history-secrets.mjs`, `scripts/test-gitleaks.mjs`, `roadmap.md`,
`.agent-state/project-progress.md`, `HANDOVER_TO_ANTI_GRAVITY.md`.

## Current Error

No failing implementation check remains. Expected next: owner workflow review.
History scanning found three false positives in your historical unit tests.
They are mock values, not operational credentials; exact fingerprint exceptions
are documented in `.gitleaksignore`. Do not replace these with broad exclusions.
GitHub private reporting is unavailable for this private repo; use H-14 email.

## Next Exact Command

`git status --short --branch` — then read progress and PR checks before integrating.
Preserve your newer app dependencies and migrations when reconciling guard work.

# Previous cloud-prerequisite handover — 2026-10-11

## Current Objective

T-1.09b migration protection on `agent/T-1.09b-migration-guard`, stacked on PR 16.
The owner confirmed there is no cloud project yet. Setup checklist and remaining
cloud gates are in `.agent-state/cloud-database.md`. Your newer T-8.01 stack at
7986020 is published and remains separate from this older application tree.

## Completed / Remaining

Git-based append-only guard and five rejection/recovery tests are implemented.
PR 17: all four checks passed at 697e8c5, run 38137004058; 166 local tests pass.
Local/CI wiring preserves existing checks. Full verification and publication are
recorded in project-progress.md. Owner workflow review remains necessary.
T-1.09 still owns database CI and type checks; T-1.12 still owns deployment
workflows. No schema, Supabase commands, resets or cloud deployment were run.

## Current Files

`scripts/check-migrations.mjs`, `scripts/check-migrations.test.mjs`,
`scripts/pending.mjs`, `package.json`, `.github/workflows/ci.yml`, `roadmap.md`,
`.agent-state/project-progress.md`, `.agent-state/cloud-database.md`,
`HANDOVER_TO_ANTI_GRAVITY.md`; the original checkout's coordination notice only.

## Current Error

No known implementation failure. Cloud remains unprovisioned; expected next is
owner-created staging plus reviewed database CI/deployment workflows.
The approval-service usage-limit failure was retried successfully; no bypass.

## Next Exact Command

`git status --short --branch` — read progress before any branch integration.
Preserve your newer dependencies and migrations; never replace them with this
older app tree. Main merges and cloud deployment remain owner-controlled.

# Previous guard handover — 2026-10-11

## Current Objective

T-0.09b is implemented on `agent/T-0.09b-bundle-guard` in the isolated
`C:/Users/Hassan-PC/.codex/worktrees/main-polish/الاء` checkout. Preserve your
active T-5.01 checkout; do not switch it to this older application tree.

## Completed

- Secret guard PR 15: four checks pass at cdb6836, run 38134935611.
- Bundle guard PR 16: four checks pass at bf9a87d, run 38135767780.
- Full local verify: 55 app + 106 tooling tests, build and both guards pass.
- Initial JS is 69,655/200,000 gzip bytes. Tests prove oversized shared-import
  rejection/recovery and eager-admin rejection versus lazy-admin acceptance.

## Remaining

Owner review of both guard PRs. T-0.09b stays doing until workflow review is met.
PR 16 is stacked on PR 15; integrate 15 first, retarget 16 to main and rerun CI.
Latest user-supplied AGENTS instructions prohibit agent merges/deployments.
Reconcile npm scripts with your newer app instead of replacing its manifest.
Next independent tooling task: T-0.12. Your active app task remains yours.

## Current Files

`scripts/bundle-graph.ts`, `scripts/check-bundle.mjs`,
`scripts/check-bundle.test.mjs`, `scripts/pending.mjs`, `vite.config.ts`,
`package.json`, `.github/workflows/ci.yml`, `roadmap.md`,
`.agent-state/project-progress.md`, `.agent-state/repo-guards.md`,
`HANDOVER_TO_ANTI_GRAVITY.md`.
The original checkout also has an updated `.agent-state/codex-parallel-work.md`.

## Current Error

Error: no failing implementation check. Expected: owner workflow review.
Actual: PRs remain open; main unchanged. Possible cause: human review pending.

## Next Exact Command

```powershell
git status --short --branch
git diff --stat
```

Read progress and this handover before continuing. The following integration
notice and older handover are historical; their pending-task claims are stale.

# Previous integration notice — 2026-10-11

The owner explicitly requested updating the published branches and merging
verified work into main. PR 13 consolidated PRs 1–12 and was squash-merged as
`f5e36db225676191679e1ffacf67245811314dc5`, including the README and supplied logo.
All four final PR and post-merge main checks passed. The superseded PRs are closed
and all 13 obsolete remote branches were removed; local branches remain intact.
See `.agent-state/main-integration.md`. The older handover below is historical.

Your active checkout and newer database/Phase 2 work were not modified. It had
advanced to `agent/T-2.02-routing-and-layout` during integration. Finish and commit
your active task before integrating updated main into
that branch. Fetch main, merge it normally and preserve your newer database and
task-status changes when resolving documentation conflicts. Never reset or restore
the older main package manifest over your newer implementation.

Exact first command in your existing checkout: `git status --short --branch`.
Branch protection remains unavailable until the private repository's account plan
supports it. Squash-only merging and automatic branch cleanup are enabled.

## Archived handover

# Handover to Anti-Gravity

## Current Objective

Continue from `agent/T-0.08i-language-verification`. Codex reviewed the incoming
commits, preserved them, repaired guards/language support and opened draft PRs
8–11. T-0.08e/h/i are implemented but retain the visual acceptance gate.

Read this file, `.agent-state/project-progress.md`, `git status`, `git diff`
(including untracked files), roadmap sections 0/1 and the current task first.
Do not restart the theme/UI implementation or restore old drafts wholesale.

## Completed

- Original commits 6c18be3, a47889f and 96ad75f remain on the original
  `agent/T-0.08d-labels-ornaments` branch; no reset or discarded work.
- PR 8: labels/ornaments at 6c18be3; four green jobs, run 38081096113.
- PR 9: token guard now scans CSS/SVG/literal utilities with negative CLI tests;
  build guard excludes development copy/assets. Four green jobs at 4ac7126,
  run 38081098408. CI change retains SEC-16/SEC-24 and needs owner review.
- PR 10: repaired bilingual dictionaries exclude kit copy in production;
  language switch uses Button and Arabic catalogue errors are retained.
  ADR-0002 records the OD-003 decision inherited from your handover.
  Four green jobs at 8a6786d, run 38081350854.
- PR 11: Arabic locale detection, direction before paint, 12 language tests.
  All four remote jobs pass at e8774dd in run 38081581119.
  Latest local npm run verify passes: 54 app + 97 tooling tests (151 total),
  lint, format, types, token negatives, production build/preview exclusion.
- Roadmap validates 118 tasks. No new dependency or lockfile change.
- OD-001 compatible versions and OD-002 loading-only pearl bounce remain approved.

## Remaining

- Read `.agent-state/ui-acceptance.md`; the incoming browser report does not
  provide the full matrix. Record actual results in a permitted session before
  marking T-0.08e/h/i done. Do not bypass the prior Codex browser URL denial.
- Owner reviews PR 1 (T-0.06) and PR 9's read-only CI addition. No agent merges.
  T-0.09/T-0.12 stay gated; do not copy the old unreviewed guards into production.
- H-08 Docker remains absent according to the incoming inspection. T-1.01 stays
  blocked; no database check or launch readiness is claimed.
- T-2.03 still owns i18next, pluralization, formatting and the full i18n scanner.
- No catalog, checkout, admin or production backend is ready. This is Phase 0.

## Current Error

Error: No failing code check; visual evidence and human prerequisites remain.
Expected: Full acceptance matrix, owner workflow review, Docker for local DB work.
Actual: Automated checks pass; those remaining prerequisites are not evidenced.
Possible cause: Incoming report lacked detailed results; host/session limits.

## Next Exact Command

```powershell
$env:Path=(Join-Path (Get-Location) '.tools/node-v24.21.0-win-x64')+';'+$env:Path
$env:npm_config_script_shell='C:\Windows\System32\cmd.exe'
npm run roadmap:next
npm run verify
```

Use the command-shell override only in this shell: the configured PowerShell
profile caused stalled npm children and a Conda encoding error. No user-level
shell settings were changed. Do not read/print environment-file values.

## Current Files

Net session changes relative to incoming 96ad75f (including this handover and
acceptance checklist). Full diff: `git diff 96ad75f`.

- `.agent-state/anti-gravity-review.md`
- `.agent-state/language-pr.md`
- `.agent-state/language-verification-pr.md`
- `.agent-state/project-progress.md`
- `.agent-state/ui-acceptance.md`
- `.agent-state/ui-guard-pr.md`
- `.agent-state/ui-ornaments-pr.md`
- `.github/workflows/ci.yml`
- `docs/adr/0002-bilingual-interface.md`
- `docs/spec/design-system.md`
- `HANDOVER_TO_ANTI_GRAVITY.md`
- `HANDOVER_TO_CODEX.md`
- `OPEN_DECISION.md`
- `package.json`
- `roadmap.md`
- `scripts/check-tokens.mjs`
- `scripts/check-tokens.test.mjs`
- `scripts/check-ui-build.mjs`
- `scripts/check-ui-build.test.mjs`
- `scripts/README.md`
- `src/components/ui/LanguageToggle.tsx`
- `src/dev/ChoiceExamples.tsx`
- `src/dev/DialogExample.tsx`
- `src/dev/FeedbackExamples.tsx`
- `src/dev/FormExamples.tsx`
- `src/dev/KitPage.tsx`
- `src/dev/OrnamentExamples.tsx`
- `src/dev/useKitCopy.ts`
- `src/i18n/ar.json`
- `src/i18n/en.json`
- `src/i18n/language.test.tsx`
- `src/i18n/LanguageProvider.tsx`
- `src/i18n/translations.ts`
