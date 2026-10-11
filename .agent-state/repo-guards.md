# Repository guard checks

T-0.09 implements SEC-15 without adding a dependency or changing authentication.
The read-only build job runs the guard after building; `npm run verify` does too.

- Git supplies NUL-separated tracked paths, including staged files and spaces.
- Every regular file in `dist/` is scanned, including nested assets and source maps.
- Privileged JWT payloads and secret-key literals fail even inside docs/tests.
- Only role-name mentions are allowed in Markdown, `docs/`, test directories and
  `.test`/`.spec` files. This exception never applies under `dist/`.
- Tracked environment files are rejected by filename without opening them. The
  root `.env.example` may contain comments and names with empty assignments only.
- Missing Git, missing/unreadable files, symlinks, empty/missing builds and paths
  outside the checkout fail the command. Diagnostics contain rules and filenames,
  never matched values; credential-shaped filenames are redacted too.

Node tests plant synthetic, nonfunctional credentials in temporary Git repos and
build folders, assert rejection/redaction, then restore safe content and assert
success. This is a literal-content guard, not a replacement for the broader
gitleaks/push-protection work in T-0.12/T-0.13. The gzip/admin-chunk guard retains
its original scope in T-0.09b.

T-0.09b adds `npm run check:bundle` after the build and secret check in both local
verification and the existing read-only CI build job (SEC-15/SEC-16/SEC-24 retained).
Vite emits `.vite/bundle-graph.json` with relative module paths and chunk imports;
there are no absolute workstation paths or source bodies in this metadata.

- Budget: 200 KB means 200,000 bytes. Sum each initial chunk's gzip size once,
  including all static imports from every entry. Shared imports and cycles do
  not double-count. CSS, fonts and dynamically imported chunks are outside this
  JS budget; it is not a browser network or route-navigation performance test.
- Admin directories under `src/`, `Admin*.ts(x)` pages/components and Recharts
  must stay out of the initial graph. Attribution catches admin code folded into
  an ordinary shared chunk; a misleading output filename cannot bypass it.
- Missing/invalid metadata, absent entries, duplicate chunks, unresolved imports,
  missing assets and unsafe paths fail. Rebuild before checking a changed app.
- Tests deliberately exceed the budget through a shared dependency, restore it,
  and prove both outcomes. Real Vite fixtures verify eager rejection and lazy
  separation. No application routing or chunk splitting is changed by this PR.

Coordination: Anti-Gravity owns T-5.01 in its active checkout. Codex's bundle work
is isolated on `agent/T-0.09b-bundle-guard`, stacked on secret-guard PR 15.
Reconcile npm scripts without overwriting its newer dependencies or app files.
The latest AGENTS instructions reserve review and merge for the owner.
