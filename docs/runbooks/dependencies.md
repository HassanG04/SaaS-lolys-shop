# Dependency management and supply-chain hardening runbook

- Status: active
- Task: T-7.05
- Applies to: npm dependencies (client, server, and tooling) and GitHub Actions workflows

This runbook establishes mandatory procedures and security criteria for reviewing, adding, updating, and auditing third-party dependencies and CI workflows.

---

## 1. Overview and core principles

Dependencies represent third-party code running with the privileges of our build systems, servers, or end-users' browsers. Every added dependency expands our attack surface, bundle footprint, and maintenance debt.

Our supply-chain security architecture enforces:

1. **Zero arbitrary execution on install:** All installs run `npm ci --ignore-scripts`. No package executes lifecycle scripts (`preinstall`, `install`, `postinstall`) unless explicitly justified and allow-listed in `scripts/check-supply-chain.mjs`.
2. **Registry integrity:** Every entry in `package-lock.json` must resolve to the canonical npm registry (`https://registry.npmjs.org/`).
3. **Cryptographic verification:** Registry package signatures and provenance attestations are validated via `npm audit signatures`.
4. **License compliance:** Every direct and transitive dependency must carry an approved permissive open-source license. Copyleft, viral, or proprietary licenses are strictly rejected.
5. **Immutable CI actions:** Every GitHub Action in `.github/workflows/` must be pinned to a full 40-character commit SHA with a human-readable tag comment (`# vX.Y.Z`). Mutable tags (`@v4`, `@main`) are forbidden.
6. **Performance budgets:** Production client bundles must strictly respect the $\le 200\text{ KB}$ initial gzip budget enforced by `npm run check:bundle`.

---

## 2. Review criteria for new dependencies

Before introducing any new dependency to `package.json`, the engineer and reviewer must evaluate the following six criteria:

### Criterion 1: Native web platform alternatives

Always prefer modern web platform standards over third-party micro-libraries:

- Native cryptography: `crypto.subtle` (UUIDs, hashing, random values) instead of external UUID or SHA packages.
- Native networking & parsing: `fetch`, `URL`, `URLSearchParams`, `FormData`.
- Native internationalization: `Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.DisplayNames`.
- Native CSS & utilities: modern CSS (logical properties, CSS grid, subgrid, `@supports`) instead of helper libraries.

### Criterion 2: Maintainership and project health

Assess the health and trustworthiness of the upstream repository:

- **Activity and release cadence:** Recent commits, active maintenance, responsiveness to security issues.
- **Maintainer reputation & governance:** Prefer projects governed by recognized foundations (e.g., OpenJS, Apache) or reputable teams with multiple active maintainers. Avoid single-maintainer packages where credentials or accounts could be hijacked.
- **Account security:** Check if maintainers enforce two-factor authentication (2FA) and publish with provenance attestations (`npm audit signatures`).
- **Transitive blast radius:** Check how many sub-dependencies are pulled in (`npm ls <pkg>` or `npm view <pkg> dependencies`). Avoid packages that trigger massive dependency trees.

### Criterion 3: Lifecycle scripts and install safety

- Packages must never require arbitrary execution during `npm install` or `npm ci`.
- Our CI pipelines execute `npm ci --ignore-scripts` across all jobs.
- If a package declares `hasInstallScript: true` in `package-lock.json`, the automated gate `scripts/check-supply-chain.mjs` will fail unless the package name is present in `ALLOWED_INSTALL_SCRIPTS`.
- Any addition to `ALLOWED_INSTALL_SCRIPTS` requires:
  1. An approved Architectural Decision Record (ADR) justifying why native compilation or lifecycle execution is unavoidable.
  2. A manual security audit of the package's install script.
  3. Owner sign-off on the PR.

### Criterion 4: License vetting

All software distributed to client browsers or bundled in deployment must be free from restrictive, copyleft, or proprietary terms.

**Approved permissive licenses:**

- `MIT`
- `Apache-2.0`
- `BSD-2-Clause` / `BSD-3-Clause`
- `ISC`
- `0BSD`
- `CC0-1.0`
- `Unlicense`
- `BlueOak-1.0.0`
- `Python-2.0`
- `MIT-0`
- `MPL-2.0` (tooling / development only; e.g. `lightningcss`, `axe-core`)

**Forbidden licenses:**

- GPL series (`GPL-2.0`, `GPL-3.0`, `AGPL-3.0`)
- LGPL series (unless strictly isolated dynamic link with legal sign-off)
- SSPL (Server Side Public License)
- BSL (Business Source License)
- Non-Commercial / Commons Clause licenses
- Unlicensed or Proprietary software

Compound licenses (`AND` / `OR`):

- `A OR B`: Permitted if at least one alternative is in the approved list.
- `A AND B`: Permitted only if both components are in the approved list.

### Criterion 5: Bundle size and performance budget

For client-side runtime dependencies (`dependencies` in `package.json`):

