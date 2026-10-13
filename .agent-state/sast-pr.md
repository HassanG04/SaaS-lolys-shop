## Task

T-7.06: Static analysis. Stacked on PR 18; contains tooling only.

## What changed

Adds a read-only `sast` job with pinned Semgrep and maintained TypeScript/React
rules. Seven project rules reject HTML injection, eval/function construction,
raw error rendering, unapproved fetch destinations and privileged-role mentions.
Twelve planted examples must fail the real scanner; safe recovery must pass.
Metrics and inline suppressions are off; logs contain locations/rule IDs, not source.

## How I verified it

Full local verify: 166 tests, lint, formatting, typecheck, build and existing guards.
Both this branch and Anti-Gravity's source at 56529b3 scan without high findings.
Real-scanner suite passes: all 12 planted cases, clean recovery, partial-parse
rejection and missing-executable failure. Remote CI is pending.

## Security note

SEC-07, SEC-15, SEC-16, SEC-22 and SEC-24. Owner workflow review is required.
No secrets, production access, database changes, deployment or UI changes.

## Risks and follow-ups

Registry packs require network access and update upstream; failures block CI.
Same-origin literal fetch paths only; no cloud hostname has been approved yet.
Intraprocedural error analysis complements existing tests and review. Lint and
typecheck retain full syntax validation. Owner enables the required `sast` check.
Preserve Anti-Gravity's newer app when integrating this tooling-only stack.
