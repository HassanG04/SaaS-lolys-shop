# Shared project progress

Updated 2026-10-15 (Africa/Cairo). Codex isolated checkout `.tools/merge-day-plan`,
branch `agent/T-1.09-database-integration`. Anti-Gravity's active checkout is separate.

```yaml
Current task: Database integration PR 26 is verified but GitHub refused the owner-authorized merge on 2026-10-15; approving PR review and real E2E integration are still required.
Completed:
  - Extracted only database work through Anti-Gravity cfac9d5; retained current-main security tooling.
  - Corrected owner-only role guard, internal audit writes, stale SQL tests and unsafe concurrency targeting.
  - Pinned Supabase CLI 2.120.0, regenerated types, added local-only runners and the real db CI job.
  - Local reset and seed/RLS counts passed; all 259 pgTAP assertions, S7 race and five rollback-only negative security probes passed.
  - At 4c04816, all seven implemented GitHub checks passed (static, unit, build, roadmap, secrets, db, sast); Cloudflare preview also passed. CI run 38645102090 and SAST run 38645101988.
  - Owner explicitly approved merging into main. Normal squash-merge API returned HTTP 405 because one write-access reviewer approval and the e2e check are missing. No merge or protection change occurred.
  - Located the owner QR at root ip/ip.jpeg (JPEG, 516x552, 56906 bytes). Offline decoding confirms an InstaPay link whose recipient matches the owner's supplied address. Original asset remains unchanged and outside the published app.
  - Type regeneration is deterministic. Full npm run verify passed: 57 application tests, 114 tooling tests, lint/format/types/build and all existing guards.
Files changed:
  - supabase configuration, nine migrations, seed, concurrency launcher, eleven database test files
  - src/types/database.types.ts, src/types/index.ts, src/types/types.test.ts
  - scripts/local-db.mjs, local-db.test.mjs, run-concurrency.mjs, test-db-guards.mjs
  - scripts/check-secrets.mjs, check-secrets.test.mjs (literal SQL revocations only; all secret and browser checks retained)
  - .github/workflows/ci.yml, package.json, package-lock.json, .prettierignore
  - README.md, docs/adr/0001-stack.md, database runbooks, docs/handoff/DATABASE-INTEGRATION.md
  - roadmap.md, shared progress, handover
  - This follow-up changes only shared progress, HANDOVER_TO_ANTI_GRAVITY.md, docs/handoff/DATABASE-INTEGRATION.md and the roadmap work log.
Tests executed:
  - npm ci --ignore-scripts; npm run db:start; npm run db:reset; npm run db:test (259 pass)
  - node scripts/test-db-guards.mjs (5 rejected mutations, rolled back); db:test recovery (259 pass)
  - npm run db:test:concurrency; npm run db:types; npm run db:types:check
  - npm run verify (57 application, 114 tooling); targeted secret guard tests (6 pass); staged source/build secret scan clean
  - Read current GitHub rules, reviews (none), exact-head checks and PR state; attempted normal owner-authorized merge and received explicit rule violations.
  - Read-only QR decoding using isolated zxing-cpp 2.3.0; SHA-256 B432667B3ACF96B8CBA2C48CAD0710486789DB0459BD223863B0E41D9B66F6AA.
Problems found:
  - Initial local Vitest worker launch timed out; rerun with VITEST_MAX_WORKERS=2 passed.
  - Main ruleset requires one approval and e2e as well as db. This batch provides db; application/E2E integration remains required.
  - T-1.09 actual merged-migration PR rejection/recovery acceptance remains pending; remote database/security tests themselves passed. Do not mark the task done prematurely.
  - The supplied QR is verified as readable, not configured in any cloud payment setting. Payment UI/settings branches still need the approval-first amendment review. Do not expose the asset in public source, seed or frontend defaults.
  - Development roadmap at Anti-Gravity a50e608 records 108/120 done; these are branch implementation claims, not main or launch completion.
Next action: The owner's subsequent consolidation request supersedes merge authorization. Back up all branches, report topology, create integration from main, reconcile existing work, run every gate and audit done claims. Prepare a PR or phase slices; do not merge into main. Preserve the payment amendment, root analytics work and supplied QR.
```

See `docs/handoff/DATABASE-INTEGRATION.md` for source cutoffs, resolved conflicts,
security corrections and the payment hold. Previous session records follow.

