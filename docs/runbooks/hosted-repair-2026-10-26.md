# Repair the audited hosted schema

Task T-2.06c. Prepared for the owner's 2026-10-26 exports from the Lolys project,
not for other databases. No hosted change has been performed by Codex.

## What the final export established

- `place_order` differs from main only in comments/whitespace after normalization.
  Stock locking, prices, payment status and saved-address behavior match main.
- The custom `get_payment_instructions` allows a role-only admin exception without
  MFA and returns an incompatible `eligible:false` response before approval.
  The specification requires order-owner-only access and PAY-007 before approval.
- API roles have CREATE on `public`; that is unnecessary. Missing sequence grants
  do not require blanket USAGE: the catalogue uses identity columns and its
  insertion tests pass without browser sequence grants.
- The cloud also lacks the content editor, avatars, notifications/suggestions,
  occasion reminders and legacy postal-update guards already merged in main.
  It has old settings/anonymization functions and no CLI migration history.

## Reviewable repair

[hosted-repair-2026-10-26.sql](hosted-repair-2026-10-26.sql) is generated from the
reviewed migration files, in dependency order, plus the exact current checkout
function. It adds missing objects and restores the tested payment API. The new
`20261026100000_explicit_api_schema_permissions.sql` also removes schema CREATE
from browser roles, explicitly grants reminder access under the existing AAL2
policy, and limits notification changes to `is_read` under per-user RLS.

Existing orders, users, products, stock and delivery prices are not rewritten.
The legacy postal guard permits unrelated changes to historical records while
requiring five digits for new addresses/orders; no fake postcode is backfilled.
Existing merchant setting values are preserved. An empty InstaPay recipient may
be filled with the already approved `alaa.ahm9624@instapay`; a nonempty recipient
is preserved. This does not generate or verify a real merchant share link/QR.
The old combined `setup_remote_supabase.sql` must not be rerun.

The file is one transaction with lock/statement timeouts, critical definition
fingerprints, required-state checks and a merchant-setting preservation check.
It refuses an unexpected schema or a second application. Keep these guards.
It does not create or modify migration-history records.

## Owner procedure

1. Review the PR and take a current database backup using the project backup
   procedure. Coordinate a short maintenance window; table locks can briefly
   block writes, and a busy database may safely fail the five-second lock timeout.
2. Open the generated SQL above in the same project's SQL Editor as `postgres`.
   Run the **whole file**. The final statement is **`rollback;`**, so this first
   run tests the statements without saving any change. Return the result or exact
   error if a guard fails; do not remove the guard or run individual fragments.
3. After the rehearsal succeeds and the owner approves application, change only
   the final `rollback;` to `commit;` and rerun the **whole file**. The result text
   describes statement completion; only COMMIT persists the changes. A queued
   schema-cache refresh is delivered on commit.
4. Run [hosted-schema-audit.sql](hosted-schema-audit.sql) again and retain/export
   the result. Confirm the three new tables, avatar column/bucket, missing APIs,
   postal guards and explicit permissions. Reload the signed-in website and
   confirm the admin/MFA, content editor and approved payment flow.
5. Keep normal database deployment disabled until the verified final schema is
   reconciled with CLI history. Repairing schema and recording migration history
   are separate steps; do not mark every timestamp applied simply to silence the
   CLI. No historical execution is inferred from this repair.

If an execution fails, the transaction cannot partially commit. Some SQL clients
keep an aborted transaction open; use `rollback;` before another attempt. Restore
from the backup only under the documented owner procedure; do not reset production.

## Verification evidence

An isolated schema-only clone reproduced the missing features, legacy postal
constraints, exported functions and absent defaults. It used synthetic records,
not a copy of customers. The rehearsal rolled back; local commit preserved the
fixture records and fees; a repeated application was refused. All **681 pgTAP
assertions** passed on the recovered fixture. A separate empty application schema
also applied all 35 migrations and passed all **681 assertions**.

The recovery test harness grants the service role access only to the three new
tables for privileged fixture setup; those harness grants are not in the owner
repair and do not alter the tested browser roles. No shared stack was reset.
The new 18-assertion suite checks schema creation denial, private notification
permissions, AAL1/AAL2 denial of another customer's payment instructions, owner
payment access and reminder MFA. The visitor notification test was strengthened
from an empty result to permission denial; no assertions or gates were removed.

The exact generated artifact is checked by two Node tests. Regenerate after any
source edit with `node scripts/build-hosted-repair.mjs`; verify with
`node scripts/build-hosted-repair.mjs --check`. Existing migrations are unchanged.
The repository typecheck passed, and Supabase CLI type generation from the fresh
local schema structurally matches `src/types/database.types.ts` after removing
CLI status text and formatting whitespace.

This validates local recovery behavior, not live acceptance or launch readiness.
