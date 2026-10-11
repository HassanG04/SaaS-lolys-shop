# Lolys' Accessories & Home

**أشياء لطيفة لأسلوبك ومساحتك**

_Cute things for your style & space._

An Arabic-first online shop for accessories and home items in Egypt, with English
support and a warm cream, blush and cocoa identity.

[Development pull requests](https://github.com/HassanG04/lolys/pulls) ·
[Engineering roadmap](https://github.com/HassanG04/lolys/blob/bbc77ac6bc65f5b082cf7d3f6f59c5165991e848/roadmap.md) ·
[Design system](https://github.com/HassanG04/lolys/blob/bbc77ac6bc65f5b082cf7d3f6f59c5165991e848/docs/spec/design-system.md)

## Project status

**In development — not ready for customer orders.** This branch currently serves
as the repository overview. The application, specifications and engineering tools
are on development branches awaiting review and integration into `main`.

The [foundation pull request](https://github.com/HassanG04/lolys/pull/1) starts the
implementation. The [UI preview pull request](https://github.com/HassanG04/lolys/pull/12)
includes the accumulated component work, Arabic/English switching, light/dark
themes and compact login/register layout previews. Those previews are not working
account forms. Further backend and application work is ongoing.

The specification links here point to a published review snapshot; use the
development pull requests and their branch roadmaps for subsequent changes.

## Planned shopping experience

- Browse categories and products, search, save favorites and build a cart.
- Register, manage account details and follow order progress.
- Choose cash on delivery or InstaPay with privately uploaded payment proof.
- Arrange delivery through Egypt Post or the shop's representative, where available.
- Use Arabic with right-to-left layouts or English with left-to-right layouts.
- Switch between the light palette and the warm “cocoa night” theme.

The planned admin area covers products, stock, categories, orders, delivery fees
and payment review. Admin access requires verified two-factor authentication.

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

## Working on the project

There is no runnable app or package manifest on `main` yet. To work on the
implementation, select the relevant development pull request and follow its
branch's `README.md`, `AGENTS.md` and `.agent-state/project-progress.md`.

On an implementation branch:

1. Use the Node version specified by `.nvmrc`.
2. Follow that branch's local setup instructions, then install dependencies with
   `npm ci --ignore-scripts`.
3. Run `npm run roadmap:next` to identify the next unblocked task.
4. Run `npm run dev` for the local preview and `npm run verify` for the quality gate.

Database tasks also need Docker and the local Supabase stack. Never commit
environment values or credentials. Keep simultaneous agent work in separate
worktrees; the project owner reviews and merges pull requests and controls
production deployment.

## Specifications

The roadmap and its referenced specifications define scope and acceptance criteria.

- [Database contract](https://github.com/HassanG04/lolys/blob/bbc77ac6bc65f5b082cf7d3f6f59c5165991e848/docs/spec/database-contract.md)
- [Security model](https://github.com/HassanG04/lolys/blob/bbc77ac6bc65f5b082cf7d3f6f59c5165991e848/docs/spec/security-model.md)
- [Error catalogue](https://github.com/HassanG04/lolys/blob/bbc77ac6bc65f5b082cf7d3f6f59c5165991e848/docs/spec/error-codes.md)
- [Analytics plan](https://github.com/HassanG04/lolys/blob/bbc77ac6bc65f5b082cf7d3f6f59c5165991e848/docs/spec/analytics-plan.md)

Passing a local build does not establish production readiness. Launch also
requires the roadmap's security, operational and owner approval gates.