## Previous session

Updated 2026-10-13 (Africa/Cairo). Codex isolated branch `agent/T-7.06-semgrep`.

```yaml
Current task: T-7.06 implemented and locally verified; PR checks pending.
Completed:
  - Added read-only, digest-pinned Semgrep CI with maintained TypeScript/React packs and seven project rules.
  - Disabled metrics and inline suppressions; source snippets stay out of logs; failures and empty scans reject.
  - Full scan found no high-severity findings in this branch or Anti-Gravity source at 56529b3.
Files changed:
  - .semgrep/project.yml, .semgrep/README.md, .semgrepignore, .github/workflows/sast.yml, .github/CODEOWNERS
  - scripts/check-sast.mjs, scripts/test-semgrep.mjs, roadmap.md
  - .agent-state/project-progress.md, .agent-state/sast-pr.md, HANDOVER_TO_ANTI_GRAVITY.md
Tests executed:
  - Full verify passed: 55 app and 111 tooling tests plus lint, formatting, types, production build and existing guards.
  - Real scanner suite passed: 12 planted cases across seven rules, safe recovery, reported partial-parse rejection and missing-scanner failure.
Problems found:
  - Semgrep can prefilter malformed files without reporting a parser error; lint/typecheck remain mandatory.
  - Raw-error taint analysis is within a function, not proof of cross-function safety.
  - This tooling branch intentionally retains its older application base; do not replace Anti-Gravity's newer app.
Next action: Complete fixture/PR verification; retain doing until owner workflow review. Anti-Gravity's next app task is T-5.05.
```

## Previous session

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
  - Recovery proved at b2da8dc: all five CI jobs passed in run 38176275898, including secrets. PR 18 is ready for owner review after this evidence update.
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
  - Owner workflow review remains pending; PR https://github.com/HassanG04/lolys/pull/18 is stacked on PR 17. No known implementation failure remains.
Next action: Owner reviews the stacked PRs. The next independent task here is T-7.06 (Semgrep); Anti-Gravity retains application/backend work. Do not merge or deploy.
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

## Merge-day CI repair — 2026-10-14

PR19's latest remote SAST job failed before scanning: setup-node could not execute the downloaded Node24 binary inside the scanner container (ENOENT). The workflow now runs Node on the Ubuntu host and invokes the unchanged digest-pinned Semgrep image through a read-only Docker wrapper. Both planted-violation tests and maintained/project scans remain mandatory. This is a CI compatibility repair, with no feature or scanner-rule changes. Remote rerun is required before merge; previous green jobs are not proof for the new head.

## Merge-day preparation — 2026-10-14

```yaml
Current task: Merge-day preparation requested by owner; no feature code.
Completed:
  - Fetched all remotes with pruning; inventoried 91 existing local branch names, 45 published branches and five open PRs.
  - Pushed WIP checkpoints ee22392 (security workflow, 8 files) and 745c787 (approval flow, 25 files).
  - Fixed PR19 Node/scanner runtime boundary; retained pinned Semgrep image and mandatory rejection tests.
  - Reviewed one historical localhost public anon-key finding; added an exact fingerprint exception to PR18 and PR19. New/privileged secrets remain blocked.
  - PR15, PR16, PR17, PR18 and PR19 have green remote checks at the heads recorded in MERGE-PLAN.md.
  - Rehearsed squash-dependent rebases in a detached checkout; all five resulting trees exactly equal their source PR heads.
  - Restored the owner's payment amendment verbatim as docs/spec/payment-flow-change.md and held 39 payment branches/descendants.
Files changed:
  - docs/handoff/MERGE-PLAN.md
  - docs/spec/payment-flow-change.md
  - .agent-state/project-progress.md
  - Existing PR18/19 fixes are recorded separately in the merge plan; no application feature changes.
Tests executed:
  - Full npm run verify for CI repair: 55 application and 111 tooling tests passed, build and guards passed.
  - Real Gitleaks rejection/history, environment-file refusal and unavailable-scanner tests: all 3 passed; redacted full-history scan passed.
  - GitHub current-head CI: all required jobs passed on PR15-19, including SAST and secrets on PR19 at 819ba69.
  - Five dependency replay rehearsals: clean and tree-identical.
Problems found:
  - Squash-only policy means each child must be replayed after the preceding owner merge; the future main commit does not exist yet.
  - Many branches have no PR or remote CI. A task marked done is not proof of merge readiness.
  - Payment amendment was absent from all inventoried branches; competing approval implementations need reconciliation outside this no-feature-code task.
Next action: Owner reviews the merge plan, merges PR15, then follows the recorded replay/verification steps for PR16-19. Do not merge payment branches yet.
```

