# T-0.01–T-0.06: Bootstrap the application and engineering workflow

The repository previously contained only its initial README. This change adds
the strict React/Vite foundation, reproducible dependencies, required reference
layout, quality checks and dependency-aware roadmap CLI. The application
deliberately remains the blank bootstrap screen required by T-0.01.

## Scope

- T-0.01: project, folder skeleton, Node pin and safe environment template.
- T-0.02: lint, formatting, strict types, application tests and explicit future-task stubs.
- T-0.03: roadmap commands and 27 parser/CLI tests.
- T-0.04/T-0.05: instructions, handover, PR/ADR templates and runbook index.
- T-0.06: four SHA-pinned CI jobs with read-only permissions and coverage threshold.

Each task is a small logical foundation unit. Reference documents and generated
lockfile account for most of the diff. Original SQL remains reference-only;
no database migrations, payment operations or production behavior are enabled.

## Validation

Full local `npm run verify` passed on Node 24.21.0: lint, formatting, strict
types, one application test, 27 tooling tests and production build. A clean
locked install reported no dependency vulnerabilities. Reference copies and
the six SQL sections match the supplied originals. Dev page verified in browser.
The [deliberate lint-failure run](https://github.com/HassanG04/lolys/actions/runs/37929038785)
passed build, unit and roadmap; static correctly rejected the unused `probe`
variable. That temporary probe is now removed; the final green run is pending.
Coverage thresholds are configured for `src/lib`, which is currently empty;
the report has no measurable lines yet and does not establish 80% coverage.

## Security and limitations

SEC-16: exact package pins, lockfile, installs with scripts disabled, SHA-pinned
Actions. SEC-24: owner reviews CI changes; agents do not merge or deploy.
OD-001 approves TypeScript 6/ESLint 9 because the specified plugins do not
support the newest majors. No checks or peer constraints were bypassed.

Future guard commands fail explicitly until their owning task implements them.
T-0.09 adds bundle/secret guards and T-2.03 adds the translation scanner to CI.
Docker is not installed, so database work is not verified. The external
Anti-Gravity's partial T-0.07 theme work is checkpointed locally for continuation
after this foundation check. The owner paused that application to avoid concurrent edits.
