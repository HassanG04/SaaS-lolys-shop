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

Coordination: Anti-Gravity owns active routing/layout work. Codex's guard changes
are isolated on `agent/T-0.09-repo-guards`; reconcile npm scripts when integrating
without overwriting Anti-Gravity's newer dependencies or application files.
