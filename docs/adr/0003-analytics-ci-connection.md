# ADR-0003: Analytics CI Database Connection Method for Restricted Roles

- Status: accepted
- Date: 2026-10-14
- Task: T-9.01

## Context

The analytics pipeline (Phase 9, T-9.01 to T-9.13) runs automated forecasting and insight generation via GitHub Actions (`forecast.yml`). The pipeline must read aggregate sales and stock data from the database and write back forecast runs, predictions, and metrics.

Our core security and privacy architecture mandates:

1. **Rule 6 & Rule 10 (Non-negotiables):** The Supabase service-role (secret) key is never used in `src/`, CI or analytics.
2. **Scenario S31 & Rule 12:** Analytics never accesses personal data. The `analytics` schema holds aggregates only, and roles used by the pipeline must have zero access to `public` tables.
3. **Defense in Depth:** The `analytics` schema is not exposed to the public PostgREST API (`anon` and `authenticated` roles).

We must decide the connection mechanism for the CI runner to interact with the database under these constraints.

## Decision

We use direct PostgreSQL connection strings over TLS (`sslmode=require`) authenticated as dedicated database roles, stored in GitHub repository secrets:

- `ANALYTICS_DB_URL_STAGING` (for staging environment)
- `ANALYTICS_DB_URL_PRODUCTION` (for production environment)

### Details

1. **Roles and Grants:**
   - In the database schema, two restricted roles are defined:
     - `analytics_reader`: Has `USAGE` on schema `analytics`, `SELECT` on `analytics` views (`sales_daily`, `stock_daily`, `forecast_accuracy`) and tables (`calendar`, `forecast_runs`, `sales_forecasts`, `forecast_metrics`, `basket_pairs`, `cohort_retention`). It is explicitly revoked from all tables and functions in `public`.
     - `analytics_writer`: Has `USAGE` on schema `analytics`, `INSERT`/`UPDATE`/`DELETE` on forecast tables (`forecast_runs`, `sales_forecasts`, `forecast_metrics`, `basket_pairs`, `cohort_retention`) and `USAGE` on sequences. It is explicitly revoked from all tables and functions in `public`.
   - In staging and production, the project owner provisions a dedicated login role (e.g., `analytics_runner` or separate reader/writer users) configured with a strong random password and granted `analytics_reader` and `analytics_writer`.

2. **Connection Protocol:**
   - The runner connects via Supabase's transaction pooler (port 6543) or direct session connection (port 5432):
     `postgresql://<role>:<password>@<project-ref>.pooler.supabase.com:6543/postgres?sslmode=require`
   - TLS encryption is strictly required (`sslmode=require` or `verify-full`).
   - The connection utilizes standard Python DB-API drivers (`psycopg` or `asyncpg`).

3. **No Service-Role Key:**
   - The Supabase service-role key is never passed to or stored in the analytics environment.

## Alternatives considered

1. **PostgREST with custom JWTs:**
   - Supabase PostgREST allows mapping custom JWT claims (`role: analytics_writer`).
   - _Why rejected:_ Generating custom JWTs requires access to the project's JWT secret key in CI. Leaking the JWT secret allows forging tokens for any role (including `service_role` and `supabase_admin`), violating our zero-trust posture. Furthermore, PostgREST does not expose the `analytics` schema by default.

2. **Supabase Edge Functions / Admin RPC proxy:**
   - Wrapping every analytics batch query and bulk insert in RPC functions in `public`.
   - _Why rejected:_ Analytics pipelines execute vectorized queries and bulk dataframe inserts. Funneling gigabytes of time-series aggregates through HTTP JSON payloads over Edge Functions adds substantial latency, serialization overhead, and invocation costs without improving security over direct role-enforced Postgres connections.

3. **Database replication to external data warehouse:**
   - Streaming database WAL to Snowflake or BigQuery.
   - _Why rejected:_ Out of scope for current data volumes (small store, megabytes of data). Adds unnecessary recurring infrastructure costs and complexity.

## Consequences

- **Security & Privacy:** Even in the catastrophic event of CI runner compromise, the attacker obtains credentials that cannot read customer names, phone numbers, addresses, emails, passwords, payment proofs, or orders.
- **Maintenance:** The project owner provisions the database login role credentials once per environment using owner SQL and stores them in GitHub Secrets.
- **Verification:** Role boundaries are formally asserted by pgTAP test suite (`17_analytics_foundation.test.sql`) in local CI.
