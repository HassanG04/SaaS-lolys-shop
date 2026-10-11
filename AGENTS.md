# Agent instructions: Lolys' Accessories & Home

`roadmap.md` is the source of truth for scope, order and status. Read sections
0 and 1 first, the current task, and its referenced `docs/spec/` files. The
original root documents and Word plan are preserved; v1.1 supersedes the older
Word plan where explicitly stated in the specifications.

## Start each session

1. Read `.agent-state/project-progress.md`, any handover addressed to you,
   `git status` and `git diff`. Include untracked files in your review.
2. Fetch latest main when a remote exists. Never reset another agent's work.
3. Use Node from `.nvmrc`; run `npm ci --ignore-scripts` after lockfile changes.
4. Run `npm run roadmap:next`; resume a documented active task before new work.
5. Work on one task at a time on `agent/<task-id>-<slug>`.

## Commands

- `npm run verify`: lint, format, typecheck, tests and production build.
- `npm run test:unit`: application tests plus Node tooling tests.
- `npm run test:tooling`: Node tooling tests alone.
- `npm run roadmap -- status|check|next`: roadmap inspection.
- `npm run roadmap -- set T-x.yy done`: status update after verification.
- `npm run db:reset`, `db:test`, `db:types`: local database checks once implemented.
- `npm run test:e2e`, `analytics:test`: later task suites once implemented.

Unimplemented commands deliberately exit nonzero with the responsible task ID.
Never turn a missing check into a successful stub.

## Hard rules

- RLS on every table; database authority for prices, totals, stock and payments.
- Orders only through `place_order`; no raw SQL or dynamic string-built SQL.
- Admin requires database-enforced MFA (`aal2`); owner SQL alone promotes admins.
- Generic authentication responses; Arabic messages and catalogue error codes;
  never render raw error messages.
- Never read or print `.env*` values or commit secrets. Browser uses public key only.
- Upload JPEG, PNG or WebP only; signature-check, cap, rename and re-encode.
  Payment proofs are private.
- Append-only merged migrations; pgTAP, explicit grants and regenerated types.
- No main pushes or merges, production deployment or dashboard changes by agents.
- Strict TypeScript, no `any` or production non-null assertions.
- Feature folders; Supabase calls only in feature API files or `src/lib`.
- Arabic i18n, RTL, logical CSS, documented tokens, accessible controls, both themes.
- Security-sensitive changes retain SEC controls and require owner PR review.

The user's continuous-execution instruction authorizes normal implementation
within the documented architecture. When a genuine requirement conflict lacks
a documented default, record `OPEN_DECISION.md` and an Appendix G row; continue
unblocked work. Human-owned tasks stay human-owned. No fabricated remote CI,
database verification, human sign-off or launch claims.

## Coordination and finish

Codex implements; Anti-Gravity reviews and continues from the same workspace.
Update `.agent-state/project-progress.md` after each session with Current task,
Completed, Files changed, Tests executed, Problems found and Next action.

Before a token-limit stop, write `HANDOVER_TO_ANTI_GRAVITY.md` (or reverse
`HANDOVER_TO_CODEX.md`) with objective, completed/remaining work, every changed
file, exact error/expected/actual/possible cause, and the next exact command.
The receiving engineer reads the handover, progress, diff and status first.

Set a task done only after all its criteria and `verify` pass. Log results in
Appendix G. Prepare/open the PR when an upstream exists; never merge it.
