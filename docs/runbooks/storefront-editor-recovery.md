# Restore the homepage content editor

T-3.10f completed, 2026-10-29. The owner confirmed real purchases and granted the store
owner existing admin privileges. This does not introduce an `owner` role.

## Confirmed cause

The live site's public content request returned zero visible rows (PGRST116).
The owner's subsequent read-only SQL result, run as `postgres`, confirms:

- `content_rows = 0`; `admin_update_storefront_content` is absent.
- Settings RLS is enabled, both expected read policies exist, authenticated
  SELECT is granted, and the product image bucket exists.
- The MFA helper fingerprints match the reviewed definitions in the repair.

The browser reference `a16dfbbb` identifies the displayed error; the cause is
missing hosted editor setup. The homepage already contains the inline editor.
Installing its database support lets the current deployed UI use it without
requiring dashboard navigation. The frontend patch improves failure recovery.

## Owner procedure

1. Review [storefront-editor-repair.sql](storefront-editor-repair.sql) and take a
   current database backup using the project's backup procedure. This is the
   narrow editor repair, not the broader recovery from draft PR #56.
2. Open a **new SQL Editor query** in the same project, as `postgres`. Replace
   the old repair text with the entire current file. Keep
   **`v_apply constant boolean := false;`** near the top. Run the whole statement.
   It installs and checks the feature inside a subtransaction, then automatically
   rolls it back. The editor may show "Success. No rows returned"; if notices are
   shown, expect `REHEARSAL PASSED`. No editor data is saved in this mode.
3. After a successful rehearsal and your review, open
   **[storefront-editor-APPLY.sql](storefront-editor-APPLY.sql)**. Create another
   **new SQL Editor query**, paste the whole file and run it. No edits are needed:
   apply mode is already enabled. Do not append ROLLBACK or select fragments.
   The atomic installation is followed by a read-only result:
   `content_rows: 1`, `settings_rls: true`, `save_function_exists: true`.
   If an error occurs, paste it for review; do not remove the guards. A busy
   database can safely fail the five-second settings lock timeout; use a quiet
   period. Existing RLS remains enabled in both modes.
4. Run [storefront-editor-check.sql](storefront-editor-check.sql) again. Expect
   one public object-valued row with a revision, plus the save function with
   authenticated execution allowed and anonymous execution denied.
5. Reload the homepage with the store owner's verified MFA session. Open
   **Edit store content**, change both translations of a real heading and
   publish. The page must stay on `/`; verify persistence after reload and
   check the published text in a guest browser. Keep the audit entry as evidence.

The SQL embeds the unchanged merged `20261018100000_storefront_content.sql`.
It adds only the content row and save RPC. Existing merchant settings are checked
for exact preservation; orders, accounts, stock, payment functions and migration
history are not rewritten. It keeps database MFA, validation, audit and conflict
handling. A repeat application stops instead of overwriting published content.

After this narrow repair, **do not replay the old combined repair in PR #56**:
its preconditions will correctly reject the now-partially-repaired schema.
T-2.06c still needs a fresh full audit and migration-history reconciliation.
Do not mark all migrations applied or rerun `setup_remote_supabase.sql`.

## Earlier failed attempt

The first multi-statement wrapper failed in the owner's SQL Editor with
`42P01: lolys_editor_preserved_settings does not exist`. Its temporary-table
lifetime was unsuitable for that execution. The owner's follow-up diagnostic
confirmed zero content rows, no save RPC and RLS still enabled. The exact client
transaction behavior was not observed; no partial installation was inferred.
The replacement is one atomic DO statement with an in-memory snapshot and no
temporary tables. Discard the earlier SQL and its final-ROLLBACK instructions.
The owner subsequently confirmed successful rehearsal, but the next diagnostic
still showed no installation. The APPLY file removes the manual mode-edit step
and returns explicit installation metadata. The owner then returned
`content_rows:1, settings_rls:true, save_function_exists:true` and confirmed
homepage opening, bilingual publication and reload persistence.

## Frontend recovery and verification

Missing setup now gets bilingual guidance with homepage retry. Failed publishing
retains the draft; permissions and other errors still use `AppError`. The
browser never fabricates a database revision or reports a failed save as success.

Local evidence: 914 application tests, including 19 focused editor tests, passed;
eight mocked Chromium cases cover both languages/themes at 360/1280px. The SQL
rehearsal verified both false/true modes, existing-record preservation and
rejection of changed MFA helpers, disabled RLS, absent audit triggers and repeat
installation. All 25 content pgTAP assertions pass; no shared database was reset.
Local tests are separate from live acceptance. The owner supplied the installation
receipt and confirmed all live publish/reload checks; T-3.10f is complete.
Do not rerun the repair on this now-installed schema.
