# ADR-0004: Analytics Python Toolchain and Library Stack

- Status: accepted
- Date: 2026-10-14
- Task: T-9.02

## Context

The analytics and forecasting pipeline (Phase 9, T-9.01 to T-9.13) requires a robust, reproducible Python environment for data simulation, feature engineering, statistical forecasting, evaluation, and database synchronization.

Per `docs/spec/analytics-plan.md` Section 11 and Roadmap Non-negotiable 1.1:

1. Code must be strictly typed, deterministic, and covered by automated tests.
2. Dependencies must be pinned with lockfiles and audited by Dependabot.
3. Personal customer data is never accessed or stored.
4. Tooling must execute cleanly both locally and inside GitHub Actions CI (`ci.yml`).

## Decision

We establish the `analytics/` workspace package with the following toolchain and dependencies:

### 1. Python Version

- **Target:** Python 3.12+ (compatible with Python 3.12, 3.13, 3.14).

### 2. Core Tooling

- **Test Framework:** `pytest` (>= 8.0) for unit and property-based tests.
- **Linter & Formatter:** `ruff` (>= 0.8) for fast PEP 8, flake8, and type-linting.
- **Type Checking:** Type annotations throughout all modules (`typing`, `dataclasses`).

### 3. Core Libraries

- **Data & Computation:** `numpy` (>= 1.26, < 3.0), `pandas` (>= 2.2, < 3.0), `scipy` (>= 1.12).
- **Configuration:** Python standard library `tomllib` (built-in in Python 3.11+) with fallback to `tomli` for older versions.
- **Database Driver:** `psycopg` (v3, >= 3.1) for TLS direct connection without service-role key.

### 4. Forecasting Stack (to be leveraged across Phase 9)

- **Statistical & Intermittent:** `statsforecast` (>= 1.7) for AutoETS, AutoTheta, and Croston/TSB.
- **Baseline & Metrics:** `scikit-learn` (>= 1.4) for auxiliary transformations and metrics.
- **Tree-based ML (Rung 3, optional):** `lightgbm` (>= 4.3).

## Alternatives considered

1. **Poetry vs Pip/Uv:**
   - Standard `pyproject.toml` with `pip` / `requirements.txt` was chosen for universal portability across standard GitHub Actions runners (`actions/setup-python`) and local Conda/venv setups without requiring third-party package managers.

2. **Prophet:**
   - _Why rejected:_ Heavy C++ Stan dependency, slower runtimes, poor intermittent demand handling on retail inventory. `statsforecast` is significantly faster and natively supports intermittent demand models (Croston, TSB, ADIDA) crucial for slow-moving store items.

## Consequences

- All analytics Python code lives under `analytics/src/lolys_analytics/`.
- Tests live under `analytics/tests/`.
- Execution is wired to `npm run analytics:install` and `npm run analytics:test` via `scripts/run-analytics.mjs`.
- CI runs `analytics` job alongside `unit`, `build`, and `db`.
