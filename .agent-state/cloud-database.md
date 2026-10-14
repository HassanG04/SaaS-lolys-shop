# Cloud database preparation — 2026-10-11

The owner confirmed that no Supabase Cloud project exists yet. The implemented
database is local development infrastructure. Hosting is already specified by
D-02/D-08; moving to managed Supabase does not require replacing the app backend.

## Owner setup

1. Open the [Supabase dashboard](https://supabase.com/dashboard) and create the
   staging project named `shop-staging` (T-1.11). Select your organization and
   region there, and keep the database password in your password manager.
2. Share only the dashboard URL/project reference for coordination. Do not paste
   database passwords, access tokens or privileged keys into chat or the repo.
3. When the deployment workflow is ready, configure the GitHub secrets named
   `SUPABASE_ACCESS_TOKEN`, `STAGING_PROJECT_REF`, `STAGING_DB_PASSWORD` directly
   in GitHub. The frontend preview receives only `VITE_SUPABASE_URL` and the
   public `VITE_SUPABASE_ANON_KEY` for staging, per the existing app contract.
4. Create a separate production project in T-1.13; production receives its own
   project reference, database password and frontend configuration. Apply no
   schema or real data before the owner-controlled deployment/launch gates.

The roadmap specifies Cloudflare Pages for the frontend (T-0.11). That hosting
setup is still pending; a cloud database alone does not publish the website.
Staging uses synthetic data only. Keep local tests separate from both hosted
databases. Local database resets must never be redirected to a cloud project.

## Engineering prerequisites

- T-1.09b: protect migrations already in main against edits, deletions or renames.
- T-1.09: run local database tests, concurrency tests and generated-type checks
  in CI. Anti-Gravity's completed database code must be integrated for this job.
- T-1.12: review staging deployment and manually triggered production workflows,
  then validate staging after its project and secrets exist.
- T-8: email delivery, security settings, real catalogue, backups, admin onboarding
  and launch verification remain required before accepting real customers.

No hosted project was created or contacted in this session. No credentials were
read, stored or requested. T-1.11/T-1.13 remain human-owned and incomplete.

## Migration guard operation

Fetch main before local verification; `npm run check:migrations` compares with
`origin/main` and rejects changes to its migration paths. New migration files
are allowed. Git's normal line-ending conversion is respected; SQL bodies are
not logged. Missing history fails instead of silently disabling the check.
CI fetches full history for the static job. PRs compare against main (including
stacked PRs); pushes compare against the event's previous commit, supplied as
`MIGRATION_BASE_SHA`. This is a repository check, not a connection to any database.
The database CI job and real merged-migration PR acceptance remain in T-1.09.

Reference: [Supabase environment management](https://supabase.com/docs/guides/deployment/managing-environments)
supports the documented local/staging/production migration workflow.
