<p align="center">
  <img src="docs/design/brand/lolys.jpeg" alt="Lolys' Accessories & Home — bows, pearls and gifts in cream and blush" width="420">
</p>

# Lolys' Accessories & Home

**أشياء لطيفة لأسلوبك ومساحتك**

Cute things for your style & space.

An Arabic-first online shop for accessories and home items in Egypt, with English
support and a warm cream, blush and cocoa identity.

[Roadmap](roadmap.md) · [Design system](docs/spec/design-system.md) ·
[Shared progress](.agent-state/project-progress.md) · [Development pull requests](https://github.com/HassanG04/lolys/pulls)

## Development status

**In development — not ready for customer orders.** The repository contains the
React foundation, documented design tokens and fonts, reusable UI components,
Arabic/English switching, light/dark themes and compact account-form previews.

The development-only UI kit is available at `/__kit`. The root page currently
contains theme and language controls. Login and registration examples are layout
previews; the storefront, working accounts, checkout and admin workflows are still
roadmap work. See [UI acceptance notes](.agent-state/ui-acceptance.md) for outstanding
visual checks. Later database and application work continues on development
branches and must be reviewed before integration.

## Planned shopping experience

- Browse categories and products, search, save favorites and build a cart.
- Register, manage account details and follow order progress.
- Choose cash on delivery or InstaPay with privately uploaded payment proof.
- Arrange delivery through Egypt Post or the shop's representative, where available.
- Use Arabic with right-to-left layouts or English with left-to-right layouts.
- Switch between the light palette and the warm “cocoa night” theme.

The planned admin area covers products, stock, categories, orders, delivery fees
and payment review. Admin access requires verified two-factor authentication.

## Local preview

Use the Node version in [`.nvmrc`](.nvmrc), then run:

```sh
npm ci --ignore-scripts
npm run dev
```

Open the local URL printed by Vite. Add `/__kit` to that URL to explore the UI kit.
The kit and its example content are excluded from production builds.

This foundation preview does not need backend credentials. Once the database
tasks are integrated, follow their local setup runbook; Docker and the local
Supabase stack are required for database work. Environment values and privileged
keys must never be committed or put in browser code.

## Quality and contribution

```sh
npm run verify
npm run roadmap:check
npm run roadmap:next
```

`verify` checks design tokens, lint, formatting, TypeScript, application/tooling
tests, the production build and exclusion of development previews. Commands owned
by later tasks deliberately fail with their task ID until implemented.

Read [AGENTS.md](AGENTS.md), the roadmap and shared progress before making changes.
Use a separate worktree for simultaneous agent work. Submit changes through a
pull request; the repository uses squash merging and automatic merged-branch
cleanup. Branch protection for this private repository is currently blocked by
the GitHub account plan, so passing checks still need to be verified before merging.

Passing a local build does not establish production readiness. Launch also
requires the roadmap's security, operational and owner approval gates.

## Architecture

| Area            | Documented choice                                                  |
| --------------- | ------------------------------------------------------------------ |
| Frontend        | React, strict TypeScript, Vite and Tailwind CSS                    |
| Backend         | Supabase Postgres, Auth and Storage                                |
| Data access     | Row-level security and database functions                          |
| Interface       | Arabic-first, English support, accessible controls and both themes |
| Planned hosting | Cloudflare Pages for the static application                        |

The database is authoritative for prices, stock, totals and payment status.
Orders go through the documented database functions. Payment proofs are private;
privileged keys never belong in the browser.

## Specifications

The [roadmap](roadmap.md) and its referenced specifications define scope and
acceptance criteria. The compatible toolchain is recorded in [ADR-0001](docs/adr/0001-stack.md).

- [Database contract](docs/spec/database-contract.md)
- [Security model](docs/spec/security-model.md)
- [Error catalogue](docs/spec/error-codes.md)
- [Analytics plan](docs/spec/analytics-plan.md)
- [Planned runbooks](docs/runbooks/README.md)
