# Install the confirmed missing hosted features

This is the owner-run repair for the 2026-10-29 Supabase diagnostic. It is for the
existing shop with real orders and an already repaired storefront editor. It is
not a fresh database setup or a replacement for migration-history reconciliation.

## Run in Supabase

1. Keep a current database backup before applying a schema change to the live shop.
2. Open the shop's Supabase project → SQL Editor → New query. Use the `postgres` role.
3. Copy **all** of [hosted-features-APPLY.sql](hosted-features-APPLY.sql), including
   `begin;`, `commit;` and the final check. Run the entire query without a text selection.
4. Expect one `feature_check` JSON object with **all eleven values `true`**.
5. Reload the website. Check a profile photo, suggestions, notifications and the
   admin reminders/demand pages. The forecast download also requires the CSV UI
   deployment; installation alone does not activate forecasting.

The file applies changes immediately; there is no `v_apply` switch. If a safety
check raises an error, the transaction is rolled back. Share the exact error;
do not remove its guard or run isolated fragments. A lock timeout means the shop
was busy: retry the whole file during a quiet period. Running it again after a
successful installation is intentionally refused. Use the separate read-only
[CHECK file](hosted-features-CHECK.sql) to inspect an installed database.

## Changes and preservation

- Adds `profiles.avatar_url`, its ownership/format validation and a public avatars
  bucket limited to JPEG/PNG/WebP and 2 MB. Payment proofs stay private.
- Adds customer notifications and suggestions, wishlist demand reporting and
  admin occasion reminders. New tables have RLS and explicit privileges. Admin
  functions retain the existing database `aal2` requirement.
- Adds the two postal-code guards. New orders and newly saved/changed complete
  addresses require five digits. Historical missing postal codes remain unchanged;
  they do not block unrelated profile updates or order fulfillment. This does
  **not** claim that old missing addresses have been backfilled or that a global
  `NOT NULL` conversion has been completed.
- Extends the existing, fingerprint-checked settings validator with reminder
  configuration while preserving the latest InstaPay link validation. Extends
  the existing anonymization function to cover the newly installed features.
  Neither function is invoked by the repair.
- Adds the admin-only aggregate CSV function from PR #63. Its minimum export gate
  is 56 completed days since the first qualifying sale and 30 qualifying orders.
  This is a collection/export threshold, not evidence of a reliable trained model.
  It never changes product prices or applies discounts.

Existing accounts, orders, order items, stock, payment configuration and homepage
content are not rewritten. Checkout, payment-instruction, editor and MFA function
definitions and their permissions are checked for preservation. No migration
history is invented, no production query is executed by the agent, and no missing
feature is inferred to be installed merely because a frontend PR was merged.

## Reproducibility and verification

`node scripts/build-hosted-features.mjs` generates the complete APPLY file from
selected existing migrations and the fragments in `hosted-features/`. It excludes
the historical editor/payment redefinitions and intermediate settings validators.
The CSV SQL/test copies are from `agent/T-9.15a-forecast-csv` at `3aa5117`; the
generator test checks SQL parity once that migration is present on the branch.

`node scripts/rehearse-hosted-features.mjs` requires the existing local
`supabase_db_lolys-ci-auth-repair` container. It clones schema only into a named
disposable database, creates synthetic records and the reported missing-feature
state, then tests the installation and deletes only that clone. It never resets
the shared Supabase stack or copies customer rows. It checks unknown-function,
MFA, RLS and partial-install refusal; rollback after a final-stage injected error;
existing-record preservation; duplicate-application refusal; and historical-order
fulfillment. Existing pgTAP suites cover the new APIs, RLS/MFA, postal guards,
editor and CSV behavior. Actual results are recorded in shared project progress.

Verified locally on 2026-10-29: 172 database assertions, eight safety/preservation
scenarios and all twelve `npm run verify` gates (917 application tests and 208
tooling tests). No failures or skipped tests.

Owner confirmation, 2026-10-29: the post-installation `feature_check` returned all
eleven values `true`, including RLS on the checked tables, both postal triggers,
the CSV RPC, editor presence and private payment proofs. The owner performed the
hosted application; the agent did not. **Do not run APPLY again on this shop.**
Use CHECK for later read-only inspection. This confirms the listed database
objects and flags; authenticated website journeys and forecast data readiness
still need their own verification.

The installer is tailored to the supplied diagnostic and known repository
definitions. Its runtime guards supplement that older snapshot; they are not a
claim that the entire current cloud schema has been audited.
