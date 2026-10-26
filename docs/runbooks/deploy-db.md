# Runbook: Database Deployment and Secret Management

Applies to tasks T-1.11, T-1.12, T-1.13 and database releases.

## 1. Overview and Architecture

Database schema and security migrations in `supabase/migrations/` are applied to remote environments via GitHub Actions workflows:

- **Staging (`db-staging.yml`)**: Continuous deployment on `push` to `main` touching `supabase/migrations/**`.
- **Production (`db-production.yml`)**: Manual gated deployment via `workflow_dispatch`, requiring explicit confirmation `PRODUCTION`.

Both workflows use pinned CLI actions, authenticate with project credentials stored securely in GitHub Secrets, and execute `supabase db push`.

---

## 2. Secrets and Environment Variables

In accordance with Section 3.2 and Section 3.3 of `roadmap.md` and `docs/spec/security-model.md`, secrets are never committed to the repository, printed to logs, or handled by agents.

### GitHub Actions Secrets (Owner Configured)

| Secret Name              | Purpose                                                              | Target Workflow                       |
| ------------------------ | -------------------------------------------------------------------- | ------------------------------------- |
| `SUPABASE_ACCESS_TOKEN`  | Personal Access Token generated in Supabase Account Settings         | `db-staging.yml`, `db-production.yml` |
| `STAGING_PROJECT_REF`    | Reference ID for the staging Supabase project (e.g., `shop-staging`) | `db-staging.yml`                      |
| `STAGING_DB_PASSWORD`    | Database password set for staging database                           | `db-staging.yml`                      |
| `PRODUCTION_PROJECT_REF` | Reference ID for the production Supabase project                     | `db-production.yml`                   |
| `PRODUCTION_DB_PASSWORD` | Database password set for production database                        | `db-production.yml`                   |
| `PRODUCTION_URL`         | Public API URL for production (e.g. `https://<ref>.supabase.co`)     | `keepalive.yml` (free tier only)      |
| `PRODUCTION_ANON_KEY`    | Public anonymous API key for production                              | `keepalive.yml` (free tier only)      |

### Cloudflare Pages Environment Variables

| Variable Name            | Environment | Value Description                                           |
| ------------------------ | ----------- | ----------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Preview     | Staging API URL (`https://<staging-ref>.supabase.co`)       |
| `VITE_SUPABASE_ANON_KEY` | Preview     | Staging public anon key                                     |
| `VITE_SUPABASE_URL`      | Production  | Production API URL (`https://<production-ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Production  | Production public anon key                                  |

---

## 3. Important: Free-Tier Project Pausing

> [!WARNING]
> Free-tier Supabase projects automatically pause after 7 consecutive days of inactivity (no incoming database queries or REST calls).
> A paused project **refuses connection** from GitHub Actions (`supabase link` and `supabase db push` will fail with network or connection timeout errors).

### Automated Keep-Alive Workflow (`keepalive.yml`)

For projects operating on the Supabase free tier, `.github/workflows/keepalive.yml` (T-8.05) runs on a weekly schedule (`cron: '0 5 * * 1'`) and sends an authenticated REST GET request to `/rest/v1/categories?select=id&limit=1` using `PRODUCTION_URL` and `PRODUCTION_ANON_KEY`. This weekly query registers database activity and prevents auto-pausing.

> [!NOTE]
> **Open Decision O-11:** If production uses a paid Supabase plan (Pro tier), databases never auto-pause and include automated daily backups. When on a paid plan, `keepalive.yml` can be skipped or disabled, and `PRODUCTION_URL` / `PRODUCTION_ANON_KEY` do not need to be configured in GitHub Secrets.

### Manual Unpausing Procedure

Before triggering a migration run if a project has paused:

1. Open the [Supabase Dashboard](https://supabase.com/dashboard).
2. Check the project status for the target environment (`shop-staging` or production).
3. If the project is marked **Paused**, click **Restore project** and wait for the status indicator to turn green (Active).
4. Run or re-run the deployment workflow.

---

## 4. Release Order and Rollback Policy

### Existing database without migration history

If querying `supabase_migrations.schema_migrations` returns `42P01` while shop
tables already exist, stop before triggering either database deployment workflow.
The existing schema must be reconciled with the repository first. Do not create
an empty history table or mark all migration versions applied to make deployment
continue: those actions do not install missing tables, permissions or functions.

Run the read-only [hosted schema audit](hosted-schema-audit.sql) and compare its
result with a fully migrated local reference. See the
[2026-10-26 inventory and recovery sequence](../handoff/HOSTED-SCHEMA-INVENTORY-2026-10-26.md).
Take a backup and rehearse the reviewed recovery before changing hosted schema
or migration history. Ordinary deployment resumes after that reconciliation.

Per Section 3.4 of `roadmap.md`:

1. **DB change:** Delivered in an isolated PR with additive migration and pgTAP tests.
2. **Staging application:** Upon merge to `main`, `db-staging.yml` automatically applies migrations to staging.
3. **Production application:** The owner runs `db-production.yml` with input `PRODUCTION`.
4. **App change:** App changes consuming new database schema ship in a subsequent PR.
5. **Rollback Policy:**
   - **Database:** Forward-fix only; down migrations are forbidden.
   - **Backups:** Before any production DB push, the repository owner takes a logical backup or snapshot in the Supabase Dashboard (T-8.06).

---

## 5. Checklists for Human-Owned Tasks

### Checklist for T-1.11: Staging Supabase Project (Owner: Human)

- [ ] Create free Supabase project `shop-staging`.
- [ ] Note `STAGING_PROJECT_REF` and set database password `STAGING_DB_PASSWORD`.
- [ ] Generate account `SUPABASE_ACCESS_TOKEN` in Supabase dashboard.
- [ ] In GitHub repository settings (`Settings -> Secrets and variables -> Actions`):
  - [ ] Add `SUPABASE_ACCESS_TOKEN`.
  - [ ] Add `STAGING_PROJECT_REF`.
  - [ ] Add `STAGING_DB_PASSWORD`.
- [ ] In Cloudflare Pages project settings (`Settings -> Environment variables`):
  - [ ] Set `VITE_SUPABASE_URL` for **Preview** environment.
  - [ ] Set `VITE_SUPABASE_ANON_KEY` for **Preview** environment.
- [ ] Verify `db-staging.yml` executes cleanly upon next merge to `main`.

### Checklist for T-1.13: Production Supabase Project (Owner: Human)

- [ ] Create production Supabase project.
- [ ] Note `PRODUCTION_PROJECT_REF` and set database password `PRODUCTION_DB_PASSWORD`.
- [ ] In GitHub repository settings:
  - [ ] Add `PRODUCTION_PROJECT_REF`.
  - [ ] Add `PRODUCTION_DB_PASSWORD`.
- [ ] In Cloudflare Pages project settings:
  - [ ] Set `VITE_SUPABASE_URL` for **Production** environment.
  - [ ] Set `VITE_SUPABASE_ANON_KEY` for **Production** environment.
- [ ] Push nothing until release gate verification.
