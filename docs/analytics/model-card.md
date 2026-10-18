# Sales forecast model card

Task T-9.12. Reviewed against source `cd7f738` on 2026-10-15. Status: implementation review; **not approved for production forecasting**. Requirements remain [analytics-plan.md](../spec/analytics-plan.md); observed departures below are defects, not approved changes to that plan.

## What the owner should know

التوقعات تقديرات للمبيعات وليست وعودًا أو أوامر شراء. المتجر الجديد لا يملك تاريخًا كافيًا لتوقع الطلب بدقة. لا تستخدم الأرقام التجريبية لشراء مخزون. تشغيل التوقعات الفعلية مؤجل حتى إصلاح المشكلات الموثقة، ومراجعة بيانات المبيعات الحقيقية، وموافقة صاحب المتجر.

- Intended use: help the owner review stock and likely sales; a person decides purchases.
- The system must not change product prices, stock, orders or payment decisions.
- Synthetic results demonstrate software behavior, not accuracy on this shop's customers.
- No live forecast has been validated in this review. The shop can launch before production forecasting; T-9.13 explicitly follows T-8.10.

## Inputs and outputs

The job reads `analytics.sales_daily` and `analytics.stock_daily` through `db.py`. Sales are aggregated by day, product and category, with units, revenue, order counts and average discount. These queries do not request names, phone numbers, addresses or customer identifiers. Restricted database access still requires an actual role/grant check in the target environment; see [ADR-0003](../adr/0003-analytics-ci-connection.md).

The current sales view includes confirmed/shipped/delivered COD orders and paid non-COD orders, excluding cancelled and rejected-payment orders. This forecasting sales definition differs from the dashboard's delivered-order revenue definition. Do not treat forecast revenue as booked accounting revenue or profit.

| Series   | Intended output                       | Current construction                                                                        |
| -------- | ------------------------------------- | ------------------------------------------------------------------------------------------- |
| Shop     | Daily units and revenue, next 28 days | Dense daily series; final units sum the category forecasts                                  |
| Category | Daily units and revenue, next 28 days | Dense daily series on the shop's history span                                               |
| Product  | Weekly units, next 8 weeks            | Seven-day buckets anchored to the shop's first sale; output also includes estimated revenue |

Revenue currently equals predicted units times the series' historical average unit revenue. It is not a separately trained revenue model and does not know future price or product-mix changes. Input units are clipped while revenue is retained, which can also affect this conversion.

The planned cleaning includes valid-sale filtering, stockout censoring, per-series outlier clipping, promotion features and exclusion of repeated rejected/expired accounts. The execution path currently clips units at a pooled 99th percentile before backtesting. It accepts stock rows but does not use them, and does not invoke the standalone cleaning/feature pipeline. Do not claim that its forecasts already compensate for stockouts or promotions. Full-history clipping also needs correction before claiming end-to-end leakage-free evaluation.

## Data readiness

These are the documented thresholds in `analytics/config.toml`, not proof that a live dataset meets them:

| Level              | Required history and volume                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| Shop               | At least 56 days and 30 orders                                                                               |
| Category           | At least 84 days and 40 units                                                                                |
| Product            | At least 12 weeks and 6 nonzero weeks; otherwise an intermittent method or insufficient-data state           |
| Optional global ML | At least 180 days, 30 active products and the improvement evidence required by ADR-0005; disabled by default |

`evaluate_readiness` also defines preliminary baselines after partial history and an insufficient-data state (`ANL-001`). The current product helper can call a series ready after 3 nonzero weeks **or 5 total units**. The pipeline counts the shop's full span for every category and sums per-product order counts, which can count one multi-product order more than once. These are limitations to reconcile with the intended gates. An insufficient-data counter does not currently prevent the pipeline from emitting predictions for that series.

## Models and evaluation

