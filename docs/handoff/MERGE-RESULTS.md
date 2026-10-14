# Approved merge execution — 2026-10-14

The owner explicitly approved the recommended sequence in this conversation after the preparation-only snapshot. That approval authorized PR15 → PR16 → PR17 → PR18 → PR19 → PR20 and cleanup of their integrated branches. It supersedes the earlier instruction to leave all merging to the owner for this sequence only. No production deployment or payment-feature integration was authorized or performed.

## Verified merges

| PR                                                | Verified head                              | Main squash commit                         | Fresh checks | Content verification                                                                     |
| ------------------------------------------------- | ------------------------------------------ | ------------------------------------------ | ------------ | ---------------------------------------------------------------------------------------- |
| [#15](https://github.com/HassanG04/lolys/pull/15) | `cdb6836471a8dcd4890283ba33311a08b8fceeae` | `6584566c111eea419bb98ca841330a71f9f71883` | 4 passed     | Squash tree exactly equals verified head tree `441acdb6b6d938d6a873db83a7aad28afdad5c3a` |
| [#16](https://github.com/HassanG04/lolys/pull/16) | `729dd23310b0a05fe89155f202037ed01f2c5b48` | `cd96bcff1c19181ee9650889cbb429b5266adb2a` | 4 passed     | Squash tree exactly equals verified head tree `64da02046ddaed2c84d00634c317369306ee323d` |
| [#17](https://github.com/HassanG04/lolys/pull/17) | `49022b0d9318e15dbb3ae18998cd986221044d2c` | `fe5720004116117f4e93a8c33482295b01421f0c` | 4 passed     | Squash tree exactly equals verified head tree `70988fd599de949c00a6662a6c4178f29f10f1e9` |
| [#18](https://github.com/HassanG04/lolys/pull/18) | `e3b0cb43ffaef72f73e471499a39e5c01ec66f2c` | `e96debd8efc013d6060431393d1c186f741e7bc6` | 5 passed     | Squash tree exactly equals verified head tree `905c1b699a7d0f28232f3ade224c882b7c9bb9d0` |
| [#19](https://github.com/HassanG04/lolys/pull/19) | `193ad944c36d2ea67ac25a18ab979cc040327e5f` | `02b46c407033ccb5f693b0396ebf141e195a0a7b` | 6 passed     | Squash tree exactly equals verified head tree `363fc32576a40cea09f192319c0119e057f1469c` |

PR20 carries this execution record, the historical plan, the owner's unchanged payment amendment, and the shared progress update. Its final head, check results and merge SHA are available on [#20](https://github.com/HassanG04/lolys/pull/20); a document cannot embed its own final merge SHA. Merge PR20 only after its updated-head checks pass. The final PR description records the completed cleanup and final-main checks.

## Verification and resolution

- Every actual child replay used its recorded cutoff after the preceding squash existed. PR16-19 replayed cleanly and their trees exactly matched the original approved snapshots. The duplicate historical public-demo-key fingerprint patch in PR19 was skipped because PR18 had already integrated it.
- Full local `npm run verify` passed after each PR16-19 rebase. PR16: 55 application + 106 tooling tests; PR17-19: 55 application + 111 tooling tests each. Lint, formatting, strict type checking, production builds, source/build secret checks and bundle guards passed. PR17-19 also ran the migration guard.
- GitHub's static, unit, build and roadmap checks passed on each merged head. PR18 additionally passed real Gitleaks rejection/history checks; PR19 additionally passed Semgrep rejection tests and the strict scan. Older-head checks were not reused for rebased commits.
- Replays preserved roadmap statuses, package manifests/lockfiles, translations and source files. No dependency merge or schema merge occurred. Database-type regeneration and migration timestamp changes are therefore not applicable to this six-PR sequence; they remain required when preparing database PRs.
- PR20 adds documentation only. Its final local verification and remote-check evidence is recorded in its PR description. The owner payment amendment remains byte-identical to the supplied attachment.
- No unfinished security E2E draft or shared database was executed, reset or changed. WIP checkpoints `ee22392`, `745c787`, `6d8fcbc` and Anti-Gravity's subsequent `fb16222` remain preserved.

## Cleanup and remaining work

The starting GitHub count was 48 branches including main. The six merged heads are the only cleanup targets, yielding 42 from that original set once PR20 is merged and removed. Enabling the existing Dependabot configuration also opened five new automated update branches (PR21-25), so the expected live total is 47 after cleanup. These five PRs are outside the approved sequence. Each target must still match its verified head, its squash commit must be an ancestor of current main, and the squash tree must equal the verified source tree before local cleanup. Other branches and Anti-Gravity's paused checkout remain intact.

Of the 41 remaining published development branches, 32 carry payment work covered by the existing hold and nine need dependency-specific PR preparation. Counting local-only branches as well, the payment hold covers 40 branches. No held branch was merged. The 15 historical local foundation snapshots from PR13/14 are outside this cleanup set.

The next preparation starts with the existing T-1.01/T-1.02 database foundation and its dependencies, then the T-1.09 database CI branch. These pre-squash development histories need reconciliation with the newly integrated guards, isolated database verification, pgTAP and regenerated types before a fresh PR can be considered ready. The full dependency queue remains in the historical plan. A roadmap task status has not been changed merely because its branch was merged.

Payment branches remain excluded until they satisfy [the owner amendment](../spec/payment-flow-change.md), including approval before QR access, saved addresses, payment/shipping enforcement and the specified database and end-to-end tests.

## New automated dependency PRs

Dependabot opened these while the approved sequence was being executed. The snapshot below is a separate review queue, not approval to merge:

| PR                                                | Update                 | Checks at observation                  | Disposition                                                   |
| ------------------------------------------------- | ---------------------- | -------------------------------------- | ------------------------------------------------------------- |
| [#21](https://github.com/HassanG04/lolys/pull/21) | @types/node 24 → 26    | Five passing                           | Review compatibility with the pinned Node24 runtime first.    |
| [#22](https://github.com/HassanG04/lolys/pull/22) | ESLint9 → 10           | Static, build, unit and roadmap failed | Hold; retain the owner-approved compatible toolchain.         |
| [#23](https://github.com/HassanG04/lolys/pull/23) | Prettier3.9.9 → 3.9.10 | Five passing                           | Separate dependency review; not part of the six approved PRs. |
| [#24](https://github.com/HassanG04/lolys/pull/24) | @eslint/js9 → 10       | Static failed                          | Hold; review with ESLint/plugin compatibility.                |
| [#25](https://github.com/HassanG04/lolys/pull/25) | TypeScript6 → 7        | Static, build, unit and roadmap failed | Hold; retain the owner-approved compatible toolchain.         |

These heads were created before the static-analysis workflow reached main; fresh preparation must include current-main security checks. No dependency version was changed as part of this merge sequence.

## Historical plan

[MERGE-PLAN.md](MERGE-PLAN.md) preserves the before-merge inventory and original conflict analysis. Its old head hashes, pending statuses and rebase commands are historical evidence; do not rerun those commands against already merged PRs. The verified merge table above and live PR20 status take precedence for execution state.
