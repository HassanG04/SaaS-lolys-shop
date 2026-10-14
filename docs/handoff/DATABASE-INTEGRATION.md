# Database integration — 2026-10-15

## Scope and source

Branch: `agent/T-1.09-database-integration`, based on main `4dfb26c`.
Extracted only database, types, tests and database runbooks from Anti-Gravity's
published history through `cfac9d5` (T-1.16). The source CI branch `53f5110`
also contains older application/auth changes and duplicate guards, so its whole
history must not be merged. Current main's security workflows and guards remain.

This batch contains T-1.01–T-1.10, T-1.14–T-1.16 database work. T-1.09b was
already integrated. It excludes cloud deployment workflows, settings, payments,
checkout, application features and analytics. Original development branches and
Anti-Gravity's active checkout are preserved. No cloud database was changed.

## Corrections during reconciliation

- `protect_profile_role` now runs as the caller and checks database ownership;
  the old definer identity check could never reject an API caller. A separate
  test temporarily grants role-column updates to prove the trigger itself works.
  The service-role API is also rejected; owner SQL remains supported.
- Audit writes are internal only. API roles cannot execute `audit_event`, write
  the table, use its identity sequence, or truncate it. Real admin changes and
  owner SQL are still logged; update/delete immutability remains enforced.
- Tests now distinguish owner SQL from a service-role API, the removed role RPC
  from a permissions failure, and an RPC guard from an earlier ACL rejection.
  The length tests use the actual `shipping_fee` column and a valid user ID;
  cancelled-order reopening is tested with an actor allowed to reach the trigger.
- The concurrency runner no longer accepts an arbitrary database URL or chooses
  the first Docker database. It targets `lolys-db-integration`, verifies a local
  Docker endpoint, observes B actually blocked by A, checks ORD-007 and final
  stock/order counts, and cleans up only its fixtures.
- CLI 2.120.0 is pinned on main's lockfile. Generation validates CLI output before
  replacing types and has a non-mutating drift check. Credentials from CLI
  startup/reset are withheld from logs. Local ports are 5632x; TOTP is enabled.
- The nine migrations are new to main, so corrections were made before their
  first merge. Later branches must preserve these exact merged files and apply
  any further changes in new migrations. Do not restore the defective originals.

## Evidence

- Clean local stack startup and reset succeeded on PostgreSQL 17.
- Seed: 27 governorates, 4 categories, 6 products, zero delivery fees; all nine
  public tables (including audit history) have RLS.
- All 259 pgTAP assertions across 11 files passed.
- Five deliberately weakened controls caused test failures: RLS, inactive
  product visibility, favorite isolation, role-trigger identity, audit-helper
  permissions. Each mutation rolled back; all 259 assertions passed afterward.
- S7 passed: B blocked on A, A committed the last two units, B received ORD-007,
  stock was zero, sold count two, and exactly one order item existed.
- Types regenerated from this exact schema and a second generation matched.
- Full npm run verify passed: 57 application and 114 tooling tests, lint,
  formatting, strict TypeScript, production build and migration/token/secret/bundle guards.
  Remote CI is recorded separately in the PR.

## Merge and follow-up gates

T-1.09 remains doing until remote CI and its acceptance evidence are complete.
Task statuses on Anti-Gravity's branch are implementation reports, not proof
that those features reached main. Keep both histories when updating the roadmap.

Main ruleset 25090411 currently requires one approving review, resolved review
threads, a current base, and static/unit/build/roadmap/secrets/db/e2e/sast checks.
It blocks deletion and force-pushes. The API reports Code Owner enforcement as
false; CODEOWNERS and the repository instructions still require owner review of
these sensitive changes. This batch adds `db`; `e2e` remains absent from main
until application/test integration. Do not substitute a successful stub or
disable the required gate. No merge or ruleset change is part of this batch.

Next prepare the existing auth/storefront/admin work against this verified
database baseline. The owner approval-first payment amendment remains the gate
for all InstaPay, payment review, payment settings and dependent checkout work.
