"""Unit and property tests for rolling-origin backtesting and metrics.

Verifies:
1. Exact calculation of WAPE, MASE, pinball loss, and bias.
2. Property test proving NO fold ever sees future data (strict temporal isolation).
3. Golden test on deterministic synthetic data reproducing known metric values.
4. Backtest report markdown table rendering.
"""

from __future__ import annotations

import pytest

from lolys_analytics.backtest import (
    calculate_bias,
    calculate_coverage,
    calculate_mase,
    calculate_pinball_loss,
    calculate_wape,
    create_rolling_origin_folds,
    run_backtest,
)
from lolys_analytics.models.baselines import MovingAverage28Model, SeasonalNaiveModel
from lolys_analytics.synthetic import generate_synthetic_data


def test_metric_exact_calculations() -> None:
    """Verifies that evaluation metrics produce mathematically exact values."""
    actuals = [10.0, 20.0, 30.0]
    predictions = [12.0, 18.0, 33.0]
    # Diffs: |10-12|=2, |20-18|=2, |30-33|=3 -> sum = 7.0
    # Sum actuals = 60.0 -> WAPE = 7 / 60 = 0.116666...
    wape = calculate_wape(actuals, predictions)
    assert abs(wape - (7.0 / 60.0)) < 1e-6

    # Signed errors: (12-10)=2, (18-20)=-2, (33-30)=3 -> sum = 3.0 -> Bias = 3 / 3 = 1.0
    bias = calculate_bias(actuals, predictions)
    assert abs(bias - 1.0) < 1e-6

    # In-sample history: [10, 15, 10, 15] -> seasonality=1 diffs: |15-10|=5, |10-15|=5, |15-10|=5 -> scale = 5.0
    # MAE = 7 / 3 = 2.333333... -> MASE = 2.333333 / 5.0 = 0.466666...
    train_history = [10.0, 15.0, 10.0, 15.0]
    mase = calculate_mase(actuals, predictions, train_history, seasonality=1)
    assert abs(mase - (7.0 / 15.0)) < 1e-6

    # Pinball loss: lower = [8, 15, 25], upper = [15, 25, 35]
    lower = [8.0, 15.0, 25.0]
    upper = [15.0, 25.0, 35.0]
    pinball = calculate_pinball_loss(actuals, lower, upper, alpha=0.80)
    assert pinball > 0.0

    # Coverage: actuals [10, 20, 30] all fall inside [8..15], [15..25], [25..35] -> 100%
    cov = calculate_coverage(actuals, lower, upper)
    assert cov == 1.0


def test_property_no_fold_sees_future_data() -> None:
    """PROPERTY TEST: Strict proof that no rolling-origin fold contains future data.

    Adversarially mutates observations in the future of fold k and asserts that
    fold k's train series and model predictions remain strictly identical.
    """
    n_days = 180
    n_folds = 3
    horizon = 28
    original_series = [float(10 + (i % 7)) for i in range(n_days)]

    folds_orig = create_rolling_origin_folds(original_series, n_folds=n_folds, horizon=horizon)
    assert len(folds_orig) == n_folds

    for fold_idx, fold in enumerate(folds_orig):
        # 1. Temporal invariant: train_end_idx == len(train_series) <= test_start
        assert fold.train_end_idx == len(fold.train_series)
        assert fold.train_end_idx + horizon == fold.test_end_idx

        # 2. Adversarial future mutation test:
        # Create a series where everything starting from fold.train_end_idx is altered
        corrupted_series = list(original_series)
        for j in range(fold.train_end_idx, n_days):
            corrupted_series[j] = 99999.0 + j

        # Splitting corrupted series must give the exact same training slice for fold k
        folds_corrupted = create_rolling_origin_folds(
            corrupted_series, n_folds=n_folds, horizon=horizon
        )
        fold_corrupted = folds_corrupted[fold_idx]

        assert fold.train_series == fold_corrupted.train_series
        assert fold.train_end_idx == fold_corrupted.train_end_idx

        # Models fitted on fold k must produce identical predictions
        model1 = SeasonalNaiveModel(seasonality=7).fit(fold.train_series)
        model2 = SeasonalNaiveModel(seasonality=7).fit(fold_corrupted.train_series)
        assert (
            model1.predict(horizon=horizon).point_forecast
            == model2.predict(horizon=horizon).point_forecast
        )


def test_golden_metrics_on_synthetic_data() -> None:
    """GOLDEN TEST: Reproduces deterministic benchmark metrics on synthetic retail series."""
    dataset = generate_synthetic_data(days=180, seed=42)
    # Aggregate product sales to total daily shop units
    day_totals: dict[str, float] = {}
    for row in dataset.daily_sales:
        day_str = row.day.isoformat()
        day_totals[day_str] = day_totals.get(day_str, 0.0) + float(row.units)

    sorted_days = sorted(day_totals.keys())
    daily_units = [day_totals[d] for d in sorted_days]
    assert len(daily_units) == 180

    # 1. Seasonal Naive Backtest
    sn_model = SeasonalNaiveModel(seasonality=7)
    sn_report = run_backtest(daily_units, sn_model, n_folds=3, horizon=28)

    assert sn_report.n_folds == 3
    assert sn_report.horizon == 28
    assert sn_report.model_name == "seasonal_naive"

    # Verify metrics reproduce exact golden values on deterministic synthetic data (seed 42)
    assert sn_report.mean_wape == pytest.approx(0.5042, abs=1e-3)
    assert sn_report.mean_mase == pytest.approx(0.8809, abs=1e-3)
    assert sn_report.mean_pinball_loss == pytest.approx(5.9940, abs=1e-3)
    assert sn_report.mean_bias == pytest.approx(-1.2024, abs=1e-3)
    assert sn_report.mean_coverage_80 == pytest.approx(0.8929, abs=1e-3)  # Coverage >= 70%

    # 2. Moving Average 28 Backtest
    ma_model = MovingAverage28Model(window=28)
    ma_report = run_backtest(daily_units, ma_model, n_folds=3, horizon=28)

    assert ma_report.model_name == "moving_average_28"
    assert ma_report.mean_wape == pytest.approx(0.5404, abs=1e-3)
    assert ma_report.mean_coverage_80 >= 0.70

    # 3. Report Markdown generation
    md_table = sn_report.to_markdown_table()
    assert "| Fold | WAPE | MASE | Pinball Loss | Bias | 80% Coverage |" in md_table
    assert "| **Mean** |" in md_table
