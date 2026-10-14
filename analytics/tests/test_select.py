"""Unit tests for model selection, readiness gates, validation, and reconciliation.

Per T-9.07 and analytics-plan.md Sections 3, 5, and 6:
- Readiness gates for shop, category, and product.
- The 5% beat rule over baseline (Seasonal Naive).
- Rung 4 median ensemble combination.
- Output sanity checks: finite, non-negative, <= 5x max, interval ordering.
- Automatic baseline fallback on validation failure.
- Hierarchy reconciliation (bottom-up and proportional).
"""

from __future__ import annotations

import pytest

from lolys_analytics.backtest import BacktestReport, FoldEvaluation, MetricSummary
from lolys_analytics.models.baselines import ForecastResult
from lolys_analytics.select import (
    ForecastStatus,
    SeriesLevel,
    create_ensemble_forecast,
    evaluate_readiness,
    reconcile_hierarchy,
    sanitize_or_fallback,
    select_best_model,
    validate_forecast,
)


def _make_dummy_report(model_name: str, wape: float, mase: float) -> BacktestReport:
    """Creates a minimal dummy BacktestReport for selection tests."""
    summary = MetricSummary(
        wape=wape,
        mase=mase,
        pinball_loss=5.0,
        bias=0.0,
        coverage_80=0.80,
    )
    fold_eval = FoldEvaluation(
        fold_idx=0,
        metrics=summary,
        predictions=[10.0],
        actuals=[10.0],
        lower_80=[8.0],
        upper_80=[12.0],
    )
    return BacktestReport(
        model_name=model_name,
        n_folds=1,
        horizon=1,
        mean_wape=wape,
        mean_mase=mase,
        mean_pinball_loss=5.0,
        mean_bias=0.0,
        mean_coverage_80=0.80,
        fold_evaluations=[fold_eval],
    )


# ==============================================================================
# 1. Readiness Gates Tests
# ==============================================================================


def test_readiness_gates_shop() -> None:
    """Tests shop readiness evaluation under various history conditions."""
    # Full readiness: >= 56 days and >= 30 orders
    ev = evaluate_readiness(SeriesLevel.SHOP, days_since_first_sale=60, total_volume=35)
    assert ev.status == ForecastStatus.OK
    assert ev.can_use_statistical is True

    # Preliminary: 20 days, 10 orders
    ev = evaluate_readiness(SeriesLevel.SHOP, days_since_first_sale=20, total_volume=10)
    assert ev.status == ForecastStatus.PRELIMINARY
    assert ev.can_use_statistical is False

    # Insufficient: < 7 days
    ev = evaluate_readiness(SeriesLevel.SHOP, days_since_first_sale=5, total_volume=3)
    assert ev.status == ForecastStatus.INSUFFICIENT_DATA
    assert "ANL-001" in ev.reason


def test_readiness_gates_category() -> None:
    """Tests category readiness evaluation."""
    # Full readiness: >= 84 days and >= 40 units
    ev = evaluate_readiness(SeriesLevel.CATEGORY, days_since_first_sale=90, total_volume=50)
    assert ev.status == ForecastStatus.OK
    assert ev.can_use_statistical is True

    # Preliminary: 30 days, 15 units
    ev = evaluate_readiness(SeriesLevel.CATEGORY, days_since_first_sale=30, total_volume=15)
    assert ev.status == ForecastStatus.PRELIMINARY

    # Insufficient: 0 units
    ev = evaluate_readiness(SeriesLevel.CATEGORY, days_since_first_sale=10, total_volume=0)
    assert ev.status == ForecastStatus.INSUFFICIENT_DATA


def test_readiness_gates_product() -> None:
    """Tests product readiness evaluation (regular vs intermittent vs insufficient)."""
    # Full statistical: >= 12 weeks and >= 6 non-zero weeks
    ev = evaluate_readiness(
        SeriesLevel.PRODUCT,
        days_since_first_sale=100,
        total_volume=50,
        nonzero_weeks=8,
        total_weeks=14,
    )
    assert ev.status == ForecastStatus.OK
    assert ev.can_use_statistical is True
    assert ev.can_use_intermittent is True

    # Intermittent: 4 non-zero weeks
    ev = evaluate_readiness(
        SeriesLevel.PRODUCT,
        days_since_first_sale=40,
        total_volume=10,
        nonzero_weeks=4,
        total_weeks=6,
    )
    assert ev.status == ForecastStatus.OK
    assert ev.can_use_statistical is False
    assert ev.can_use_intermittent is True

    # Preliminary: 2 weeks, 2 units
    ev = evaluate_readiness(
        SeriesLevel.PRODUCT,
        days_since_first_sale=14,
        total_volume=2,
        nonzero_weeks=1,
        total_weeks=2,
    )
    assert ev.status == ForecastStatus.PRELIMINARY

    # Insufficient: 0 volume
    ev = evaluate_readiness(
        SeriesLevel.PRODUCT,
        days_since_first_sale=0,
        total_volume=0,
        nonzero_weeks=0,
    )
    assert ev.status == ForecastStatus.INSUFFICIENT_DATA


