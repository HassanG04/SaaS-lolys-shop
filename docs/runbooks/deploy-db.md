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
> Free-tier Supabase projects automatically pause after 7 days of inactivity.
> A paused project **refuses connection** from GitHub Actions (`supabase link` and `supabase db push` will fail with network or connection timeout errors).

Before triggering a migration run:

1. Open the [Supabase Dashboard](https://supabase.com/dashboard).
2. Check the project status for the target environment (`shop-staging` or production).
3. If the project is marked **Paused**, click **Restore project** and wait for the status indicator to turn green (Active).
4. Run or re-run the deployment workflow.

---

## 4. Release Order and Rollback Policy

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
