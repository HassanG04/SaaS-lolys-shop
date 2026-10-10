# T-0.08e: Enforce design tokens and exclude UI previews from production

The previous checker missed CSS and most arbitrary/default utilities. The new
scanner reads documented token names, scans nested source/CSS/SVG, and rejects
unknown tokens and hard-coded colors, radii and shadows. Negative fixtures check
real CLI failure. Dynamic expressions still require code review.

Production builds now reject development route, fixture and Arabic/English
preview markers. This also catches the preview-copy leak found in the incoming
language commit (repaired in the next PR). The static CI job runs the token check.

Validation: 42 application tests and 97 tooling tests pass, alongside lint,
format, TypeScript and production build/exclusion. No new dependency or token.

T-0.08e remains doing: Anti-Gravity reported browser checks, but its handover
contains no complete 360/1280 × light/dark × RTL/LTR matrix or reduced-motion
results. Codex has a prior browser-policy denial; no fresh visual check claimed.

SEC-16/SEC-24: adds one read-only CI check, preserves pinned actions, permissions
and install-script restrictions. Owner workflow review/security scan is still
required. Draft stacked on the labels/ornaments PR; never merge or deploy.
