# Branch and PR cleanup — 2026-10-21

Owner request: close unnecessary branches and pull requests, and report the remaining work.

## Result

- Main remained at `e7b7d5358eab121b123b9a22b1b550f47bde7f8d`; no merge, deployment or application change was performed.
- Deleted **26 remote branches**: 25 superseded development branches and the incompatible ESLint upgrade branch.
- Deleted **28 local branch references** that were not checked out.
- Created and verified **54 remote backup tags**, one for every deleted reference, before deletion.
- Closed [PR #53](https://github.com/HassanG04/ecommerce-lolys-shop/pull/53): ESLint 10 conflicts with accepted ADR-0001 and the installed accessibility plugin peer range, which supports ESLint through 9.
- PRs #40, #44 and #45 were already merged. The older repair PRs were already closed.
- Immediately after deletion: **9 remote branches**, including main, seven dependency branches and the preserved cozy-storefront branch. Publishing this audit adds one documentation branch/PR.

## Safety and provenance

Branch tips were compared with merged PR heads, not just main ancestry: squash merges do not preserve all original ancestor relationships. Most feature branches are ancestors of the head merged in PR #40. The earlier CI branches are explicitly superseded by PR #44 in `docs/handoff/CI-CONSOLIDATION-2026-10-19.md`. The consolidation branch has only obsolete README/progress differences after PR #45.

Remote backups were checked with `git ls-remote` against all original SHAs. Remote deletion used an atomic push with an exact-tip lease per branch. Local deletion rechecked the SHA and refused branches checked out in a worktree. No worktree directory or uncommitted edit was removed.

## Remaining PRs

Checks below are a snapshot of the current PR heads, not approval to merge.

| PR                                                               | Update                                                                                     | Check status              | Next action                                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------- | -------------------------------------------------------------------------------- |
| [#46](https://github.com/HassanG04/ecommerce-lolys-shop/pull/46) | chore(deps): bump actions/setup-python from 5.4.0 to 7.0.0                                 | All reported checks green | Owner review of the major upgrade and relevant compatibility/ADR requirements.   |
| [#47](https://github.com/HassanG04/ecommerce-lolys-shop/pull/47) | chore(deps): bump supabase/setup-cli from 1.7.3 to 3.0.1                                   | All reported checks green | Owner review of the major upgrade and relevant compatibility/ADR requirements.   |
| [#48](https://github.com/HassanG04/ecommerce-lolys-shop/pull/48) | chore(deps): update pandas requirement from <3.0.0,>=2.2.0 to >=2.2.0,<4.0.0 in /analytics | All reported checks green | Owner review of the major upgrade and relevant compatibility/ADR requirements.   |
| [#49](https://github.com/HassanG04/ecommerce-lolys-shop/pull/49) | chore(deps): bump @tanstack/react-query from 5.104.1 to 5.104.4                            | All reported checks green | Owner review of the dependency change.                                           |
| [#50](https://github.com/HassanG04/ecommerce-lolys-shop/pull/50) | chore(deps): bump react-i18next from 17.0.16 to 17.1.0                                     | All reported checks green | Owner review of the dependency change.                                           |
| [#51](https://github.com/HassanG04/ecommerce-lolys-shop/pull/51) | chore(deps-dev): bump vitest from 5.0.3 to 5.0.5                                           | Checks fail               | Update Vitest and @vitest/coverage-v8 together; verify as one compatible change. |
| [#52](https://github.com/HassanG04/ecommerce-lolys-shop/pull/52) | chore(deps-dev): bump @vitest/coverage-v8 from 5.0.3 to 5.0.5                              | Checks fail               | Update Vitest and @vitest/coverage-v8 together; verify as one compatible change. |

The PR #51 lockfile has Vitest 5.0.5 with coverage-v8 5.0.3, whose exact peer requirement is Vitest 5.0.3. PR #52 has the inverse mismatch: coverage-v8 5.0.5 requires Vitest 5.0.5, while Vitest stays at 5.0.3. Neither is redundant; they require coordinated repair. No dependency version or Dependabot configuration was changed.

## Work intentionally preserved

- `agent/T-3.09-cozy-storefront`: unique unmerged history and staged/unstaged work. Its remote branch and local worktree remain.
- The owner-controls worktree has an uncommitted progress update; the analytics-docs worktree has uncommitted documentation and untracked model-card/operating-guide files. Their worktree files remain untouched.
- Checked-out local branches remain, including old integration, InstaPay, content, mobile-repair and analytics worktrees. Their remote refs can be retired independently when already merged.
- Local `agent/T-3.10-homepage-editor` and `agent/T-4.08-required-postal-code` both point to `a1be8de`. Their original snapshot is not directly contained in merged history; retain them until reconciled with the later postal-code integration.
- No active worktree was reset, detached, removed or archived.

## What remains before launch

The roadmap still records 141 done, three doing and eight human-owned todo tasks. The three doing repairs (T-7.08b, T-7.08c, T-7.03b) were merged in PR #44; their labels need reconciliation with review evidence. This cleanup does not alter task status.

1. T-2.12: hosted authentication abuse controls and CAPTCHA/rate-limit acceptance.
2. T-7.09: owner security scan and finding triage.
3. T-8.02: production SMTP and real confirmation/recovery email checks.
4. T-8.03: hosted Supabase/Cloudflare configuration and deep-link acceptance.
5. T-8.04: real catalogue, photography, delivery fees and merchant settings.
6. T-8.09: two-device admin onboarding and recovery.
7. T-8.10: documented soft launch and owner acceptance.
8. T-9.13: separate, later production-forecast activation after execution review and sufficient real data. This is not a prerequisite for launching the shop.

See [progress.md](../../progress.md), [roadmap.md](../../roadmap.md) and the [launch checklist](../launch-checklist.md). Existing owner confirmations must be recorded as evidence rather than presumed missing implementation.

## Recovery manifest

Every tag below exists on origin at the listed full SHA. To recover a branch, fetch tags and create a new branch from its backup tag; do not overwrite main.

### Deleted remote refs

| Branch                                                 | Original SHA                               | Backup tag                                                                              | Evidence                  |
| ------------------------------------------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------- |
| `agent/T-2.06b-mfa-experience-repair`                  | `52dfb0b6c7fe6f53fdb163e4a37f22d31fb6e10e` | `backup/cleanup-2026-10-21/remote/agent/T-2.06b-mfa-experience-repair`                  | Merged PR #40             |
| `agent/T-2.10-customer-notifications`                  | `291f68802032365b10937d1d113e75f1af4b6364` | `backup/cleanup-2026-10-21/remote/agent/T-2.10-customer-notifications`                  | Merged PR #40             |
| `agent/T-2.11-customer-profile-photo`                  | `4751d4cb06f45f1f03bfb3f8dcbdfa7085293664` | `backup/cleanup-2026-10-21/remote/agent/T-2.11-customer-profile-photo`                  | Merged PR #40             |
| `agent/T-2.12a-challenge-lifecycle`                    | `d63c65df658b6a6f2403b04b41b2d204915ca511` | `backup/cleanup-2026-10-21/remote/agent/T-2.12a-challenge-lifecycle`                    | Merged PR #40             |
| `agent/T-3.10c-storefront-content`                     | `9e05dd794c57a5cbcda2ed49c5b50c838e74da4d` | `backup/cleanup-2026-10-21/remote/agent/T-3.10c-storefront-content`                     | Merged PR #40             |
| `agent/T-3.10d-content-editor`                         | `9cb9d168cce5b651d194c55135126be81743298c` | `backup/cleanup-2026-10-21/remote/agent/T-3.10d-content-editor`                         | Merged PR #40             |
| `agent/T-3.10e-published-content`                      | `86d100ce97ece90bec9841f66a4b68121f649f7e` | `backup/cleanup-2026-10-21/remote/agent/T-3.10e-published-content`                      | Merged PR #40             |
| `agent/T-3.10e-published-content-repairs`              | `909fbfb640cf61b66da3095e35d868a0ceadf2c9` | `backup/cleanup-2026-10-21/remote/agent/T-3.10e-published-content-repairs`              | Merged PR #40             |
| `agent/T-3.11-motion-preference`                       | `35106eccd656c558ac06c5a3dd77d2d5a3854710` | `backup/cleanup-2026-10-21/remote/agent/T-3.11-motion-preference`                       | Merged PR #40             |
| `agent/T-3.11b-footer-motion`                          | `0be60339f79735f4e507ac981c4d9995aa0a985f` | `backup/cleanup-2026-10-21/remote/agent/T-3.11b-footer-motion`                          | Merged PR #40             |
| `agent/T-4.08b-postal-integration`                     | `c30a48f8587b89e94c05d47e0464cafdb03baed3` | `backup/cleanup-2026-10-21/remote/agent/T-4.08b-postal-integration`                     | Merged PR #40             |
| `agent/T-5.13-admin-workspace-usability`               | `a561e3c3790ab1b26a8a9aa611d713c8b5455339` | `backup/cleanup-2026-10-21/remote/agent/T-5.13-admin-workspace-usability`               | Merged PR #40             |
| `agent/T-5.13b-review-navigation`                      | `55802958f9289f82bac3bfd381cecf8d9e18093b` | `backup/cleanup-2026-10-21/remote/agent/T-5.13b-review-navigation`                      | Merged PR #40             |
| `agent/T-5.13c-responsive-navigation`                  | `169b452576012c324dd1ad65fe18b900f3b3d165` | `backup/cleanup-2026-10-21/remote/agent/T-5.13c-responsive-navigation`                  | Merged PR #40             |
| `agent/T-5.13d-responsive-evidence`                    | `d5f0a2a968493fab5623a2d4166f369f3e5ff83e` | `backup/cleanup-2026-10-21/remote/agent/T-5.13d-responsive-evidence`                    | Merged PR #40             |
| `agent/T-5.13e-admin-slide-transitions`                | `c346f2a38a241648afd61846a045fbdbd45ee956` | `backup/cleanup-2026-10-21/remote/agent/T-5.13e-admin-slide-transitions`                | Merged PR #40             |
| `agent/T-5.14-verify-instapay-qr`                      | `90427c40238c1a0fad319d6f37ed7c45305d3041` | `backup/cleanup-2026-10-21/remote/agent/T-5.14-verify-instapay-qr`                      | Merged PR #40             |
| `agent/T-5.15-footer-and-policy-editor`                | `cb35cb4e3ce7df4e7393278d80d5a92a48f057d2` | `backup/cleanup-2026-10-21/remote/agent/T-5.15-footer-and-policy-editor`                | Merged PR #40             |
| `agent/T-7.03b-mobile-loading-repair`                  | `8fe74fc452b545fa6a8053d790c017f3db75519e` | `backup/cleanup-2026-10-21/remote/agent/T-7.03b-mobile-loading-repair`                  | Superseded by #44         |
| `agent/T-7.08b-ci-auth-repairs`                        | `75602ec1024e0b52fde114a7974435ca770bb113` | `backup/cleanup-2026-10-21/remote/agent/T-7.08b-ci-auth-repairs`                        | Superseded by #44         |
| `agent/T-7.08b-consolidated-ci-repairs`                | `85ca9316cf8d332d07506b8d2f98dda560af5733` | `backup/cleanup-2026-10-21/remote/agent/T-7.08b-consolidated-ci-repairs`                | Superseded by #44 and #45 |
| `agent/T-7.08c-browser-fixtures-and-csp`               | `15b378ee5b7faf841e8b857b08e71533fb1da70e` | `backup/cleanup-2026-10-21/remote/agent/T-7.08c-browser-fixtures-and-csp`               | Superseded by #44         |
| `agent/T-9.10-admin-forecast-reorder-screens`          | `0fc23a9fcc1cd27b6e0b19b31e3f53df49b5cbe5` | `backup/cleanup-2026-10-21/remote/agent/T-9.10-admin-forecast-reorder-screens`          | Merged PR #40             |
| `agent/T-9.11-descriptive-analyses-and-analytics-page` | `e79d0478319d8ae2e7dc0d86936922f66ea2fb22` | `backup/cleanup-2026-10-21/remote/agent/T-9.11-descriptive-analyses-and-analytics-page` | Merged PR #40             |
| `agent/T-9.14-occasion-reminders`                      | `e0140587c043f5da548d9c30adfb8bf06656feb5` | `backup/cleanup-2026-10-21/remote/agent/T-9.14-occasion-reminders`                      | Merged PR #40             |
| `dependabot/npm_and_yarn/eslint-10.13.0`               | `11a76395619ab42ab8a4fbc93cf1023debadb0ca` | `backup/cleanup-2026-10-21/remote/dependabot/npm_and_yarn/eslint-10.13.0`               | Incompatible PR #53       |

### Deleted local refs

| Branch                                                 | Original SHA                               | Backup tag                                                                             | Evidence                  |
| ------------------------------------------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------- |
| `agent/T-2.06b-mfa-experience-repair`                  | `52dfb0b6c7fe6f53fdb163e4a37f22d31fb6e10e` | `backup/cleanup-2026-10-21/local/agent/T-2.06b-mfa-experience-repair`                  | Merged PR #40             |
| `agent/T-2.10-customer-notifications`                  | `291f68802032365b10937d1d113e75f1af4b6364` | `backup/cleanup-2026-10-21/local/agent/T-2.10-customer-notifications`                  | Merged PR #40             |
| `agent/T-2.11-customer-profile-photo`                  | `4751d4cb06f45f1f03bfb3f8dcbdfa7085293664` | `backup/cleanup-2026-10-21/local/agent/T-2.11-customer-profile-photo`                  | Merged PR #40             |
| `agent/T-2.12a-challenge-lifecycle`                    | `d63c65df658b6a6f2403b04b41b2d204915ca511` | `backup/cleanup-2026-10-21/local/agent/T-2.12a-challenge-lifecycle`                    | Merged PR #40             |
| `agent/T-3.10a-homepage-visual-repair`                 | `0395a0ece4523b80d2629e4b7533af1f6fa9f0a7` | `backup/cleanup-2026-10-21/local/agent/T-3.10a-homepage-visual-repair`                 | Merged PR #40             |
| `agent/T-3.10b-admin-entry-and-card-badges`            | `e31c67f1cbeb9462aa614b598aaf0fe2af215130` | `backup/cleanup-2026-10-21/local/agent/T-3.10b-admin-entry-and-card-badges`            | Merged PR #40             |
| `agent/T-3.10c-storefront-content`                     | `9e05dd794c57a5cbcda2ed49c5b50c838e74da4d` | `backup/cleanup-2026-10-21/local/agent/T-3.10c-storefront-content`                     | Merged PR #40             |
| `agent/T-3.10d-content-editor`                         | `9cb9d168cce5b651d194c55135126be81743298c` | `backup/cleanup-2026-10-21/local/agent/T-3.10d-content-editor`                         | Merged PR #40             |
| `agent/T-3.10e-published-content-repairs`              | `909fbfb640cf61b66da3095e35d868a0ceadf2c9` | `backup/cleanup-2026-10-21/local/agent/T-3.10e-published-content-repairs`              | Merged PR #40             |
| `agent/T-3.11-motion-preference`                       | `35106eccd656c558ac06c5a3dd77d2d5a3854710` | `backup/cleanup-2026-10-21/local/agent/T-3.11-motion-preference`                       | Merged PR #40             |
| `agent/T-3.11b-footer-motion`                          | `0be60339f79735f4e507ac981c4d9995aa0a985f` | `backup/cleanup-2026-10-21/local/agent/T-3.11b-footer-motion`                          | Merged PR #40             |
| `agent/T-3.12-interface-localization`                  | `91baa03fdaeb44e62d28a3e8f7023409a950c57c` | `backup/cleanup-2026-10-21/local/agent/T-3.12-interface-localization`                  | Merged PR #40             |
| `agent/T-4.08b-postal-integration`                     | `c30a48f8587b89e94c05d47e0464cafdb03baed3` | `backup/cleanup-2026-10-21/local/agent/T-4.08b-postal-integration`                     | Merged PR #40             |
| `agent/T-5.13-admin-workspace-usability`               | `a561e3c3790ab1b26a8a9aa611d713c8b5455339` | `backup/cleanup-2026-10-21/local/agent/T-5.13-admin-workspace-usability`               | Merged PR #40             |
| `agent/T-5.13b-review-navigation`                      | `55802958f9289f82bac3bfd381cecf8d9e18093b` | `backup/cleanup-2026-10-21/local/agent/T-5.13b-review-navigation`                      | Merged PR #40             |
| `agent/T-5.13c-responsive-navigation`                  | `169b452576012c324dd1ad65fe18b900f3b3d165` | `backup/cleanup-2026-10-21/local/agent/T-5.13c-responsive-navigation`                  | Merged PR #40             |
| `agent/T-5.13d-responsive-evidence`                    | `d5f0a2a968493fab5623a2d4166f369f3e5ff83e` | `backup/cleanup-2026-10-21/local/agent/T-5.13d-responsive-evidence`                    | Merged PR #40             |
| `agent/T-5.13e-admin-slide-transitions`                | `c346f2a38a241648afd61846a045fbdbd45ee956` | `backup/cleanup-2026-10-21/local/agent/T-5.13e-admin-slide-transitions`                | Merged PR #40             |
| `agent/T-5.13f-admin-directional-layout`               | `5459f3c4e7f7a998fea5006a5342a36484de7bd9` | `backup/cleanup-2026-10-21/local/agent/T-5.13f-admin-directional-layout`               | Merged PR #40             |
| `agent/T-5.14-verify-instapay-qr`                      | `90427c40238c1a0fad319d6f37ed7c45305d3041` | `backup/cleanup-2026-10-21/local/agent/T-5.14-verify-instapay-qr`                      | Merged PR #40             |
| `agent/T-5.15-footer-and-policy-editor`                | `cb35cb4e3ce7df4e7393278d80d5a92a48f057d2` | `backup/cleanup-2026-10-21/local/agent/T-5.15-footer-and-policy-editor`                | Merged PR #40             |
| `agent/T-7.03b-project-documentation`                  | `e7a970a8b57ea2a3d766d347945e8234300d351f` | `backup/cleanup-2026-10-21/local/agent/T-7.03b-project-documentation`                  | Merged PR #45             |
| `agent/T-7.08b-ci-auth-repairs`                        | `75602ec1024e0b52fde114a7974435ca770bb113` | `backup/cleanup-2026-10-21/local/agent/T-7.08b-ci-auth-repairs`                        | Superseded by #44         |
| `agent/T-7.08b-consolidated-ci-repairs`                | `85ca9316cf8d332d07506b8d2f98dda560af5733` | `backup/cleanup-2026-10-21/local/agent/T-7.08b-consolidated-ci-repairs`                | Superseded by #44 and #45 |
| `agent/T-7.08c-browser-fixtures-and-csp`               | `15b378ee5b7faf841e8b857b08e71533fb1da70e` | `backup/cleanup-2026-10-21/local/agent/T-7.08c-browser-fixtures-and-csp`               | Superseded by #44         |
| `agent/T-9.10-admin-forecast-reorder-screens`          | `0fc23a9fcc1cd27b6e0b19b31e3f53df49b5cbe5` | `backup/cleanup-2026-10-21/local/agent/T-9.10-admin-forecast-reorder-screens`          | Merged PR #40             |
| `agent/T-9.11-descriptive-analyses-and-analytics-page` | `66877e402eba706517a6171f46d80dd1c03290cf` | `backup/cleanup-2026-10-21/local/agent/T-9.11-descriptive-analyses-and-analytics-page` | Merged PR #40             |
| `agent/T-9.14-occasion-reminders`                      | `e0140587c043f5da548d9c30adfb8bf06656feb5` | `backup/cleanup-2026-10-21/local/agent/T-9.14-occasion-reminders`                      | Merged PR #40             |