| Model family              | Source and meaning                                                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seasonal naive            | `models/baselines.py`: repeat the previous seasonal cycle; daily seasonality 7                                                                                 |
| Moving average            | Same module: recent mean; pipeline product baseline uses four weekly observations                                                                              |
| AutoETS / AutoTheta       | `models/statistical.py`: repository implementations, not calls to the `statsforecast` library named in the plan                                                |
| Croston SBA / TSB / ADIDA | `models/intermittent.py`: intermittent weekly-demand candidates                                                                                                |
| Global ML                 | `models/gbm.py`: optional `LightGBMDirectModel`; the class name alone is not evidence of the native LightGBM package being used                                |
| Combination / hierarchy   | Helpers exist in `select.py`; production orchestration currently reconciles category totals to shop units, not the complete product/category/revenue hierarchy |

The selection helper requires at least 5% relative improvement over its supplied baseline. Shop/category comparisons use WAPE; products use MASE. The specification requires three 28-day folds for shop/category and four 4-week folds for products. The current pipeline instead selects up to three folds and uses an eight-week product test horizon; its product fold-count calculation also disagrees with the splitter's minimum training length (see execution findings).

- **WAPE:** total absolute error divided by total actual units. Lower is better; it is not a probability of being correct.
- **MASE:** error scaled against seasonal-naive training error. Below 1 indicates lower error against that scale; zero-denominator cases need careful interpretation.
- **Pinball loss:** penalizes interval quantile errors. Compare it on the same series and units.
- **Bias:** mean prediction minus actual. Positive means overprediction, negative means underprediction.
- **Coverage:** share of observations inside the band. A nominal 80% band does not guarantee 80% coverage on future shop data.

Current model bands use fitted-history residuals. The specified backtest-residual calibration and widening below 70% coverage are not demonstrated by the execution path. Reconciliation adjusts the shop point forecast after model fitting, so that model's pre-reconciliation score is not validation of the final displayed point forecast.

### Reproduced synthetic benchmark

On 2026-10-15, the documented seasonal-naive CLI backtest (seed 42, three 28-day folds) produced mean WAPE **50.42%**, MASE **0.881**, pinball loss **5.994**, bias **-1.20 units**, and coverage **89.3%**. This is generated data only. It provides no estimate of production accuracy, and the CLI's synthetic backtest does not exercise the complete database-to-screen path.

## Retraining, drift and limitations

Each run refits on fetched history. There is no persisted model artifact to incrementally update. The intended routine is weekly after owner activation; `forecast.yml` is currently manual-only under the launch hold. The CLI defaults to a UTC run date; verify Cairo reporting boundaries before relying on calendar behavior.

The drift helper compares 28-day WAPE against a baseline and signals after two consecutive evaluations more than 20% worse. A simulation covers drift and recovery. Live monitoring is not established: naming differs between stored baseline models and the CLI's filter; it does not retain a matched baseline forecast for every candidate date; standalone live checking also fails. A quiet alert is therefore not evidence of healthy accuracy.

Run metadata currently records a commit, static model version, hash of selected sales fields and summary notes. It does not record all library versions, configuration or stock inputs required for full reproducibility. Requirements files use version ranges. Capture the environment used for review without publishing connection strings or customer data.

New products, sparse sales, stockouts, price changes and unseen holidays can make predictions misleading. One synthetic year does not validate the effects of Ramadan, Eid or other annual events. Reorder suggestions depend on the configured lead time, demand estimate and uncertainty; they are not automatic purchase instructions.

**Production hold:** repair and verify the [execution findings](execution-review.md), complete the [operating guide](../runbooks/analytics.md) release checks, and obtain owner approval under T-9.13. Keep global ML disabled. This card does not approve a deviation from the specification.

## Owner review before T-9.12 is done

- [ ] Explain the difference between a synthetic demonstration and evidence from real sales.
- [ ] Explain why an 80% band is uncertain and why a new shop may have no forecast.
- [ ] Identify the run date, model and error metric before acting on a suggestion.
- [ ] Explain when to stop using a forecast and request engineering review.
- [ ] Confirm the limitations above are understood; record reviewer and date in the roadmap work log.
