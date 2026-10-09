# Lolys' Accessories & Home

Arabic-first RTL storefront for accessories and home items in Egypt. The production application uses React, TypeScript, Vite and Supabase; the browser never computes authoritative prices, stock or payment state.

## Local development

1. Install Node.js 24 LTS (the version in `.nvmrc`) and npm.
2. Copy `.env.example` to `.env.local` and fill in the local public Supabase values when the local stack is available. Never put a service-role key in this project.
3. Install dependencies with `npm ci`.
4. Start the app with `npm run dev` and open the printed local URL.

The local database workflow uses the Supabase CLI and Docker. Run `npm run db:start`, `npm run db:reset` and `npm run db:test` after the database foundation tasks are installed. Do not run linked or production database commands from an agent session.

## Quality checks

- `npm run verify` runs linting, formatting, TypeScript, unit tests and the production build.
- `npm run roadmap:next` prints the next unblocked engineering task.
- `npm run roadmap:check` validates task dependencies and statuses.

The source-of-truth product requirements are in `roadmap.md` and `docs/spec/`.

## Current foundation status

The blank React application builds and serves. Application tests and the
dependency-free roadmap tool are implemented. The full local `verify` gate
passes with the owner-approved compatible toolchain in [ADR-0001](docs/adr/0001-stack.md).
No storefront, backend, payments or admin behavior is implemented yet.

Later-task commands explicitly fail with their required task ID. CI starts with
static, unit (80% shared-library coverage), build and roadmap jobs; subsequent
guard tasks add their checks as documented. A local build is not production readiness.

On this workstation, a checksum-verified portable Node runtime is in the
ignored `.tools/node-v24.21.0-win-x64` directory. In PowerShell, select it for
the current terminal only:

```powershell
$env:Path = (Join-Path (Get-Location) '.tools/node-v24.21.0-win-x64') + ';' + $env:Path
npm ci --ignore-scripts
npm run test:unit
```

Other developers should install the version in `.nvmrc`. The portable directory
is not committed. See [planned runbooks](docs/runbooks/README.md) and
[shared progress](.agent-state/project-progress.md) before continuing work.
