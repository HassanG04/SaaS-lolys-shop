# Analytics execution findings

2026-10-15, source `cd7f738`; discovered while verifying T-9.12 operating instructions. No remote database was accessed, no production forecasts were written, and no forecast schedule was enabled. These findings reopen execution verification for T-9.08/T-9.09; the existing 80-test analytics suite passing does not resolve them.

| ID   | Reproduction / evidence                                                                                                         | Expected                                                                              | Observed / follow-up                                                                                                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 | `forecast.py:compute_n_folds` and product caller; `backtest.py:create_rolling_origin_folds`; 180 consecutive daily observations | The default simulation can construct valid product folds or use a documented fallback | Pipeline budgets four training weeks; splitter requires fourteen observations. A 26-week series requests two eight-week folds and raises `Minimum required is 30 observations`. Align split contracts and add a default-CLI regression  |
| F-02 | `forecast.py:models_dict`; `models/statistical.py:model_name`; deterministic 365-day increasing sales probe                     | The selected model produces the predictions carrying its label                        | Category selection reports `auto_ets`, but predictions exactly equal seasonal naive. Lookup uses `autoets`/`autotheta`, while models emit underscored identifiers. Test selected-model provenance through final output                  |
| F-03 | `write.py:write_forecast_run`; psycopg parameter adaptation without opening a connection                                        | Forecast-run insertion accepts the supplied parameters                                | SQL has five placeholders plus literal `completed`, but receives six parameters. Psycopg raises `ProgrammingError: the query has 5 placeholders but 6 parameters were passed`. Existing MockAnalyticsDb does not enforce driver binding |
| F-04 | `cli.py:main`, `check-drift` with a mocked connection and one accuracy row                                                      | Standalone drift check evaluates returned data                                        | `UnboundLocalError` for `dt`: import occurs only in the separate `run` branch. Cover the non-simulation CLI path                                                                                                                        |

## Additional source-review gaps before forecast activation

- `run_forecast_pipeline` does not use `stock_rows`, invokes no standalone feature/poison-cleaning pipeline, and clips pooled units across full history before evaluation rather than per series/training fold.
- Category age uses shop age; per-product order counts are summed for the shop gate. Insufficient-data series can still emit predictions.
- Product backtests use at most three eight-week folds instead of the specified four four-week folds. Product/category/shop revenue and units are not fully reconciled.
- `run` and `check-drift` filter the literal `SeasonalNaive`, but the baseline implementation emits `seasonal_naive`. Matched baseline predictions are not persisted alongside every candidate; live drift/fallback needs an end-to-end test. Shop reconciliation can overwrite points after a shop-level fallback.
- Live accuracy queries do not cap dates at today; the SQL accuracy view treats absent actuals as zero. Future periods must not count as observed zero sales. Product weekly totals also require weekly actuals, not one day's actuals.
- There is no supported manual baseline publication command. A backtest's `--model` option does not apply to `run`.
- Global ML activation checks in the pipeline do not demonstrate all ADR-0005 gates. Keep it disabled. Current model intervals and metadata do not establish the specified held-out calibration or complete dependency/input reproducibility.
- Remote TLS helper upgrades absent/`disable` settings but does not reject weaker explicit modes such as `prefer`. The documented TLS guarantee needs validation against the accepted connection modes.

These are engineering verification gaps, not requests to weaken the specification. Resolve them in bounded follow-up changes with tests; do not modify merged migrations. Readiness and privacy changes require the normal security review.

## Verification performed for the documentation

- Pinned Node 24.21.0; `npm ci --ignore-scripts`: 438 packages installed, zero audit vulnerabilities; ESLint 9 emitted its deprecation notice (the compatible-major exception remains unchanged).
- `analytics:test`: 80 tests passed; Ruff lint and formatting passed.
- Synthetic seasonal-naive backtest: three 28-day folds, seed 42; WAPE 50.42%, MASE 0.881, pinball 5.994, bias -1.20, coverage 89.3%.
- Drift simulation: healthy → one-week warning → two-week alert → continued fallback → recovery.
- 365-day synthetic dry run: 368 forecasts, 354 metrics, 31 series; no database writes. This proves command execution, not correctness of the selected model or production readiness.
- F-01 through F-04 reproduced locally: series-construction probe, numerical comparison, real psycopg parameter adapter, and mocked network boundary respectively.
- Full repository verification: result recorded in the task work log after the documentation change. No remote CI result, owner sign-off or real database write is implied by these local checks.