# ==============================================================================
# 2. Model Selection & The 5% Beat Rule
# ==============================================================================


def test_5_percent_rule_candidate_beats_baseline() -> None:
    """Candidate beats baseline by > 5% relative WAPE and is selected."""
    baseline = _make_dummy_report("SeasonalNaive", wape=0.50, mase=1.0)
    candidate1 = _make_dummy_report("AutoTheta", wape=0.45, mase=0.85)  # 10% beat

    res = select_best_model([candidate1], baseline, min_beat_percentage=0.05, primary_metric="wape")
    assert res.chosen_model == "AutoTheta"
    assert res.is_baseline_fallback is False
    assert res.relative_improvement == pytest.approx(0.10, abs=1e-4)


def test_5_percent_rule_candidate_fails_fallback() -> None:
    """Candidate only beats baseline by 2% (< 5%), falls back to Seasonal Naive."""
    baseline = _make_dummy_report("SeasonalNaive", wape=0.50, mase=1.0)
    candidate1 = _make_dummy_report("AutoETS", wape=0.49, mase=0.98)  # 2% beat

    res = select_best_model([candidate1], baseline, min_beat_percentage=0.05, primary_metric="wape")
    assert res.chosen_model == "SeasonalNaive"
    assert res.is_baseline_fallback is True
    assert "failed 5% beat rule" in res.reason


def test_selection_with_mase_for_products() -> None:
    """Product series uses MASE as primary evaluation metric."""
    baseline = _make_dummy_report("SeasonalNaive", wape=0.60, mase=1.00)
    candidate = _make_dummy_report("CrostonSBA", wape=0.62, mase=0.90)  # 10% MASE beat

    res = select_best_model([candidate], baseline, min_beat_percentage=0.05, primary_metric="mase")
    assert res.chosen_model == "CrostonSBA"
    assert res.is_baseline_fallback is False


# ==============================================================================
# 3. Model Combination / Ensemble
# ==============================================================================


def test_ensemble_median_combination() -> None:
    """Ensemble combines forecasts step-by-step using median."""
    f1 = ForecastResult(
        model_name="M1",
        point_forecast=[10.0, 20.0, 30.0],
        lower_80=[8.0, 18.0, 28.0],
        upper_80=[12.0, 22.0, 32.0],
        horizon=3,
    )
    f2 = ForecastResult(
        model_name="M2",
        point_forecast=[14.0, 24.0, 34.0],
        lower_80=[11.0, 21.0, 31.0],
        upper_80=[17.0, 27.0, 37.0],
        horizon=3,
    )
    f3 = ForecastResult(
        model_name="M3",
        point_forecast=[12.0, 22.0, 32.0],
        lower_80=[10.0, 20.0, 30.0],
        upper_80=[15.0, 25.0, 35.0],
        horizon=3,
    )

    ensemble = create_ensemble_forecast([f1, f2, f3])
    assert ensemble.model_name == "EnsembleMedian"
    assert ensemble.horizon == 3
    # Medians: [10, 14, 12] -> 12; [20, 24, 22] -> 22; [30, 34, 32] -> 32
    assert ensemble.point_forecast == [12.0, 22.0, 32.0]
    assert ensemble.lower_80 == [10.0, 20.0, 30.0]
    assert ensemble.upper_80 == [15.0, 25.0, 35.0]


# ==============================================================================
# 4. Output Validation & Sanity Checks
# ==============================================================================


def test_validate_forecast_finite_check() -> None:
    """Fails if forecast contains NaN or infinity."""
    f_nan = ForecastResult(
        model_name="Test",
        point_forecast=[10.0, float("nan")],
        lower_80=[8.0, 8.0],
        upper_80=[12.0, 12.0],
        horizon=2,
    )
    res = validate_forecast(f_nan, history_data=[10.0, 20.0])
    assert res.is_valid is False
    assert res.error_code == "VAL-001"


