# Security policy

Lolys' Accessories & Home is under development. Security fixes target the current
development branch and, after launch, the latest production release.

## Report a vulnerability privately

Email [hassangebrill2004@gmail.com](mailto:hassangebrill2004@gmail.com).
The owner approved this temporary reporting address on 2026-10-12; replace it in
this policy and `public/.well-known/security.txt` when a dedicated address is supplied.

Include the affected page or version, reproduction steps using a test account,
expected and actual behaviour, and the possible impact. Redact screenshots and
logs. Never send passwords, keys, payment proofs or customer information.
Do not disclose vulnerabilities in public issues, pull requests or comments.
Coordinate disclosure with the owner before publishing technical details.

The repository is private. GitHub's public-repository vulnerability reporting
form is not our reporting channel. Repository access is not required to email us.
No response deadline or reward programme is currently promised.

## Maintainer checks

- T-0.12 adds owner review rules and a read-only Gitleaks CI job. It scans Git
  history with full redaction; deleting a leaked credential does not fix history.
  Rotate exposed credentials and follow the incident procedure in T-7.10.
- `.gitleaksignore` records three reviewed synthetic values from earlier test
  commits by exact fingerprint. No file, directory or rule is excluded wholesale.
- Environment-file names in history are rejected without reading their values;
  the names-only `.env.example` is checked separately by `check:secrets`.
- Weekly Dependabot updates cover npm, GitHub Actions and future Python analytics.
  The Python entry becomes useful when T-9.02 adds its dependency manifest.
- T-0.10/T-0.13 remain owner prerequisites: enforce reviews and checks, enable
  available security settings, and require account two-factor authentication.
  Configuration files alone do not enforce branch protection.
- Before launch, verify the reporting mailbox and refresh `security.txt` before
  its expiry. Keep private `CLAUDE-SECURITY-*/` reports out of Git.

References: [Gitleaks](https://github.com/gitleaks/gitleaks/blob/v8.30.1/README.md),
[GitHub reporting availability](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository),
[Dependabot configuration](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference).