1. Inspect bundle cost on [Bundlephobia](https://bundlephobia.com) before installation (check minified + gzip size).
2. Ensure the package provides modern ESM exports (`"module"` or `"exports"` in `package.json`) to enable tree-shaking.
3. Verify that the dependency is lazy-loaded if only required on specific routes (e.g., `recharts` is restricted exclusively to the admin dashboard chunk).
4. Run `npm run check:bundle` after installation to confirm that initial JS remains under $200\text{ KB}$ gzip.

### Criterion 6: Cryptographic registry attestations

The npm registry supports signed package releases and Build Attestations (Sigstore). Every added dependency must:

- Come exclusively from `https://registry.npmjs.org/`.
- Pass `npm audit signatures` with verified registry signatures.

---

## 3. Automated supply-chain verification tooling

Our codebase includes automated guards in `scripts/check-supply-chain.mjs` and CI:

| Tool / Script          | Command                      | Purpose                                                                                                                          |
| ---------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Supply Chain Guard** | `npm run check:supply-chain` | Inspects `package-lock.json` and `.github/workflows/*.yml` for registry URLs, licenses, install scripts, and action SHA pinning. |
| **Signature Audit**    | `npm audit signatures`       | Validates cryptographic signatures and build attestations of all packages in `package-lock.json`.                                |
| **Secrets Scan**       | `npm run check:secrets`      | Ensures no credentials, API keys, or JWT tokens are committed in repository files or build outputs.                              |
| **Bundle Guard**       | `npm run check:bundle`       | Enforces the 200 KB initial gzip bundle size budget.                                                                             |
| **Full Local Gate**    | `npm run verify`             | Runs lint, format, typecheck, migrations, SQL check, tokens, supply chain, unit tests, and production build.                     |

---

## 4. Step-by-step: Adding a new dependency

1. **Verify need:** Check whether native JavaScript or modern CSS can satisfy the requirement.
2. **Review package:** Evaluate maintainers, license, bundle size, and transitive dependencies.
3. **Install dependency:**
   ```bash
   npm install <package-name>@<exact-version>
   ```
   _(Or `npm install -D <package-name>@<exact-version>` for devDependencies)_
4. **Run signature audit:**
   ```bash
   npm audit signatures
   ```
5. **Run supply-chain checks:**
   ```bash
   npm run check:supply-chain
   ```
6. **Verify build and bundle budget:**
   ```bash
   npm run build
   npm run check:bundle
   ```
7. **Run full verification:**
   ```bash
   npm run verify
   ```

---

## 5. Step-by-step: Updating existing dependencies

1. **Identify updates:**
   ```bash
   npm outdated
   ```
2. **Review changelogs and release notes:** Read breaking changes, deprecation notices, and security advisories.
3. **Apply update:**
   ```bash
   npm install <package-name>@<new-version>
   ```
4. **Audit signatures:**
   ```bash
   npm audit signatures
   ```
5. **Run supply-chain and test gates:**
   ```bash
   npm run check:supply-chain
   npm run verify
   npm run test:e2e
   ```

---

## 6. Step-by-step: Adding or pinning GitHub Actions

GitHub Actions run in our CI workflows with access to repository secrets and test environments. Pinned tags (like `@v4`) can be mutated maliciously if an upstream account is compromised. All actions must be pinned to immutable commit SHAs.

1. **Find the exact commit SHA for the desired release tag:**
   ```bash
   git ls-remote https://github.com/<owner>/<repo> refs/tags/<tag>
   ```
   _Example:_
   ```bash
   git ls-remote https://github.com/actions/checkout refs/tags/v4.2.2
   # Output: d632683dd7b4114ad314ec22511823041340ad0e  refs/tags/v4.2.2
   ```
2. **Add to workflow with a full 40-character SHA and version comment:**
   ```yaml
   - uses: actions/checkout@d632683dd7b4114ad314ec22511823041340ad0e # v4.2.2
   ```
3. **Validate workflow pins:**
   ```bash
   npm run check:supply-chain
   ```

---

## 7. Emergency response: Compromised or vulnerable dependency

If a critical vulnerability (CVE) or malicious release is reported in a dependency:

1. **Immediate triage:**
   - Run `npm audit` to determine affected dependency paths and severity.
   - Check if vulnerable code paths are actually invoked in our application.
2. **Mitigation options:**
   - **Patch:** Update to a patched release if available.
   - **Workaround:** If an update is unavailable, isolate or replace the vulnerable feature using native APIs or an alternative approved library.
   - **Override:** If a transitive dependency has a patch released by its upstream maintainer, specify an `overrides` block in `package.json` and run `npm install`.
3. **Validation & Deployment:**
   - Execute `npm audit signatures` and `npm run check:supply-chain`.
   - Run full verification (`npm run verify` and `npm run test:e2e`).
   - Open an expedited PR with title `fix(security): resolve vulnerability in <package>`.
