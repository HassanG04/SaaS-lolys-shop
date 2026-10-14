# OWASP ZAP Baseline Dynamic Scanning (DAST)

This directory configures automated and manual dynamic application security testing (DAST) using the official **OWASP ZAP (Zed Attack Proxy)** baseline scan.

## 1. Overview and Scope

Per `roadmap.md` Task **T-7.07** and `docs/spec/security-model.md` Section 11:

- The ZAP baseline scan runs **passive security checks** against the web application.
- It verifies that HTTP response headers (CSP, HSTS, X-Content-Type-Options, Permissions-Policy) are properly emitted and no sensitive information is leaked.
- **Strict Staging-Only Rule:** The scan is permitted **ONLY** against the staging environment (`https://staging.lolys.pages.dev` or Cloudflare Pages preview deployments) and local development. It is **never** run against production.

## 2. GitHub Actions Workflow (`.github/workflows/zap.yml`)

The scan runs automatically in GitHub Actions:

- **Weekly Schedule:** Triggered every Monday at 04:00 UTC.
- **Manual Trigger:** Can be run on demand via `workflow_dispatch` with an optional target staging URL.
- **Production Guard:** The workflow enforces that the target URL must be a staging or preview URL. Any attempt to target production (`lolys.com` or root `lolys.pages.dev`) causes immediate pipeline failure.
- **Private Artifacts:** Full HTML, Markdown, and JSON reports are generated and uploaded as GitHub Actions artifacts with 30-day retention.
- **Action Pinning:** All GitHub Actions are pinned to full 40-character commit SHAs with version comments, strictly enforced by `npm run check:supply-chain`.

## 3. Triaged Rules Configuration (`.zap/rules.tsv`)

The file `.zap/rules.tsv` controls how ZAP alerts are handled:

| Rule ID | Action   | Name                                         | Rationale                                                                                                                              |
| ------- | -------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `10021` | `FAIL`   | X-Content-Type-Options Header Missing        | Must strictly enforce `nosniff` via `_headers`.                                                                                        |
| `10035` | `FAIL`   | Strict-Transport-Security Header Not Set     | Must strictly enforce HSTS with preloading in `_headers`.                                                                              |
| `10038` | `FAIL`   | Content Security Policy (CSP) Header Not Set | Must strictly enforce CSP in `_headers`.                                                                                               |
| `10049` | `FAIL`   | Content-Type Header Missing                  | All responses must declare their MIME type.                                                                                            |
| `90022` | `FAIL`   | Application Error Disclosure                 | Raw backend error messages are forbidden per SEC-05.                                                                                   |
| `10063` | `WARN`   | Permissions Policy Header Not Set            | Verified against `_headers`.                                                                                                           |
| `10054` | `WARN`   | Cookie Without SameSite Attribute            | Monitored for external embeds (Turnstile).                                                                                             |
| `10015` | `INFO`   | Re-examine Cache-control Directives          | Static assets use immutable hashes; dynamic calls use API SDK.                                                                         |
| `10027` | `INFO`   | Information Disclosure - Suspicious Comments | Static builds and source are scanned by Semgrep and secret scanners.                                                                   |
| `10037` | `INFO`   | Server Leaks Information via "Server" Header | Emitted by Cloudflare edge proxy; harmless.                                                                                            |
| `10055` | `INFO`   | CSP: CSP Header within `<meta>` tag          | CSP is delivered via HTTP headers, which is standard.                                                                                  |
| `10096` | `INFO`   | Timestamp Disclosure                         | Benign timestamps in chunk names or metadata.                                                                                          |
| `10098` | `INFO`   | Cross-Domain Misconfiguration                | CDN resource isolation handled by CSP.                                                                                                 |
| `10109` | `INFO`   | Modern Web Application                       | Informational notice for Single Page Applications (SPA).                                                                               |
| `10020` | `IGNORE` | Anti-CSRF Tokens Check                       | Client-side React SPA communicates via Bearer JWT tokens in `Authorization` headers. Traditional HTML form cookie CSRF does not apply. |
| `10202` | `IGNORE` | Absence of Anti-CSRF Tokens                  | Same as above: client-side form controls use Bearer auth.                                                                              |

## 4. Local Execution with Docker

To run the ZAP baseline scan locally against a preview build:

1. Build and preview the application locally:

   ```bash
   npm run build
   npm run preview -- --port 5173 --host 0.0.0.0
   ```

2. Run the ZAP container:

   ```bash
   # On Linux/macOS
   docker run --rm -v "$(pwd):/zap/wrk/:rw" -t ghcr.io/zaproxy/zaproxy:stable \
     zap-baseline.py -t http://host.docker.internal:5173 -c /zap/wrk/.zap/rules.tsv -r zap-report.html

   # On Windows PowerShell
   docker run --rm -v "${PWD}:/zap/wrk/:rw" -t ghcr.io/zaproxy/zaproxy:stable `
     zap-baseline.py -t http://host.docker.internal:5173 -c /zap/wrk/.zap/rules.tsv -r zap-report.html
   ```

3. Open `zap-report.html` in your browser to inspect findings.
