# ADR-0005: Evaluation and Activation Policy for Global ML (LightGBM) Forecasting Model

- Status: accepted
- Date: 2026-10-15
- Task: T-9.06

## Context

Per `docs/spec/analytics-plan.md` Section 5 and Roadmap Task T-9.06:
The forecasting pipeline follows a progressive rung hierarchy:

- **Rung 0 (Baselines):** Seasonal Naive (7-day cyclical projection), 28-day Moving Average.
- **Rung 1 (Statistical):** AutoETS, AutoTheta.
- **Rung 2 (Intermittent):** Croston SBA, TSB, ADIDA.
- **Rung 3 (Global ML):** Global gradient-boosted trees (LightGBM) using direct multi-horizon forecasting with lag, rolling, calendar, price, discount, and stock availability features.

Global gradient boosting models pool cross-sectional demand across multiple series, potentially capturing complex non-linear interactions between promotions, Hijri calendar events, and inventory levels.

However, machine learning models face distinct risks in retail settings:

1. **Small Data Overfitting:** At store launch, Lolys' Accessories & Home possesses 0 days of real operational history and ~12 active seed products. Tree-based ensembles require substantial sample volume across multiple retail seasons to avoid memorizing noise.
2. **Missing Long-Term Patterns:** Annual cycles (Ramadan, Eid al-Fitr, Eid al-Adha, Black Friday) require historical cycles to learn feature effect sizes without spurious correlations.
3. **Operational Overhead:** Gradient boosted tree maintenance requires feature pipeline persistence, hyperparameter tuning, and binary native library dependencies.

## Decision

We establish the following policy regarding the Rung 3 Global ML (LightGBM) model:

### 1. Hard Readiness Gates for Activation

The global ML model is **strictly optional and gated**. It is barred from activation in production until all three conditions are satisfied:

1. **Temporal Horizon:** At least 6 continuous months ($\ge 180$ days) of recorded sales history in `analytics.sales_daily`.
2. **Catalog Breadth:** At least 30 active products with regular sales history in the catalog.
3. **Empirical Superiority:** In rolling-origin backtests over the store's recorded history, LightGBM must beat the best statistical model (AutoTheta / AutoETS) by at least 5% relative WAPE on shop and category series.

### 2. Launch Status: Model Remains Disabled

Because the shop is newly launched:

- The Global ML model **remains disabled** (`enabled = false` in `analytics/config.toml`).
- Production forecasts default to Rung 1 (AutoTheta / AutoETS) for regular series and Rung 2 (Croston SBA / TSB / ADIDA) for intermittent items once preliminary data gates (56 days for shop, 84 days for categories) are reached.
- Until preliminary gates are reached, the system displays the honest "not enough data yet" badge (ANL-001) with preliminary baseline projections.

### 3. Implementation and Future Readiness

To ensure the architecture is ready when the data volume thresholds are reached:

- `analytics/src/lolys_analytics/models/gbm.py` implements the `LightGBMDirectModel` and `GradientBoostingDirectModel` direct multi-horizon forecasting framework.
- The model extracts:
  - Lags: 1, 7, 14, 28 days.
  - Rolling windows: 7-day and 28-day means and standard deviations.
  - Egyptian and Hijri calendar indicators: weekday, month, Ramadan, Eid al-Fitr, Eid al-Adha, Mother's Day, Valentine's Day, Black Friday, Back-to-School.
  - Promotion features: daily discount percentage.
  - Stock availability: `in_stock_fraction` with loss masking on stockout days.
- It includes automated gate validation (`check_readiness(history_days, active_products)`).
- Conformal 80% prediction intervals are generated from validation residuals.

## Consequences

- **Zero Overfitting at Launch:** The store avoids deploying high-capacity ML models on sparse preliminary sales data.
- **Architectural Completeness:** The feature extraction pipeline, direct multi-horizon structure, and backtesting comparison harness are fully implemented and verified under automated tests.
- **Smooth Transition Path:** When the business reaches 6 months of operations and expands the catalog to $\ge 30$ products, the owner can enable the model in `config.toml` without redesigning the pipeline.
