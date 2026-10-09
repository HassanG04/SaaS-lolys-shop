# Shared project progress

Updated 2026-10-09 (Africa/Cairo). Active: Codex. The owner paused external
Anti-Gravity after concurrent work; preserve its T-0.07 checkpoint below.

```yaml
Current task: T-0.06 remote CI verification for the foundation PR
Completed:
  - T-0.01 to T-0.05 implemented and locally verified, including 28 tests.
  - Owner approved TypeScript 6 and ESLint 9 in OD-001; required lint plugins retained.
  - SHA-pinned read-only CI v1 with static, unit, build and roadmap jobs prepared.
  - Private remote connected; task branch based on the original README-only main.
  - Preserved Anti-Gravity's 21 partial theme files in a SHA-256-checked local checkpoint.
Files changed:
  - Complete foundation inventory in .agent-state/changed-files.md and handover.
Tests executed:
  - Full local verify passed before the concurrent theme edits.
  - Coverage command and 109-task roadmap validation passed.
  - Source Markdown, Word and split SQL integrity checked.
Problems found:
  - Anti-Gravity marked T-0.01 to T-0.06 done before PR checks; reconciled to doing pending evidence.
  - T-0.06 deliberate lint-failure probe and final green CI remain pending.
  - Security-sensitive workflow requires owner review (SEC-16, SEC-24).
  - Docker absent (H-08); database work cannot be verified locally yet.
  - Logo and separate style reference absent; documented placeholders retained.
Next action: Verify foundation snapshot, publish draft PR, prove CI catches bad lint, remove probe and confirm four green jobs; then restore T-0.07 work.
```

## Continuation

Repository: https://github.com/HassanG04/lolys (private). Branch:
`agent/T-0.01-bootstrap`.

Use Node 24.21.0 from `.nvmrc`; portable runtime is in ignored
`.tools/node-v24.21.0-win-x64`, npm 11.19.0. All installs disable scripts.

OD-001 is resolved by explicit owner approval. Original root specs remain unchanged.

Anti-Gravity's partial T-0.07 work is preserved at
`.tools/anti-gravity-t007-checkpoint/inventory.json` with hashes and the original
21 files. Five shared files need selective restoration after the foundation PR;
the 16 new files were moved aside so they cannot invalidate foundation checks.
The checkpoint is intentionally local and ignored. Restore before handing this
workspace back. Do not replace unrelated verified work or assume themes are done.

Later-task command stubs exit nonzero; T-0.09 adds bundle/secret guards, T-2.03
adds i18n checks. There is no storefront, authentication, database, payment or
admin implementation yet.
