# Browser static analysis (T-7.06)

The read-only `sast` job runs Semgrep 1.179.0 (container digest pinned), the
maintained `p/typescript` and `p/react` packs, and the project rules. Metrics,
version checks and inline suppressions are disabled. No Semgrep account or
repository secret is required. High-severity findings, scanner failures, parse
errors reported by the scanner and empty scans fail the job. Registry availability is required.

Run `node --test scripts/test-semgrep.mjs`, then `node scripts/check-sast.mjs`
with that Semgrep version on PATH. The fixture suite plants unsafe code only in
a temporary directory and proves rejection followed by clean recovery.

Scope is production `src/`; unit-test fixtures are excluded. Full-history and
bundle secret scanning remain separate checks. Fetch permits literal root-relative
same-origin paths only. There is no approved cloud project host yet; use the
configured Supabase SDK for API calls. Any additional host needs an exact reviewed
allow-list entry and rejection tests for lookalike hosts, credentials and redirects.

Raw-error analysis follows conventional error identifiers and caught exceptions
into JSX and DOM text within a function. It cannot prove cross-function safety;
error-framework tests and review remain required. Semgrep may prefilter files;
the existing lint/typecheck gates still own full syntax validation. The owner reviews exceptions
and enables `sast` as a required check. Controls: SEC-07, SEC-15, SEC-16, SEC-22, SEC-24.

References: [CLI](https://semgrep.dev/docs/cli-reference) and
[rule syntax](https://semgrep.dev/docs/writing-rules/rule-syntax).
