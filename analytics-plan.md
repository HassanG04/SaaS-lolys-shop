# Analytics plan: sales forecasting and data analysis

Version 1.0, 2026-10-07. Applies to roadmap v1.1, Phase 9 (T-9.01 to T-9.13).

## 1. Goals

1. Predict future sales (units and revenue) for the whole shop, each category and each product, with honest uncertainty.
2. Turn forecasts into decisions: what to restock, what is at risk of selling out, what is not moving.
3. Give the owner clear descriptive analysis: who buys, what sells together, where orders fail.
4. Do all of it without exposing personal data and without a secret key in the pipeline.

Not goals before launch: personalised recommendations, price optimisation, customer-level prediction (churn), any LLM feature.

## 2. Reality check: small data

A new shop has weeks, not years, of history. Weekly patterns need about 8 weeks; yearly patterns (Ramadan, Eid, Mother's Day) need at least a full cycle and, because the Hijri calendar moves about 11 days earlier each year, several cycles. So:

- The system says **"not enough data yet"** (ANL-001) instead of showing a made-up number. Simple baselines are shown with a clear "preliminary" label.
- Calendar events are used as known inputs from day one (we know when Ramadan and Eid fall); their effect size is learned only as data arrives.
- Development and tests use a **synthetic data generator**, because there is no real history yet. Production forecasts are switched on by the owner after the thresholds below are met (T-9.13).

## 3. Data

**Source:** the `analytics` schema (see `database-contract.md`, section 9). It holds aggregates only: no names, phones, addresses, or user ids.

**Granularity and horizons**

| Level | Series | Forecast |
|---|---|---|
| Shop | daily units and revenue | next 28 days |
| Category | daily units and revenue | next 28 days |
| Product | weekly units | next 8 weeks |

**Cleaning rules (applied in SQL views and again in Python)**

- Include only orders that count as sales: not cancelled, not payment-rejected, not expired. Cash-on-delivery orders count as sales when delivered or shipped (decision: count at `confirmed` or later, because refusal at the door is tracked separately as an analysis).
- **Stock-outs censor demand.** A day with closing stock 0 (from `analytics.stock_daily`) is flagged. Statistical models treat flagged days as missing and fill them from the same weekday's median; the gradient-boosting model gets an `in_stock_fraction` feature and masks those rows in the loss.
- **Promotions:** daily average discount percentage is a feature. Future discount is assumed to be the current `sale_percent` setting if the sale banner is active, otherwise 0.
- **Outliers:** winsorise at the 99th percentile per series and log how many points were clipped. One large wholesale-style order must not distort the forecast.
- **Poisoned data:** orders from accounts with 3 or more expired or rejected orders in 30 days are excluded from training (rule is configurable).

**Calendar (`analytics.calendar`)**: weekday, month, day of month, Ramadan, Eid al-Fitr, Eid al-Adha, Mother's Day (21 March), Valentine's Day (14 February), Black Friday, back-to-school period. Hijri dates come from a conversion library and are checked against an official calendar table committed in the repo and reviewed every year (moon sighting can shift a date by a day).

**Data readiness gates (defaults in `analytics/config.toml`)**

| Level | Needed before a model forecast is shown |
|---|---|
| Shop | 56 days since the first sale and at least 30 orders |
| Category | 84 days and at least 40 units sold in the category |
| Product | 12 weeks with at least 6 non-zero weeks; otherwise an intermittent-demand method or "not enough data" |

## 4. Pipeline

```
Postgres (public tables)
   |  views and triggers keep aggregates only
   v
analytics schema  ---(analytics_reader: select on views)--->  Python job
                                                                |  features -> models -> backtests -> selection
                                                                v
analytics.forecast_* tables  <---(analytics_writer: insert only)---
   |
   v
Admin screens (Arabic): forecast chart, reorder list, analysis pages
```

- **Where it runs:** a GitHub Actions workflow `forecast.yml`, weekly (Sunday night, Cairo) plus manual run. Timeout 30 minutes. A failed run emails the owner through GitHub notifications.
- **Secrets:** one connection string per environment (`ANALYTICS_DB_URL_STAGING`, `ANALYTICS_DB_URL_PRODUCTION`) for the restricted roles. The service-role key is never used. Connect over TLS. *(verify the right Supabase connection method for custom roles from CI; record the choice in an ADR in T-9.01.)*
- **Idempotent:** a run writes one `forecast_runs` row and its forecasts; rerunning the same day replaces that day's run, never duplicates.
- **Reproducible:** each run stores the git commit, library versions and a hash of the input data.

## 5. Models

Start simple and climb only when the simpler model is beaten in backtests.

| Rung | Models | Used when |
|---|---|---|
| 0 Baselines | seasonal naive (same weekday last week), 28-day moving average | always computed; the bar every other model must beat |
| 1 Statistical | AutoETS, AutoTheta (Nixtla `statsforecast`) | shop and category series that pass the gates |
| 2 Intermittent demand | Croston (SBA variant), TSB, ADIDA | slow products with many zero weeks |
| 3 Global ML (optional, gated by ADR) | LightGBM with lag, rolling, calendar, price, discount and stock features, one direct model per horizon bucket | once there are at least 6 months of data and 30 or more active products |
| 4 Combination | median of the top 2 or 3 models by backtest | when it beats the best single model |
| 5 Hierarchy | bottom-up first; MinT reconciliation only if backtests show it helps | so shop, category and product forecasts add up |

**Intervals:** 80% prediction interval (10th and 90th percentiles) using conformal prediction on backtest residuals; coverage is checked in backtests and the band is widened if coverage falls below 70%.

## 6. Evaluation and selection

- **Rolling-origin backtests:** shop and category use 3 folds of 28 days; products use 4 folds of 4 weeks. No fold ever sees the future.
- **Metrics:** WAPE for shop and category, MASE (against seasonal naive) for products, pinball loss for the intervals, and bias (mean signed error). Report all four.
- **Selection rule:** per series, pick the model with the best metric; it must beat seasonal naive by at least 5%, otherwise seasonal naive is used and flagged.
- **Sanity checks before writing:** forecasts are finite and not negative; no value above 5 times the series' historical maximum; hierarchy sums within tolerance; failing series fall back to baseline.

## 7. What the owner sees (Arabic, admin only)

**Forecast page ("التوقعات"):** a chart with history, forecast and the 80% band for the shop, a category or a product; a "preliminary" or "not enough data" badge when the gates are not met; the model used and its recent error in plain words.

**Reorder list:**
- `cover_days = stock / daily_forecast` (14-day mean)
- `reorder_point = daily_forecast x lead_time + z x sigma x sqrt(lead_time)` with default lead time 7 days and z = 1.28 (about a 90% service level); sigma comes from backtest residuals
- Flag a product when `stock <= reorder_point`; suggest `ceil(daily_forecast x (lead_time + 7) + safety - stock)`
- Lead time and service level live in `analytics/config.toml` at first and move to settings later (ADR)

**Stock risk:** products likely to sell out within the next 14 days; "dead stock" products with no sale in 60 days; estimated lost sales on past stock-out days.

## 8. Data analysis catalogue

| Analysis | Definition | Shown in |
|---|---|---|
| Sales overview | 7- and 28-day averages, weekly and seasonal pattern (STL decomposition) | Analytics page |
| Product performance | revenue share, ABC class (A = first 80% of revenue), XYZ class (variability of weekly demand: X below 0.5, Y 0.5 to 1, Z above 1) | Analytics page |
| Customer segments | RFM quintile scores grouped into champions, loyal, promising, at risk, lost; counts and revenue only | Analytics page |
| Cohorts | customers grouped by first-order month, share ordering again in later months | Analytics page |
| Basket analysis | product pairs with support at least 2% (or 5 orders), confidence and lift; feeds "bought together" suggestions | Analytics page, product page (optional) |
| Discount effect | units in discount weeks versus matched non-discount weeks, shown as a range with a "not proof of cause" note | Analytics page |
| Fulfilment quality | cancellation, refusal and expiry rates by governorate, delivery method and payment method; median days to deliver; InstaPay proof-to-paid time | Analytics page |
| Geography | orders and revenue by governorate | Analytics page |
| Stock health | days of cover, dead stock, stock-out days | Forecast page |

**Privacy rule in the UI:** any group with fewer than 5 customers is merged into "أخرى" (other). Customer-level drill-downs use `customer_stats` through the admin session (admin at `aal2`), not the analytics role.

## 9. Monitoring

- `analytics.forecast_accuracy` compares each past forecast with what actually happened, by horizon.
- **Alert rule:** if the 4-week rolling WAPE of the shop forecast is more than 20% worse than seasonal naive for 2 weeks in a row, switch the display back to the baseline, mark it, and surface a banner to the admin.
- A weekly job summary (rows written, series skipped, clipped points, failures) is stored in `forecast_runs.notes`.
- `docs/analytics/model-card.md` records data used, model list, metrics, limits and the retraining routine; it is updated on every model change.

## 10. Security and privacy

- Roles: `analytics_reader` can select analytics views only; `analytics_writer` can insert into forecast tables only; neither can read `public` tables (pgTAP S31).
- No personal data in the `analytics` schema, in job logs, in notebooks or in committed files. Notebooks may not contain data outputs (a pre-commit check strips them).
- The job validates its own output before writing (section 6) and never executes anything it reads from the database.
- Cancelled, rejected and flagged orders are excluded so fake orders cannot steer restocking.
- Dependencies are pinned with a lockfile and covered by Dependabot like the web app.

## 11. Code layout

```
analytics/
|-- pyproject.toml  config.toml  uv.lock (or requirements lock)
|-- src/lolys_analytics/
|   |-- db.py  data.py  features.py  calendar.py  synthetic.py  cli.py
|   |-- models/  baselines.py  statistical.py  intermittent.py  gbm.py
|   |-- backtest.py  select.py  forecast.py  write.py
|   '-- insights/  rfm.py  basket.py  cohorts.py
|-- tests/
'-- notebooks/        exploration only, outputs stripped
```

Tooling: Python 3.12, ruff, pytest, type hints checked in CI. Library choices (`statsforecast`, scikit-learn, LightGBM, a Hijri conversion library) follow the roadmap rule: current stable majors, versions recorded in an ADR.

## 12. Task map

| Task | Delivers |
|---|---|
| T-9.01 | analytics schema, roles, views, calendar table, tests |
| T-9.02 | Python project, config, synthetic data generator |
| T-9.03 | feature builder and calendar events |
| T-9.04 | baselines and backtesting harness with metrics |
| T-9.05 | statistical and intermittent models, intervals |
| T-9.06 | optional LightGBM model behind an ADR |
| T-9.07 | selection, readiness gates, fallbacks, output validation |
| T-9.08 | weekly forecast workflow and database writes |
| T-9.09 | accuracy tracking and drift alert |
| T-9.10 | Arabic admin forecast and reorder screens |
| T-9.11 | descriptive analyses and the Analytics page |
| T-9.12 | model card and analytics runbook |
| T-9.13 | owner's go-live of production forecasts once the data gates are met |

## 13. Open questions

- Supplier lead times and desired service level per category (defaults assumed).
- Planned promotion calendar: should the admin enter future sales in advance? (defaults to the current sale setting).
- Should forecasts be visible to a future staff role? (not at launch).
