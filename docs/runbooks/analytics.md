# Analytics operating guide

Task T-9.12; reviewed 2026-10-15 at `cd7f738`. Read the [model card](../analytics/model-card.md) first. **Production forecasting is on hold.** This guide distinguishes executable local rehearsals from procedures that require repairs or owner action.

## Local setup and safe rehearsal

Use the Node version in `.nvmrc` and Python 3.12, matching the workflow. Run from the repository root. A Python virtual environment avoids changing another project's packages; `analytics/.venv/` is ignored by Git. On Windows PowerShell:

```powershell
python -m venv analytics/.venv
.\analytics\.venv\Scripts\Activate.ps1
npm ci --ignore-scripts
npm run analytics:install
npm run analytics:test
node scripts/run-analytics.mjs cli info
```

`analytics:install` installs from `requirements-dev.txt`; those files currently use ranges, not an exact lock. Record Python/package versions for any benchmark. Do not read, print or commit `.env` values, connection strings or credentials.

The following commands use synthetic data and need no database credentials:

```powershell
node scripts/run-analytics.mjs cli backtest --model seasonal_naive --folds 3 --horizon 28 --seed 42
node scripts/run-analytics.mjs cli backtest --model auto_theta --folds 3 --horizon 28 --seed 42
node scripts/run-analytics.mjs cli check-drift --simulate
node scripts/run-analytics.mjs run --synthetic --dry-run --days 365 --seed 42 --date 2026-10-15
```

The 365-day dry run is a reproducible rehearsal, **not a workaround that makes production ready**. The default 180-day pipeline currently fails product fold construction. See F-01 in [execution-review.md](../analytics/execution-review.md). Always retain both `--synthetic` and `--dry-run` for an offline rehearsal: without the former the runner reads a database; without the latter it writes one. `--env staging` alone does not mean simulation.

The successful 365-day rehearsal produced 368 forecast rows and 354 metric rows for 31 series, without database writes. The existing analytics suite passed 80 tests plus Ruff on the reviewed source, but additional probes found failures it misses. `npm run analytics:forecast` still calls the pending-task stub; use the documented runner for rehearsals, not that placeholder command.

## Read a backtest

The CLI backtest always generates a synthetic **shop daily-units** series. Choosing a product-style model does not turn it into a production product backtest. Keep seed, folds, horizon, source commit and dependency versions together when comparing models. A baseline run and candidate run must use the same observations and split.

Review WAPE, MASE, bias, interval loss and coverage together. Check seasonal-naive performance before accepting a more complex model. The required improvement is relative: reducing WAPE from 40% to 38% is 5% improvement. A synthetic improvement is not permission to enable a production model.

## Read a failed workflow

Open GitHub Actions → **Weekly Sales Forecast & Inventory Analytics** → the failed run. Record its URL, commit, selected environment, synthetic flag, failing step and sanitized error. Never copy secrets or raw customer data into a report.

| Symptom                                      | Interpretation and next action                                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Dependency installation failure              | Check the selected Python version and resolved package versions; do not bypass dependency checks                           |
| Missing connection variable                  | Owner checks that the correct environment's secret exists; do not paste its value or substitute a service-role key         |
| Connection/permission failure                | Owner checks the actual project endpoint, TLS and restricted login grants from ADR-0003; do not broaden grants to `public` |
| `ANL-001`, no sales                          | No eligible sales were returned; exit code 0 here does not mean forecasts were written                                     |
| Insufficient series length                   | F-01: training-length disagreement; capture aggregate length/folds, not customer records                                   |
| Five placeholders / six parameters           | F-03: writer parameter mismatch; do not retry against production                                                           |
| `dt` unbound in `check-drift`                | F-04: standalone CLI defect; the simulation passing does not validate this path                                            |
| Negative/nonfinite/oversized forecast        | Stop publication and investigate; do not remove validation or label a failed result successful                             |
| Green run, unexpected model or empty display | Check stored rows and model provenance; F-02 means a model label currently need not match the generated numbers            |

The intended writer transaction replaces the same date's run and cascades its old forecasts/metrics. Repeating a date is a data replacement, not a harmless append. Preserve evidence before an owner-approved rerun. A read-only dry run does not verify writer permissions, transaction behavior or the admin display.

## Manual baseline procedure: current boundary

There is currently **no supported force-baseline flag, UI switch or complete manual publication procedure**. Do not invent `--model` for `run`: that option belongs only to `backtest`. Disabling global ML does not disable AutoETS/AutoTheta, and the automatic drift branch is not a manual override.

Until a reviewed fix exists, keep production forecasting disabled and use this offline diagnostic baseline:

```powershell
node scripts/run-analytics.mjs cli backtest --model seasonal_naive --folds 3 --horizon 28 --seed 42
```

That command compares generated data; it does not repair a live display or guide real purchases. If a live forecast must be withdrawn, the owner uses the documented incident process and records the affected run. Do not relabel forecasts, edit stored predictions manually, or disable validation/RLS. Engineering must implement and test the baseline publication path required by the plan before T-9.13.

## Adding or changing a model

1. Open a task branch; read the analytics plan and ADR-0005. A new dependency or architecture change needs its documented decision first.
2. Follow the existing model contract: stable `model_name`, `fit` on training history only, `predict(horizon)` returning `ForecastResult` with point/lower/upper arrays of the requested length. Keep inputs aggregate-only.
3. Add behavior tests for empty/short/constant/intermittent history, deterministic results, temporal isolation, finite nonnegative output and interval ordering. Test actual pipeline selection through prediction, not just the selector helper.
4. Register the exact same model identifier in CLI choices, pipeline candidate construction, model lookup, persisted metadata and drift handling. Prove that the winning model actually generated the stored forecast; F-02 demonstrates why.
5. Compare with baselines on matching rolling splits, follow the plan's product/shop horizons, and verify the complete reconciled output and interval coverage. Passing the data threshold is not proof of accuracy.
6. Update this card, configuration, dependency evidence and benchmark report. Run analytics tests and full repository verification. Obtain review before activation; production stays owner-controlled.

## Owner activation checklist (T-9.13, after shop launch)

- [ ] All execution findings are fixed with regression evidence, and spec departures in the model card are reconciled.
- [ ] Real data meets the per-series gates; baseline/candidate comparisons use matching dates and the final displayed numbers.
- [ ] The target database uses the expected schema and restricted analytics login. Use the project's actual connection details, not a guessed pooler hostname. Secret names are `ANALYTICS_DB_URL_STAGING` and `ANALYTICS_DB_URL_PRODUCTION`; neither is a browser variable.
- [ ] Avoid the generic `ANALYTICS_DB_URL` fallback when separating environments. Confirm the target before running anything connected.
- [ ] Prove read, atomic write, same-date replacement, rollback and AAL2-only display in disposable/local testing and then an owner-controlled staging rehearsal. Never use a public/service-role browser key for this pipeline.
- [ ] Synthetic data cannot be written to production. The current workflow exposes a synthetic option without an environment guard; do not select it for production.
- [ ] Confirm failed-run notifications arrive, baseline recovery works, privacy thresholds hold, and logs contain no personal data or credentials.
- [ ] Owner records approval of the first real production run. Scheduled workflows remain manual-only until an explicitly reviewed launch change; this guide does not enable any schedule.

## Update routine

After a model, cleaning rule or dependency change, rerun benchmarks and update the model card with the source commit, dataset type, metrics and remaining limitations. Recheck calendar dates annually. After activation, review failed jobs and measured accuracy weekly; a successful workflow or a missing alert alone is not proof that a forecast is trustworthy.
