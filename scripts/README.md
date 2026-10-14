# Engineering commands

The roadmap tool is dependency-free Node code. Run `npm run roadmap -- status`,
`npm run roadmap:next` or `npm run roadmap:check` from the project root. Its
tests use the built-in Node test runner (`npm run test:tooling`).

`npm run roadmap -- set T-x.yy <status>` validates the document before writing.
`done` requires finished dependencies; `blocked` requires an exact task mention
in an Appendix G table row. `skip` additionally requires a row with the task ID,
`Owner` in the Who column and `Approved skip: <reason>` in the summary. Record
only actual owner decisions; an agent must not invent this authorization.

The parser accepts suffix task IDs (`T-0.02b`) for the split-work rule, ignores
fenced examples, preserves line endings during status changes, and reports
source line numbers for validation errors. A task ends at the next heading
of level 1–4. No runnable task is a successful query, not a CLI failure.

`pending.mjs` is an explicit nonzero stub for later roadmap work. Replace the
corresponding npm script when its real implementation is ready. Do not treat
stub output as a passed check or wire it into a gate that must already pass.

`check:tokens` scans literal utilities, inline values and CSS/SVG under `src/`.
Only `src/styles/tokens.css` may define palette, radius and shadow values.
Names come from that file; unknown tokens fail. This grep-based guard cannot
prove computed styles safe: review dynamic expressions and avoid constructed
class names. The static CI job runs it; tests plant invalid JSX/CSS fixtures.

`check:ui-build` checks production artifacts for development route, asset and
Arabic/English preview markers. It runs after every production build, including
CI. Keep preview translations in development-only imports when adding locales.

`check:supply-chain` validates dependency security, registry URLs, permissive
licenses, lifecycle script allowlists in `package-lock.json`, and SHA-pinned
GitHub Actions in `.github/workflows/`. Its companion `audit:signatures` verifies
cryptographic signatures of all packages against the npm registry.
