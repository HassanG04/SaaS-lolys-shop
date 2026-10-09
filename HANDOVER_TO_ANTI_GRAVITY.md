# Handover to Anti-Gravity

## Current Objective

Complete local/remote verification of T-0.01 through T-0.06, then continue the
roadmap. The owner paused external Anti-Gravity after it started T-0.07 in this
workspace. Those 21 partial theme files are preserved with SHA-256 hashes in
`.tools/anti-gravity-t007-checkpoint/inventory.json`; restore them after this PR.

## Completed

- Strict React/Vite foundation and exact package lockfile on Node 24.21.0.
- Owner-approved TypeScript 6.0.3/ESLint 9.39.5; complete local verify passed.
- One app test and 27 roadmap tests; reference copy integrity checked.
- Prepared four SHA-pinned CI jobs and shared-library coverage threshold.
- Connected private GitHub repository and based task branch on its initial main.
- Instructions, PR/ADR templates, runbook index and handoff files created.

## Remaining

- Final local foundation verification passed after checkpointing theme work.
- PR 1 is open; lint probe failed specifically for unused variable, as required.
- Probe removed; rerun local checks and confirm four green jobs on the final commit.
- Mark tasks done only after required checks; never merge or deploy.
- Docker is absent; local database verification remains unavailable.
- Restore the T-0.07 checkpoint before returning this workspace to Anti-Gravity.

## Current Files

All changed/new paths relative to initial main at this checkpoint:

- `.agent-state/changed-files.md`
- `.agent-state/foundation-pr.md`
- `.agent-state/project-progress.md`
- `.editorconfig`
- `.env.example`
- `.gitattributes`
- `.github/pull_request_template.md`
- `.github/workflows/.gitkeep`
- `.github/workflows/ci.yml`
- `.gitignore`
- `.nvmrc`
- `.prettierignore`
- `.prettierrc.json`
- `AGENTS.md`
- `Accessories_Store_Project_Plan.docx`
- `CLAUDE.md`
- `HANDOVER_TO_ANTI_GRAVITY.md`
- `OPEN_DECISION.md`
- `README.md`
- `accessories_store_schema.sql`
- `analytics-plan.md`
- `analytics/.gitkeep`
- `database-contract.md`
- `design-system.md`
- `docs/Accessories_Store_Project_Plan.docx`
- `docs/adr/.gitkeep`
- `docs/adr/0000-template.md`
- `docs/adr/0001-stack.md`
- `docs/analytics/.gitkeep`
- `docs/db/initial-sql/01_schema.sql`
- `docs/db/initial-sql/02_security.sql`
- `docs/db/initial-sql/03_functions.sql`
- `docs/db/initial-sql/04_views.sql`
- `docs/db/initial-sql/05_seed.sql`
- `docs/db/initial-sql/06_storage.sql`
- `docs/db/initial-sql/README.md`
- `docs/design/brand/.gitkeep`
- `docs/design/brand/README.md`
- `docs/design/demo/README.txt`
- `docs/design/demo/app.js`
- `docs/design/demo/index.html`
- `docs/design/demo/styles.css`
- `docs/design/shop-style-reference.md`
- `docs/runbooks/.gitkeep`
- `docs/runbooks/README.md`
- `docs/spec/analytics-plan.md`
- `docs/spec/database-contract.md`
- `docs/spec/design-system.md`
- `docs/spec/error-codes.md`
- `docs/spec/security-model.md`
- `e2e/.gitkeep`
- `error-codes.md`
- `eslint.config.js`
- `frontend-demo/README.txt`
- `frontend-demo/app.js`
- `frontend-demo/index.html`
- `frontend-demo/styles.css`
- `index.html`
- `package-lock.json`
- `package.json`
- `perf/.gitkeep`
- `public/.well-known/.gitkeep`
- `public/brand/.gitkeep`
- `public/fonts/.gitkeep`
- `public/placeholders/.gitkeep`
- `public/robots.txt`
- `roadmap.md`
- `scripts/.gitkeep`
- `scripts/README.md`
- `scripts/pending.mjs`
- `scripts/roadmap.mjs`
- `scripts/roadmap.test.mjs`
- `security-model.md`
- `src/App.test.tsx`
- `src/App.tsx`
- `src/components/layout/.gitkeep`
- `src/components/ui/ornaments/.gitkeep`
- `src/features/account/.gitkeep`
- `src/features/admin/analytics/.gitkeep`
- `src/features/admin/audit/.gitkeep`
- `src/features/admin/categories/.gitkeep`
- `src/features/admin/customers/.gitkeep`
- `src/features/admin/dashboard/.gitkeep`
- `src/features/admin/delivery/.gitkeep`
- `src/features/admin/forecast/.gitkeep`
- `src/features/admin/orders/.gitkeep`
- `src/features/admin/payments/.gitkeep`
- `src/features/admin/products/.gitkeep`
- `src/features/admin/settings/.gitkeep`
- `src/features/auth/.gitkeep`
- `src/features/cart/.gitkeep`
- `src/features/catalog/.gitkeep`
- `src/features/checkout/.gitkeep`
- `src/features/orders/.gitkeep`
- `src/features/payments/.gitkeep`
- `src/i18n/.gitkeep`
- `src/lib/.gitkeep`
- `src/main.tsx`
- `src/styles/index.css`
- `src/test-setup.ts`
- `src/types/.gitkeep`
- `src/vite-env.d.ts`
- `supabase/migrations/.gitkeep`
- `supabase/tests/database/.gitkeep`
- `tsconfig.app.json`
- `tsconfig.json`
- `tsconfig.node.json`
- `vite.config.ts`
- `vitest.config.ts`

## Current Error

No unresolved local error. Local verification, coverage command and roadmap
validation pass. CI run 37929038785 passed build/unit/roadmap, while static
rejected the deliberately unused variable. Probe removed; verify all four
jobs on the next commit before marking implementation tasks done.

## Next Exact Command

From project root, once the clean install finishes:

```powershell
$env:Path = (Join-Path (Get-Location) '.tools/node-v24.21.0-win-x64') + ';' + $env:Path
Get-Content .agent-state/project-progress.md -Raw
git status --short --untracked-files=all
git diff
npm run verify
npm run test:unit:coverage
npm run roadmap:check
```

Read AGENTS.md and current task specs first. Repository is
https://github.com/HassanG04/lolys; branch agent/T-0.01-bootstrap.
Use existing sign-in without printing credentials. Never read .env values.