## Stable merge-day refresh after Anti-Gravity pause — 2026-10-14

```yaml
Current task: Finish the owner's merge-day inventory and plan; no feature work or merges.
Completed:
  - Owner confirmed Anti-Gravity paused. Saved its remaining security-test draft unchanged as 6d8fcbc and pushed its branch.
  - Retained Anti-Gravity's intervening T-7.07 commit fb16222; earlier WIP ee22392 remains in its history.
  - Refetched all remotes with pruning; inventory now covers 93 non-main branch names, 47 published, and six open PRs including documentation PR20.
  - Every published local branch matches origin; both original working copies are clean.
  - All six PRs passed remote checks at the captured heads; PR20's refresh must pass again at its updated head.
  - Rehearsed PR20 at 15c9f2a in addition to PR15-19; replay preserved its exact tree.
  - Held 40 payment branches and descendants, including the new security E2E draft.
Files changed:
  - docs/handoff/MERGE-PLAN.md
  - .agent-state/project-progress.md
  - Existing uncommitted e2e/security/security.spec.ts preserved on its own WIP branch, not implemented or repaired in this task.
Tests executed:
  - Secret scan before the final checkpoint: one changed file, no findings.
  - Complete branch/PR coverage, owner-amendment byte comparison, documentation-only diff, formatting and roadmap checks.
  - PR15-19 prior CI repair verification remains valid at unchanged heads; no database or unfinished E2E suite was executed.
Problems found:
  - Actual child rebases require the owner's preceding squash commit, so those actions remain pending rather than claiming future conflicts are already fixed.
  - T-7.08 is incomplete and contains an unscoped local MFA-fixture deletion; isolate and review fixtures before future execution.
Next action: Owner reviews PR15, then follows MERGE-PLAN.md for PR16-20. Payment branches remain held. Main unchanged.
```

## Owner-approved merge execution — 2026-10-14

```yaml
Current task: Execute the owner-approved PR15-20 merge sequence and cleanup; no feature implementation.
Completed:
  - Owner explicitly approved the recommended sequence after the preparation-only snapshot.
  - PR15-19 squash-merged into main after current-head checks passed; each merged tree equals its verified source tree.
  - PR16-19 rebased against the actual preceding squash with recorded cutoffs and exact force-with-lease pushes; all source trees preserved.
  - Preserved all roadmap statuses and the union of prior shared changes; no lockfile, translation or migration conflict needed resolution.
  - PR20 delivers the payment amendment, historical inventory and new execution record; its live PR records final checks, merge SHA and cleanup.
Files changed:
  - docs/handoff/MERGE-RESULTS.md
  - docs/handoff/MERGE-PLAN.md
  - .agent-state/project-progress.md
Tests executed:
  - Full local verify after each PR16-19 rebase: 161 tests for PR16; 166 each for PR17-19, plus build, lint, format, type checks and guards.
  - All required fresh remote checks passed before each merge; real Gitleaks and Semgrep checks remained mandatory where present.
  - Each GitHub squash commit's tree matched the verified PR head exactly.
  - PR20 final verification is recorded in its live description; no shared database or unfinished security E2E execution.
Problems found:
  - Dependabot opened PR21-25 while the security configuration reached main; three have failing checks and none is in this approved merge sequence.
  - Remaining development histories diverge before the earlier foundation squash and need dedicated integration PRs.
  - Payment hold remains on 40 total branches, including 32 published branches. Nine other published development branches still need dependency preparation and remote checks.
Next action: Finish PR20 checks and cleanup in this approved sequence, then use its live merged state and MERGE-RESULTS.md as the handoff. Next eligible preparation is the existing database foundation and T-1.09 CI chain; no payment merges or deployment.
```

## Incoming development record (historical claims; audit pending)

# Shared project progress

Updated 2026-10-11 (Africa/Cairo). Active: Anti-Gravity, completed T-2.01.