def test_validate_forecast_negative_check() -> None:
    """Fails if forecast or lower bound is negative."""
    f_neg = ForecastResult(
        model_name="Test",
        point_forecast=[10.0, -1.0],
        lower_80=[8.0, 0.0],
        upper_80=[12.0, 5.0],
        horizon=2,
    )
    res = validate_forecast(f_neg, history_data=[10.0, 20.0])
    assert res.is_valid is False
    assert res.error_code == "VAL-002"


def test_validate_forecast_5x_max_check() -> None:
    """Fails if forecast exceeds 5x historical maximum."""
    history = [10.0, 15.0, 20.0]  # Max is 20, 5x is 100
    f_spike = ForecastResult(
        model_name="Test",
        point_forecast=[15.0, 105.0],
        lower_80=[10.0, 90.0],
        upper_80=[20.0, 120.0],
        horizon=2,
    )
    res = validate_forecast(f_spike, history_data=history, max_multiplier=5.0)
    assert res.is_valid is False
    assert res.error_code == "VAL-003"


def test_validate_forecast_interval_ordering() -> None:
    """Fails if lower bound > point forecast or point forecast > upper bound."""
    f_bad_order = ForecastResult(
        model_name="Test",
        point_forecast=[10.0, 15.0],
        lower_80=[12.0, 10.0],  # 12 > 10 (violation)
        upper_80=[15.0, 20.0],
        horizon=2,
    )
    res = validate_forecast(f_bad_order, history_data=[10.0, 20.0])
    assert res.is_valid is False
    assert res.error_code == "VAL-004"


def test_sanitize_or_fallback() -> None:
    """Sanitizes or triggers fallback on invalid forecasts."""
    history = [10.0, 20.0]
    baseline = ForecastResult(
        model_name="SeasonalNaive",
        point_forecast=[12.0, 14.0],
        lower_80=[10.0, 12.0],
        upper_80=[15.0, 17.0],
        horizon=2,
    )

    # Valid candidate passes untouched
    valid_f = ForecastResult(
        model_name="AutoTheta",
        point_forecast=[11.0, 13.0],
        lower_80=[9.0, 11.0],
        upper_80=[14.0, 16.0],
        horizon=2,
    )
    res_f, fallback = sanitize_or_fallback(valid_f, baseline, history)
    assert fallback is False
    assert res_f.model_name == "AutoTheta"

    # Corrupt candidate triggers fallback to baseline
    corrupt_f = ForecastResult(
        model_name="Corrupt",
        point_forecast=[-5.0, 999.0],
        lower_80=[0.0, 0.0],
        upper_80=[10.0, 1000.0],
        horizon=2,
    )
    res_f, fallback = sanitize_or_fallback(corrupt_f, baseline, history)
    assert fallback is True
    assert "SeasonalNaive_fallback" in res_f.model_name
    assert res_f.point_forecast == [12.0, 14.0]


# ==============================================================================
# 5. Hierarchy Reconciliation
# ==============================================================================


def test_hierarchy_reconciliation_bottom_up() -> None:
    """Bottom-up reconciliation sets shop total to sum of category forecasts."""
    shop_forecast = [100.0, 120.0]
    category_forecasts = {
        "cat_a": [60.0, 70.0],
        "cat_b": [45.0, 55.0],
    }  # Sums are [105.0, 125.0]

    res = reconcile_hierarchy(
        shop_forecast, category_forecasts, method="bottom_up", tolerance_pct=0.10
    )
    assert res.shop_forecast == [105.0, 125.0]
    assert res.category_forecasts["cat_a"] == [60.0, 70.0]
    assert res.is_within_tolerance is True


def test_hierarchy_reconciliation_proportional() -> None:
    """Proportional reconciliation scales category forecasts to match shop forecast."""
    shop_forecast = [100.0, 200.0]
    category_forecasts = {
        "cat_a": [50.0, 50.0],
        "cat_b": [50.0, 150.0],
    }  # Sums are [100.0, 200.0] (exact match)

    res = reconcile_hierarchy(
        shop_forecast, category_forecasts, method="proportional", tolerance_pct=0.05
    )
    assert res.shop_forecast == [100.0, 200.0]
    assert res.category_forecasts["cat_a"] == [50.0, 50.0]
    assert res.category_forecasts["cat_b"] == [50.0, 150.0]
    assert res.discrepancy_max_pct == pytest.approx(0.0, abs=1e-6)
