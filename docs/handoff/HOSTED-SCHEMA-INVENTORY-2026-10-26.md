# Hosted schema inventory — 2026-10-26

Task: T-2.06c, hosted database reconciliation after the profile-loading repair.
Main now contains PR #55 at `2e298af`; this was confirmed by fetching origin.
This report is an inventory assessment, not a deployment or launch sign-off.

## Confirmed from the owner's export

The owner ran the public table/column inventory in Supabase after the migration
history query failed with `42P01`: `supabase_migrations.schema_migrations` does
not exist. This establishes absent CLI history, not the absence of every schema
change. The method used to create the existing schema remains unconfirmed.

Compared the supplied 13-table inventory with the fully migrated isolated local
Supabase database, using the same PostgreSQL catalogue functions:

| Object                            | Hosted evidence                          | Expected implementation                                                              |
| --------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------ |
| `profiles.postal_code`            | Present, type text                       | Saved address field exists; nullability/validation not shown by the first inventory. |
| `orders.ship_postal_code`         | Present, type text                       | Order snapshot field exists; nullability/validation still needs checking.            |
| `profiles.avatar_url`             | Absent                                   | Added by `20261018160000_customer_profile_photo.sql`.                                |
| `public.customer_notifications`   | Absent                                   | Added by `20261018140000_customer_notifications_and_suggestions.sql`.                |
| `public.customer_suggestions`     | Absent                                   | Added by the same notification/suggestion migration.                                 |
| `public.admin_occasion_reminders` | Absent                                   | Added by `20261018180000_occasion_reminders.sql`.                                    |
| RLS flags                         | Enabled on all 13 reported public tables | Policy expressions, grants and database MFA enforcement were not exported.           |

The reference has 16 public tables. The other 12 supplied tables match the
reference's ordered column names and types. The only column-list difference in
`profiles` is the missing avatar field. This comparison does not establish that
constraints, function bodies, triggers, privileges, or seed/configuration data
match the repository.

Analytics lives in a separate `analytics` schema, so its absence from the first
public-only inventory does not prove analytics is missing. The homepage editor
and payment settings also cannot be assessed from column names: several related
migrations change functions and setting rows without creating a new table.

## Next evidence: one read-only export

Use [hosted-schema-audit.sql](../runbooks/hosted-schema-audit.sql) in the SQL Editor
of the same project (`wcdkrgrceczeuttnijwf`). Run the whole file and export/copy
the `schema_audit` result as JSON or CSV. It is one row, avoiding the editor's
100-row limit. It reads catalogues plus bucket configuration and setting key
names; it does not read accounts, orders, payment proofs, setting values,
credentials or function bodies. It changes no schema, data or migration history.

The export covers public/analytics relations and columns, nullability, enums,
definition fingerprints, function security flags and executable permissions,
RLS policies, triggers, relation/column/default grants, relevant role flags,
the three application storage buckets, and setting names/public visibility.

Fingerprints are comparison aids, not security checksums or migration proofs.
Differences may also arise from server versions, search paths or equivalent SQL
formatting. Review differing definitions separately rather than marking their
migrations applied. This report deliberately supplies no history-repair command.

## Recovery sequence after comparison

1. Compare the hosted export with the local reference and inspect differences
   in admin-role protection, MFA, order/payment functions, constraints and RLS.
2. Establish a reviewed description of the existing schema. Do not assume all
   migrations before a timestamp ran merely because some recent columns exist.
3. Have the owner take a backup and rehearse the proposed reconciliation on an
   isolated copy. Do not run the production workflow over untracked existing
   tables or mark all repository versions as applied.
4. Record only verified migration state using the supported CLI workflow;
   repair partially applied/divergent changes with a reviewed forward plan.
5. Preview and apply the remaining migrations in order, then verify hosted
   permissions, admin MFA and the approved order/payment/shipping flow.

Supabase's [migration guide](https://supabase.com/docs/guides/deployment/database-migrations)
explains that deployment compares local files with remote migration history.
[Migration repair](https://supabase.com/docs/reference/cli/supabase-migration-repair)
changes that history; it does not execute missing schema changes.

## Validation

The audit SELECT was executed successfully inside a read-only transaction
against `supabase_db_lolys-ci-auth-repair`. It also passed on a disposable local
database with only the required settings/bucket tables, no analytics schema,
and no migration history. That fixture was removed after validation; the
existing reference database was not reset or modified. The result contains 13 sections,
including 45 relations, 57 application functions, 49 policies, 23 triggers,
138 constraints and three storage buckets. Reference output remains ignored in
`.tools/hosted-audit-reference.local.json`. The query has no dependency on the
existence of the migration-history table or the analytics schema.

No application code, dependency or migration changed. No hosted write occurred.
The task remains doing until the cloud schema and owner acceptance are verified.
