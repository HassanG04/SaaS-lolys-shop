# Local development runbook

- Status: active
- Task: T-1.14
- Applies to: local Supabase stack and local frontend development

This runbook guides a developer starting on a clean machine through launching the local database and services, managing test users and email, and running tests.

The integration checkout owns only project `lolys-db-integration`, using the
5632x port range and edge inspector 8085. The commands reject remote Docker
contexts and do not accept a database URL. Do not run another checkout with the
same project ID concurrently. Other local Supabase stacks are left alone.
Start/reset output suppresses CLI credentials; do not paste keys or status output
into issues, chat, or CI logs. MFA/TOTP is enabled locally.

---

## 1. Prerequisites

Before starting, ensure the host machine has:

1. **Node.js**: Version specified in `.nvmrc` (v24 LTS). Verify with `node -v`.
2. **Docker**: Docker Desktop (or Docker Engine) installed and running. Verify with `docker info`.
3. **Git**: Installed and configured.

Install project dependencies:

```bash
npm ci --ignore-scripts
```

---

## 2. Starting the local Supabase stack

Start all local database and backend containers:

```bash
npm run db:start
```

_(Alternatively: `npx supabase start`)_

To check container and service status and print endpoints:

```bash
npx supabase status
```

### Local endpoints summary

| Service                      | Local URL / Connection                                    | Purpose                                             |
| ---------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| **Studio Dashboard**         | `http://127.0.0.1:56323`                                  | Database GUI, table editor, SQL editor, Auth viewer |
| **API Gateway / REST**       | `http://127.0.0.1:56321`                                  | PostgREST API and Auth endpoints                    |
| **PostgreSQL Database**      | `postgresql://postgres:postgres@127.0.0.1:56322/postgres` | Direct SQL connection (`psql`, migrations, tests)   |
| **Local Mailbox (Inbucket)** | `http://127.0.0.1:56324`                                  | Webmail viewer for signup and confirmation emails   |
| **Storage S3 Gateway**       | `http://127.0.0.1:56321/storage/v1/s3`                    | Local object storage emulator                       |

---

## 3. Environment configuration

Copy the template environment file:

```bash
cp .env.example .env
```

Retrieve the local anonymous key from `npx supabase status`:

- Set `VITE_SUPABASE_URL=http://127.0.0.1:56321`
- Set `VITE_SUPABASE_ANON_KEY=<anon key from supabase status>`

> **Security rule:** Never commit `.env` or paste real secrets into files or pull requests. Only public/anon keys belong in `.env`.

---

## 4. Resetting and seeding the database

To reset the database, run all migrations from scratch, and load seeds:

```bash
npm run db:reset
```

This executes:

1. All timestamped migrations in `supabase/migrations/` (schema, security, functions, views, reference data, storage).
2. Seed data in `supabase/seed.sql` (Egypt's 27 governorates and demo catalog products).

To regenerate TypeScript database types after migration changes:

```bash
npm run db:types
```

---

## 5. Working with test users and local email

### Creating test users

1. **Via Web App**: Start the dev server (`npm run dev`) and register via the authentication dialog.
2. **Via Supabase Studio**: Navigate to `http://127.0.0.1:56323` -> **Authentication** -> **Users** -> **Add user**.
3. **Via SQL**: Connect to `psql` or use Studio SQL Editor. In pgTAP test scripts, use `tests.create_supabase_user(identifier, email, phone, metadata)`. Helpers are installed only by the test harness, never by a production migration.

### Viewing emails locally

All outgoing emails (such as email confirmation links and magic links) are captured by the local Inbucket mail server:

- Open `http://127.0.0.1:56324` in your browser.
- Select the recipient mailbox to view the email content and click confirmation links. No external emails are ever sent in local development.

---

## 6. Running tests and verification

| Command                       | Description                                                               |
| ----------------------------- | ------------------------------------------------------------------------- |
| `npm run db:test`             | Runs all pgTAP database unit tests across `supabase/tests/database/*.sql` |
| `npm run db:test:concurrency` | Runs scenario S7 concurrent order placement check                         |
| `npm run test:unit`           | Runs React/TypeScript unit tests and tooling tests                        |
| `npm run verify`              | Full verification suite: lint, format, typecheck, tests, and build        |

---

## 7. Stopping the local stack

When you finish development:

```bash
npm run db:stop
```

_(Alternatively: `npx supabase stop`)_

To stop without saving database state (clean shutdown):

```bash
npx supabase stop --no-backup
```
