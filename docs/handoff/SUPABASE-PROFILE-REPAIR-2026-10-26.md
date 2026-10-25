# Hosted profile and admin-role repair — 2026-10-26

## Confirmed cause

Story: sign in on the storefront → load the signed-in user's `public.profiles`
row through the same Supabase client → display the database role → require MFA
before admin access.

The deployed site `https://lolys-shop.pages.dev/` connects to
`https://wcdkrgrceczeuttnijwf.supabase.co`. The inspected entry asset was
`/assets/index-Dcx1JNxS.js` (HTTP 200). Public read-only probes requested zero
profile rows; no account records or secret credentials were retrieved.

| Probe                                           | Observed result                                                 | Meaning                                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Full deployed profile projection, `limit=0`     | HTTP 400 / `42703`: `column profiles.avatar_url does not exist` | Hosted schema lacks a field required by the deployed app.                               |
| Same projection without `avatar_url`, `limit=0` | HTTP 401 / `42501`: `permission denied for table profiles`      | Expected anonymous table restriction. This is not evidence of a broken signed-in grant. |

The old loader caught every profile error, returned null, and the provider
defaulted to `customer`. This can conceal a correctly stored admin role. The
actual role of the owner's account has not been inspected or modified.

Anti-Gravity's local commit `89df316` adds a broad fallback to only three
columns. It is preserved in the primary checkout. This repair, based on current
main, narrows compatibility to the confirmed missing optional avatar field,
preserves the remaining profile/address fields and exposes other failures.
Its earlier test claims are not verification evidence for this repair.

## Code behavior

- Both profile queries filter by the signed-in user ID and use the existing
  public client with the user's session. RLS remains authoritative.
- Only the exact missing-avatar error retries without that optional column.
  Permission, connection and other schema errors map to safe `AppError` values.
- A missing row or failed profile read shows a localized retry panel on account
  and admin routes. It does not silently present a customer permission denial.
- Retry reloads the database profile without signing out. Unknown roles and
  mismatched profile IDs are rejected; user metadata never grants admin access.
- A stale profile request cannot restore permissions after sign-out or after a
  newer profile load. Database MFA requirements and the existing admin MFA
  enrollment/challenge ladder remain intact.
- Profile-query code loads only when a user exists, keeping it off the public
  storefront's initial download.

## Owner action: reconcile the hosted schema

The compatibility fallback is not a substitute for deploying migrations.
Photo uploads still need the full photo migration and storage policies.

1. Confirm the Supabase dashboard project reference is
   `wcdkrgrceczeuttnijwf`, matching this deployed site. A different dashboard
   project will not change this site's accounts.
2. Run these read-only diagnostics in that project's SQL Editor:

   ```sql
   select column_name, data_type, is_nullable
   from information_schema.columns
   where table_schema = 'public' and table_name = 'profiles'
   order by ordinal_position;

   select version
   from supabase_migrations.schema_migrations
   order by version;
   ```

3. Compare the recorded versions with the repository's `supabase/migrations/`.
   `20261018160000_customer_profile_photo.sql` introduces `avatar_url`, its
   constraints, grants, triggers and avatar storage policies. Later migrations
   also update avatar cleanup. If migration history says it ran but the column
   is absent, investigate schema drift before running deployment again.
4. Follow [the database deployment runbook](../runbooks/deploy-db.md): take the
   required backup, review all pending migrations in order, validate staging,
   then have the owner run **Deploy Database to Production** on `main` with
   confirmation `PRODUCTION`. Verify its project secret targets the project
   above. Do not apply only an ad-hoc `ADD COLUMN`, skip migrations, edit applied
   migrations, or reset the cloud database.
5. Recheck the column and migration history. A PostgREST cache reload alone
   cannot create a column that does not exist.
6. Follow [first-admin diagnostics](../runbooks/first-admin.md) to inspect the
   exact account UUID and `public.profiles.role`; promote only if required using
   the owner-only procedure with `RETURNING`. The role is read from the database,
   not a client-editable metadata field or a custom cached role claim.
7. Reload the storefront and open `/admin`. An admin must enroll or challenge MFA
   unless the current session already satisfies `aal2`. Confirm profile display,
   admin navigation, and a permitted read in the dashboard. Recheck avatar upload
   only after the hosted migration is verified.

## Verification and release state

All 12 local `npm run verify` gates passed: **908 application tests**, including
18 new profile/session regressions, and **204 tooling tests**, with zero failures
or skips. The production build, secrets scan, and unchanged initial bundle budget
passed (**199,864 / 200,000 gzip bytes**). The final reviewed files were also
linted after the background-refresh adjustment.

The isolated local Supabase stack was reset from unchanged migrations and seeded
with test users. Admin, security and accessibility browser suites passed:
**28 passed, zero failures/skips**, including actual sign-in, MFA enrollment and
challenge, customer/admin separation, private order/proof access restrictions,
step-up checks, neutral authentication responses and CSP checks. Docker was
initially stopped; it was started before these tests. No cloud database was reset.

Roadmap validation passes with 153 tasks. Local logs are ignored files:
`.tools/profile-verify.local.log`, `.tools/profile-build.local.log`, and
`ci-e2e.local`. Exact-head GitHub CI and merge state belong to the repair PR;
these local results are not a claim that remote checks have passed.

The owner explicitly authorized merging this repair after verification. No
hosted SQL, account changes, schema deployment or dashboard changes have been
performed by Codex. Live signed-in confirmation remains an owner acceptance
step because no production account session was supplied.
