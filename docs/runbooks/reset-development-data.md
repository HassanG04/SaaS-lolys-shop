# Development data reset

Use [`reset-development-data.sql`](./reset-development-data.sql) only for a
deliberate owner-approved reset of the connected Supabase project. It includes
all customer and admin accounts and all orders. The default transaction rolls
back after showing before/after counts; changing it to `COMMIT` is a destructive
action.

The script preserves `audit_log` and the append-only stock ledger. It refuses to
continue when orders or users are referenced by `stock_movements`, or when
Supabase Storage still has objects owned by a user. Remove Storage files with
the Storage API or Dashboard first; deleting `storage.objects` rows with SQL
does not delete the underlying files. Product quantities are not rebuilt, so
inventory must be reconciled separately after a committed development reset.

Afterward, the owner must recreate the first account and promote it through the
documented owner-only runbook, then enroll MFA again. Never run this from the
browser or expose it as an application feature.
