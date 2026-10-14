# ADR-0001: Stack and versions

- Status: accepted; OD-001 compatible toolchain approved by owner on 2026-10-09
- Date: 2026-10-09
- Tasks: T-0.01, T-0.02, T-0.05

## Context

The roadmap fixes React, strict TypeScript, Vite, Tailwind v4, Supabase, feature folders, Arabic/RTL and the named quality tools. This is a new repository; no earlier stack was installed. Registry versions and peer ranges were checked before installation.

## Decision

Use Node 24.21.0 LTS (.nvmrc), npm 11.19.0 from that official runtime, exact direct dependency versions and a committed lockfile. A checksum-verified portable runtime is available in ignored .tools locally because the system runtime is Node 25.2.1. No global installation was changed.

| Installed package           | Exact version |
| --------------------------- | ------------- |
| @eslint/js                  | 9.39.5        |
| @tailwindcss/vite           | 4.3.3         |
| @testing-library/jest-dom   | 7.0.1         |
| @testing-library/react      | 16.3.3        |
| @testing-library/user-event | 14.6.7        |
| @types/node                 | 24.19.1       |
| @types/react                | 19.3.0        |
| @types/react-dom            | 19.3.0        |
| @vitejs/plugin-react        | 6.1.2         |
| @vitest/coverage-v8         | 5.0.3         |
| eslint                      | 9.39.5        |
| eslint-plugin-jsx-a11y      | 6.10.2        |
| eslint-plugin-react-hooks   | 7.1.1         |
| globals                     | 17.13.0       |
| jsdom                       | 30.1.2        |
| prettier                    | 3.9.9         |
| supabase (CLI)              | 2.120.0       |
| react                       | 19.3.0        |
| react-dom                   | 19.3.0        |
| react-router-dom            | 7.18.4        |
| @supabase/supabase-js       | 2.117.3       |
| @tanstack/react-query       | 5.104.1       |
| i18next                     | 26.4.3        |
| react-i18next               | 17.0.16       |
| recharts                    | 3.10.1        |

| tailwindcss | 4.3.3 |
| typescript | 6.0.3 |
| typescript-eslint | 8.71.1 |
| vite | 8.3.4 |
| vitest | 5.0.3 |
| zod | 4.6.5 |

The owner approved TypeScript 6 and ESLint 9 (OD-001) to satisfy the required plugin peer ranges. Exact installed versions are listed above. All specified lint rules remain active; no peer bypass flags are used. The complete local verification gate passes. ESLint 9 is deprecated upstream; revisit this approved compatibility exception once jsx-a11y supports ESLint 10.

## Planned stack, not yet installed

Tailwind v4, Cairo and Aref Ruqaa self-hosted fonts are installed in T-0.07.
React Router, TanStack Query, Zod, i18next/react-i18next and Supabase
are installed in Phase 2; Recharts in admin bundle (T-6.02);
Playwright/axe and local pgTAP for database/E2E tasks; Python 3.12 and the pinned
analytics libraries for Phase 9. Record real installed versions as each task
installs them. Do not invent future versions.

T-0.07 uses the documented Tailwind integration only. Anti-Gravity's additional
UI-kit utility/icon dependencies are deferred with T-0.08 for review. All direct
dependencies in this branch have exact pins. Arabic theme copy starts in
`src/i18n/ar.json`; T-2.03 will install the full translation runtime.

## Consequences

Use npm ci --ignore-scripts to reproduce the lockfile. Confirm supported peer ranges before quality tooling installation; do not force or bypass them. Keep dependency changes within roadmap choices. Every future major upgrade requires an ADR. GitHub remote: https://github.com/HassanG04/lolys. External CI/PR validation remains separate from the passing local gate.

## Sources checked

- [Node release metadata](https://nodejs.org/dist/index.json)
- [TypeScript registry metadata](https://registry.npmjs.org/typescript/latest)
- [typescript-eslint supported peers](https://registry.npmjs.org/typescript-eslint/latest)
- [jsx-a11y supported peers](https://registry.npmjs.org/eslint-plugin-jsx-a11y/latest)
- [Vite stable releases](https://vite.dev/releases)