```yaml
Current task: T-1.16 done. Ready for next task.
Completed:
  - T-1.16: Implemented audit log (S21): created append-only audit_log table with immutability trigger blocking update and delete for all roles including owner, RLS allowing select only to admin at AAL2, audit_event helper, and triggers recording admin and database owner changes across products, categories, delivery_fees, orders, and profiles role. Customer place_order stock decrements are excluded. Created 09_audit_log.test.sql (17 assertions). Full verify passes (225 app + 121 tooling tests = 346 tests).
  - T-1.15: Hardened database admin access: is_admin() requires AAL2 MFA claim, added require_admin() raising ADM-002 at AAL1 and ADM-001 for non-admins, removed admin_set_role, added protect_profile_role trigger blocking API role mutations, clamped sign-up metadata in handle_new_user, and added text column length check constraints on profiles, categories, products, and orders. Created 08_admin_hardening.test.sql (30 assertions for S19, S20, S30) and updated 05_admin.test.sql. Full verify passes (225 app + 121 tooling tests = 346 tests).
  - T-1.12: Added .github/workflows/db-staging.yml and .github/workflows/db-production.yml with SHA-pinned setup-cli, un-echoed secrets, and manual confirmation gate. Authored docs/runbooks/deploy-db.md covering staging/production procedures, pausing caveat and checklists. Full verify passes (225 app + 121 tooling tests = 346 tests).
  - T-1.10: Added migration 20261012040559_error_codes.sql setting hint to stable error codes (AUTH-004, ORD-001..ORD-008, ORD-009, ORD-014, ADM-001) and detail left=N for stock in place_order, cancel_my_order, admin_dashboard, and orders_status_guard. Implemented Scenario S18 pgTAP test suite in 07_error_codes.test.sql (20 assertions). Full verify passes (225 app + 121 tooling tests = 346 tests).
  - T-1.09: Added db job to .github/workflows/ci.yml with SHA-pinned setup-cli, supabase start, reset, test, concurrency launcher, types regeneration diff check, and migration guard. Removed completed check:migrations stub from scripts/pending.mjs. Full verify passes (225 app + 121 tooling tests = 346 tests).
  - T-0.12: Reconciled repository security baseline: SECURITY.md, public/.well-known/security.txt, .github/CODEOWNERS, .github/dependabot.yml, .gitleaksignore, and secrets CI job. Full verify passes (225 app + 121 tooling tests = 346 tests).
  - T-0.09: Reconciled repository guards: scripts/check-secrets.mjs rejecting privileged JWTs, secret keys and role mentions outside tests/docs; scripts/check-bundle.mjs enforcing <= 200 KB initial JS gzip budget and lazy admin separation; wired both into build and verify pipelines. Full verify passes.
  - T-8.01: Authored auth email and hardening runbooks (docs/runbooks/auth-email.md explaining custom SMTP limits, configuration, exact non-wildcard redirect URLs, test procedure; docs/runbooks/auth-hardening.md 10-point checklist covering Turnstile, confirmations, 10-char password, TOTP MFA, HIBP, timeouts). Implemented clear "check your email", "resend", and "link expired" (AUTH-009) UI states across Register, Login, Reset Password, and Resend Confirmation pages. Full verify passes (225 app + 111 tooling tests = 336 tests). Initial bundle budget enforced <= 200 KB gzip (192.8 KB).
  - T-6.03: Implemented Chart accessibility and export in src/features/admin/dashboard/ (text summary card and fallback data table for daily chart, aria-labels and table column scopes, ui-print-card and print styles, print report button, UTF-8 BOM CSV export helper formatDailySeriesCsv & downloadDailySeriesCsv). Axe accessibility audit reports 0 serious and 0 critical violations across dashboard in both Arabic and English. Full verify passes (220 app + 111 tooling tests = 331 tests). Initial bundle budget enforced <= 200 KB gzip (192.7 KB).
  - T-6.02: Implemented Dashboard UI in src/features/admin/dashboard/ (KPI cards, lazy-loaded Recharts daily revenue area chart with tokens and accessible summary table, breakdowns for status/delivery/governorate, top products and customers lists, low stock alerts linking to product edit form, preset range selector, and skeleton/empty/error states). Initial JavaScript budget enforced <= 200 KB gzip (192.5 KB) and Recharts strictly isolated to admin chunk. Full verify passes (209 app + 111 tooling tests = 320 tests).
  - T-6.01: Implemented Dashboard data layer in src/features/admin/dashboard/ (Zod schema for admin_dashboard RPC payload per database-contract.md, handled DashboardParseError on malformed response, preset date ranges for 7d/30d/90d/custom in Africa/Cairo time, useAdminDashboard React Query hook). Full verify passes (197 app + 107 tooling tests = 304 tests).
  - T-5.07: Implemented Delivery fees admin in src/features/admin/delivery/ (governorate x method grid, add/update/remove fees, empty cells read "غير متاح", validation for fee >= 0 with Arabic error feedback). Integrated into /admin/delivery route. Integration test proves removing fee makes that method unavailable at checkout. Full verify passes (181 app + 107 tooling tests = 288 tests).
  - T-5.06: Implemented Customers admin in src/features/admin/customers/ (table from customer_stats view, search by name/phone/product, read-only role badges with aria-readonly, no role mutation UI). Added scripts/admin-role-guard.test.mjs in test:tooling proving zero writes to profiles.role and zero admin_set_role calls in src/. Full verify passes (169 app + 107 tooling tests = 276 tests).
  - T-5.01: Implemented Admin shell and access control in src/features/admin/ (AdminShell, AdminSidebar rail with 8 Arabic links, AdminHeader, lazy chunk loader, responsive mobile drawer, AAL2 badge, store return link). Customer receives 403 view (AUTH-011) without downloading admin chunk; admin at aal1 is sent to MFA with ADM-002 prompt without downloading admin chunk; admin at aal2 loads AdminShell. Full verify passes (163 app + 105 tooling tests = 268 tests).
  - T-4.01: Implemented delivery options API and hooks in src/features/delivery/ (getGovernorates with Arabic names first, getDeliveryFees returning empty list when no rows configured, useGovernorates, useDeliveryFees). Unit tests in delivery.test.tsx verify empty list behavior, labels, Arabic sorting, and hook lifecycles. Full verify passes (155 app + 105 tooling tests = 260 tests).
  - T-3.08: Implemented SEO basics: useSeo() hook, useRouteSeo() per-route title/meta hook wired in Layout, bilingual route dictionary in ar.json and en.json, Open Graph and Twitter card meta tags, public/favicon.svg (cropped bow), public/site.webmanifest, and public/robots.txt with crawler boundaries. Verified with 144 app tests + 105 tooling tests (249 total); npm run verify passes.
  - T-2.09: Implemented useStepUp() hook and StepUpDialog with in-memory 5-minute confirmation, challenge and verify, and ADM-003 prompt. Unit tests in stepUp.test.tsx verify in-memory expiry with fake timers and prove confirmation is never written to storage. Full verify passes (118 app + 101 tooling tests).
  - T-2.07: Implemented account security on /account/security: change password (enforcing 10 characters, handling stale sessions with AUTH-007), change email (retaining secure email change confirmation, neutral AUTH-010, targeting only authenticated user), global revocation signOut({ scope: 'global' }), and admin 20-minute idle session timeout with queryClient cache clearing verified with fake timers. Unit tests in accountSecurity.test.tsx and full verify pass (114 app + 101 tooling tests).
  - T-2.06: Implemented TOTP two-factor authentication with Supabase Auth MFA: factor enrollment (QR code and manual secret key in Ltr), challenge and verification, factor listing and removal (enforcing fresh aal2 session), and useAal hook. Configured Admin MFA ladder in RequireAdmin (prompting enrollment if no factors enrolled, challenging until aal2, allowing admin screens only at aal2), and customer 2FA management in /account/security with second-device guidance. Implemented Arabic catalogue error codes AUTH-005 and AUTH-006. Full verify passes with 108 app + 101 tooling tests (209 total).
  - T-2.05: Installed and pinned @tanstack/react-query (5.104.1) in ADR-0001; configured QueryClientProvider with retry policy (suppressing 4xx client retries, max 2 retries for 5xx/network) and 1m/5m cache timers. Added global ErrorBoundary with Arabic reset card, useToast hook and ToastProvider container, and shared ErrorPanel and EmptyState components with documented design tokens and Ltr error codes. Full verify passes with 101 app + 101 tooling tests (202 total).
  - T-2.04: Implemented AuthProvider, useAuth hook, Arabic auth pages (Login, Register, Reset Password, Resend Confirmation), Cloudflare Turnstile integration, route guards (RequireAuth, RequireAdmin with 403 AUTH-011, RequireGuest), and generic catalogue error codes (AUTH-001 through AUTH-012). Strictly enforced SEC-05 enumeration protection: identical request count for known and unknown accounts, neutral AUTH-010 outcome, upfront 10-character password policy, always-visible resend link, and no raw errors in DOM. Unit tests in auth.test.tsx and full verify pass (90 app + 101 tooling tests).
  - T-2.03: Configured i18next and react-i18next with exact pins (26.4.3 and 17.0.16) in src/i18n/i18n.ts, LanguageProvider integration with dual t() callable and property dictionary access, full copy deck in ar.json and en.json from Section 8 of design-system.md, Arabic CLDR 6-form plural rules, Western digits. Added src/lib/format.ts (formatEGP with ar-EG-u-nu-latn, formatDate, formatNumber, LTR helpers), src/components/ui/Ltr.tsx, scripts/check-i18n.mjs (parity, key usage, kit exclusion), scripts/check-i18n.test.mjs, and check:i18n npm script. Verified with 79 app tests, 101 tooling tests, and npm run verify.
  - T-2.02: Implemented React Router v7 with route table, Layout shell, skip link (#main-content), ScrollToTop, responsive Navbar (brand logo, search pill, nav links, cart pill, account, theme/language toggles, mobile menu), and cocoa Footer (tagline, policy links, ribbon divider, copyright). Added 16 route page placeholders with PearlLoader suspense fallback. Updated ADR-0001 with react-router-dom@7.18.4 pin. Verified with 72 unit tests and npm run verify.
  - T-2.01: Added Zod-validated environment configuration in src/lib/env.ts (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_TURNSTILE_SITE_KEY) with readable error formatting, typed createClient<Database> in src/lib/supabase.ts, and clear EnvErrorScreen in development. Unit tests cover validation and error rendering. npm run test:unit:coverage (100% lines, 90% branch) and npm run verify pass.
  - T-1.14: Authored database runbooks docs/runbooks/local-dev.md (Docker, endpoints, Inbucket local mail, test users), docs/runbooks/first-admin.md (owner SQL promotion procedure, security restrictions), and docs/runbooks/delivery-fees.md (fail-safe fee configuration, nationwide post vs. representative). Verified with manual review and npm run verify.
  - T-1.08: Implemented scenario S7 concurrency check in supabase/tests/concurrency.sh and cross-platform launcher scripts/run-concurrency.mjs. Verified: session B waits for session A to finish and commit 3s transaction, session B fails with out-of-stock error ("Only 0 left in stock for \"Concurrent Ring\""), stock is 0, sold is 2, exactly 1 order is created; npm run db:test:concurrency and npm run verify pass.
  - T-1.07: Implemented scenarios S12, S13, S14 in supabase/tests/database/05_admin.test.sql (26 assertions) and S16 in 06_privileges.test.sql (38 assertions). Verified: all 64 assertions pass with npm run db:test (177 total db tests across 7 test files); npm run verify passes.
  - T-1.06: Implemented scenarios S4, S5, S6 in supabase/tests/database/03_orders.test.sql (43 assertions) and S10, S11 in 04_cancel_restock.test.sql (22 assertions). Verified: all 65 assertions pass with npm run db:test (113 total db tests pass); all 12 rejection cases leave zero order rows and zero stock delta; npm run verify passes.
  - T-1.05: Implemented scenarios S1, S2, S3, S8, S9, S15 in supabase/tests/database/02_auth_visibility.test.sql (32 assertions). Verified with npm run db:test (48 total db tests pass); spot-checked two mutations (mutating favorites policy fails S15 tests 28-29, mutating products visibility policy fails S2 test 5; both pass after revert). npm run verify passes.
  - T-1.04: Vendored basejump supabase-test-helpers in supabase/tests/database/00000-supabase_test_helpers.sql; added 01_rls_enabled.test.sql asserting RLS on public schema and all 8 public tables (scenario S17). Verified with npm run db:test; mutation test verified (disabling RLS on categories causes failure, re-enabling passes). npm run verify passes.
  - T-1.03: Generated TypeScript database types via npm run db:types into src/types/database.types.ts; added src/types/index.ts re-exporting Tables, TablesInsert, TablesUpdate, Enums, CompositeTypes, Constants; added src/types/types.test.ts. Ignored database.types.ts in .prettierignore. npm run db:types && git diff --exit-code && npm run typecheck and npm run verify pass.
  - T-1.01: Docker installed and local Supabase stack initialized and running (npm run db:start).
  - T-1.02: Initial SQL converted to 6 timestamped migrations in supabase/migrations/ (schema, security, functions, views, reference_data, storage); demo catalogue seeded in supabase/seed.sql without first-admin snippet. db:reset verified cleanly from scratch; 27 governorates, 4 categories, 6 products, 0 delivery fees, and RLS enabled across all 8 tables. npm run verify passes.
  - T-0.08j compact login/register preview verified and marked done.
  - T-0.08e token guard and UI-kit exclusion checks passed and marked done.
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
  - T-8.01: docs/runbooks/auth-email.md, docs/runbooks/auth-hardening.md, src/features/auth/authErrors.tsx, src/pages/LoginPage.tsx, src/pages/RegisterPage.tsx, src/pages/ResendConfirmationPage.tsx, src/pages/ResetPasswordPage.tsx, src/features/auth/auth.test.tsx, roadmap.md.
  - T-6.03: src/features/admin/dashboard/DashboardChart.tsx, DashboardPage.tsx, exportCsv.ts, dashboardA11y.test.tsx, src/styles/ui.css, roadmap.md.
  - T-2.03: src/i18n/i18n.ts, LanguageProvider.tsx, ar.json, en.json, translations.ts, language.test.tsx, src/lib/format.ts, format.test.ts, src/components/ui/Ltr.tsx, scripts/check-i18n.mjs, scripts/check-i18n.test.mjs, package.json, docs/adr/0001-stack.md, roadmap.md.
  - T-2.02: Layout shell, Navbar, Footer, 16 route placeholders, routes.tsx, App.tsx, App.test.tsx, test-setup.ts, language.test.tsx, check-tokens.mjs, public/brand/ assets, docs/adr/0001-stack.md.
  - Branch agent/T-0.08d-labels-ornaments is based on dialog PR 7 at e5d498b.
  - This slice adds Tabs, Toast, feedback.test.tsx and FeedbackExamples; updates kit, Arabic copy, CSS, roadmap and continuation/PR docs.
  - Dialog slice adds Dialog, dialog.test.tsx and DialogExample; updates kit, Arabic copy, CSS, roadmap and continuation/PR docs.
  - Theme components, tokens, fonts/licenses, tests, dependency pins, roadmap and review notes.
  - Icon follow-up changes ThemeToggle.tsx, theme.test.tsx, ar.json and continuation/PR documentation.
  - UI actions add three components, actions.test.tsx, src/dev/KitPage.tsx and its local SVG fixture, src/styles/ui.css; update App, Arabic copy, tokens and handover/PR/roadmap docs.
  - Text fields add Field, Input, Select, Textarea, SearchInput, forms.test.tsx and FormExamples; update kit, CSS, Arabic copy and continuation/PR/roadmap docs.
  - Choice controls add Choice, Checkbox, Radio, choices.test.tsx and ChoiceExamples; update form preview, CSS, Arabic copy and continuation/PR/roadmap docs.
Tests executed:
  - T-8.01: npm run verify passes with 225 app + 111 tooling tests (336 total); check:tokens, check:i18n, lint, prettier check, typecheck, unit tests (including email verification, expired token link states, resend flows), production build and preview exclusion all pass. Initial JS bundle size is 192.8 KB gzip <= 200 KB.
  - T-6.03: npm run verify passes with 220 app + 111 tooling tests (331 total); axe accessibility audit passes with 0 serious and 0 critical violations across dashboard in both Arabic and English. Initial JS bundle size is 192.7 KB gzip <= 200 KB.
  - T-2.03: npm run verify passes with 79 app + 101 tooling tests (180 total); check:tokens, check:i18n, lint, prettier check, typecheck, production build and preview exclusion all pass.
  - T-2.02: npm run verify passes with 72 app + 97 tooling tests (169 total); token scan, lint, format, typecheck, production build with 16 lazy chunks, preview exclusion pass.
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
Next action: T-1.12 done. Proceeding with T-1.15 (Admin hardening).
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
