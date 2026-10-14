"""Unit and simulation tests for accuracy tracking and drift alert (T-9.09).

Tests:
1. Exact WAPE, interval coverage, and mean bias calculations.
2. 28-day rolling window accuracy evaluation.
3. Drift detection rules (threshold >20%, 2 consecutive weeks requirement).
4. Multi-week simulated drift and recovery timeline on synthetic data.
5. Pipeline integration with drift alert and fallback switching.
6. Database query functions and mock verification.
"""

from __future__ import annotations

import datetime as dt

import pytest

from lolys_analytics.accuracy import (
    DriftCheckResult,
    ForecastAccuracyPoint,
    WindowAccuracyResult,
    compute_interval_coverage,
    compute_mean_bias,
    compute_wape,
    evaluate_accuracy_window,
    evaluate_drift,
    simulate_drift_and_recovery_timeline,
)
from lolys_analytics.db import (
    MockAnalyticsDb,
    fetch_forecast_accuracy,
    fetch_past_forecast_runs,
)
from lolys_analytics.forecast import run_forecast_pipeline
from lolys_analytics.synthetic import generate_synthetic_data


class TestWapeAndMetricCalculations:
    """Tests exact numerical behavior of WAPE, coverage, and bias."""

    def test_wape_exact_calculation(self) -> None:
        actuals = [100.0, 200.0, 300.0]
        # errors: |100-110| + |200-180| + |300-330| = 10 + 20 + 30 = 60
        # total actual: 600 -> WAPE = 60 / 600 = 0.10 (10%)
        predictions = [110.0, 180.0, 330.0]
        wape = compute_wape(actuals, predictions)
        assert abs(wape - 0.10) < 1e-6

    def test_wape_zero_actuals_handling(self) -> None:
        assert compute_wape([0.0, 0.0], [0.0, 0.0]) == 0.0
        assert compute_wape([0.0, 0.0], [5.0, 10.0]) == 1.0

    def test_wape_length_mismatch_raises(self) -> None:
        with pytest.raises(ValueError, match="Length mismatch"):
            compute_wape([10.0, 20.0], [10.0])

    def test_interval_coverage_exact(self) -> None:
        actuals = [10.0, 20.0, 30.0, 40.0]
        lowers = [5.0, 25.0, 25.0, 35.0]
        uppers = [15.0, 35.0, 35.0, 45.0]
        # 10 in [5, 15] (yes)
        # 20 in [25, 35] (no)
        # 30 in [25, 35] (yes)
        # 40 in [35, 45] (yes)
        # 3 out of 4 = 75%
        cov = compute_interval_coverage(actuals, lowers, uppers)
        assert abs(cov - 0.75) < 1e-6

    def test_mean_bias_exact(self) -> None:
        actuals = [100.0, 100.0]
        preds = [110.0, 120.0]  # biases: +10, +20 -> mean = +15
        bias = compute_mean_bias(actuals, preds)
        assert abs(bias - 15.0) < 1e-6


class TestRollingAccuracyWindow:
    """Tests 28-day rolling window filtering and metric aggregation."""

    def test_evaluate_accuracy_window_28_days(self) -> None:
        base_date = dt.date(2026, 6, 30)
        points: list[ForecastAccuracyPoint] = []
        for i in range(40):
            d = base_date - dt.timedelta(days=i)
            points.append(
                ForecastAccuracyPoint(
                    forecast_date=d,
                    predicted_units=110.0,
                    actual_units=100.0,
                    model_name="AutoTheta",
                    lower_80=90.0,
                    upper_80=120.0,
                )
            )

        # 28-day window should keep exactly 28 points
        res: WindowAccuracyResult = evaluate_accuracy_window(
            points, window_days=28, as_of_date=base_date
        )
        assert res.sample_count == 28
        assert res.model_name == "AutoTheta"
        # Each point error = 10, actual = 100 -> WAPE = 0.10
        assert res.wape == 0.10
        assert res.interval_coverage == 1.0
        assert res.mean_bias == 10.0


class TestDriftDetectionRules:
    """Tests that drift is triggered only after 2 consecutive weeks > 20% worse than baseline."""

    def test_week1_drift_does_not_trigger_alert(self) -> None:
        # Candidate WAPE = 30%, Baseline WAPE = 20% -> rel_diff = 50% (> 20%)
        # But this is week 1 (prior_consecutive = 0), so consecutive = 1, alert = False
        today = dt.date(2026, 7, 1)
        cand_points = [
            ForecastAccuracyPoint(
                forecast_date=today - dt.timedelta(days=i),
                predicted_units=130.0,
                actual_units=100.0,
                model_name="AutoTheta",
            )
            for i in range(28)
        ]
        base_points = [
            ForecastAccuracyPoint(
                forecast_date=today - dt.timedelta(days=i),
                predicted_units=120.0,
                actual_units=100.0,
                model_name="SeasonalNaive",
            )
            for i in range(28)
        ]

        res: DriftCheckResult = evaluate_drift(
            candidate_points=cand_points,
            baseline_points=base_points,
            prior_consecutive_drift_weeks=0,
            threshold=0.20,
            min_consecutive_weeks=2,
            as_of_date=today,
        )

        assert res.is_drifting_this_week is True
        assert res.consecutive_drift_weeks == 1
        assert res.drift_alert is False
        assert res.display_fallback is False
        assert res.active_display_model == "AutoTheta"

    def test_week2_consecutive_drift_triggers_alert_and_fallback(self) -> None:
        # Week 2 with prior_consecutive = 1 -> consecutive = 2 -> alert = True!
        today = dt.date(2026, 7, 8)
        cand_points = [
            ForecastAccuracyPoint(
                forecast_date=today - dt.timedelta(days=i),
                predicted_units=135.0,
                actual_units=100.0,
                model_name="AutoTheta",
            )
            for i in range(28)
        ]
        base_points = [
            ForecastAccuracyPoint(
                forecast_date=today - dt.timedelta(days=i),
                predicted_units=120.0,
                actual_units=100.0,
                model_name="SeasonalNaive",
            )
            for i in range(28)
        ]

        res: DriftCheckResult = evaluate_drift(
            candidate_points=cand_points,
            baseline_points=base_points,
            prior_consecutive_drift_weeks=1,
            threshold=0.20,
            min_consecutive_weeks=2,
            as_of_date=today,
        )

        assert res.is_drifting_this_week is True
        assert res.consecutive_drift_weeks == 2
        assert res.drift_alert is True
        assert res.display_fallback is True
        assert res.active_display_model == "SeasonalNaive"
        assert "تنبيه دقة التوقعات" in res.message_ar

    def test_week3_recovery_clears_alert_and_restores_display(self) -> None:
        # Prior run had active alert (prior_consecutive = 2).
        # This week, candidate WAPE is 15% and baseline is 20% (rel_diff < 0).
        # Should clear alert, reset streak to 0, and restore AutoTheta display.
        today = dt.date(2026, 7, 15)
        cand_points = [
            ForecastAccuracyPoint(
                forecast_date=today - dt.timedelta(days=i),
                predicted_units=115.0,
                actual_units=100.0,
                model_name="AutoTheta",
            )
            for i in range(28)
        ]
        base_points = [
            ForecastAccuracyPoint(
                forecast_date=today - dt.timedelta(days=i),
                predicted_units=120.0,
                actual_units=100.0,
                model_name="SeasonalNaive",
            )
            for i in range(28)
        ]

        res: DriftCheckResult = evaluate_drift(
            candidate_points=cand_points,
            baseline_points=base_points,
            prior_consecutive_drift_weeks=2,
            threshold=0.20,
            min_consecutive_weeks=2,
            as_of_date=today,
        )

        assert res.is_drifting_this_week is False
        assert res.consecutive_drift_weeks == 0
        assert res.drift_alert is False
        assert res.display_fallback is False
        assert res.active_display_model == "AutoTheta"


class TestSimulatedDriftLifecycle:
    """Tests the simulated drift and recovery lifecycle on synthetic timeline."""

    def test_simulate_drift_and_recovery_timeline_end_to_end(self) -> None:
        timeline = simulate_drift_and_recovery_timeline(
            candidate_model_name="AutoTheta",
            baseline_model_name="SeasonalNaive",
            threshold=0.20,
        )

        assert len(timeline) == 5

        # Week 1: Healthy
        w1 = timeline[0]
        assert w1.is_drifting_this_week is False
        assert w1.consecutive_drift_weeks == 0
        assert w1.drift_alert is False
        assert w1.display_fallback is False
        assert w1.active_display_model == "AutoTheta"

        # Week 2: Drift week 1 (warning, no alert)
        w2 = timeline[1]
        assert w2.is_drifting_this_week is True
        assert w2.consecutive_drift_weeks == 1
        assert w2.drift_alert is False
        assert w2.display_fallback is False
        assert w2.active_display_model == "AutoTheta"

        # Week 3: Drift week 2 (alert triggered!)
        w3 = timeline[2]
        assert w3.is_drifting_this_week is True
        assert w3.consecutive_drift_weeks == 2
        assert w3.drift_alert is True
        assert w3.display_fallback is True
        assert w3.active_display_model == "SeasonalNaive"

        # Week 4: Drift week 3 (alert maintained)
        w4 = timeline[3]
        assert w4.is_drifting_this_week is True
        assert w4.consecutive_drift_weeks == 3
        assert w4.drift_alert is True
        assert w4.display_fallback is True
        assert w4.active_display_model == "SeasonalNaive"

        # Week 5: Recovery (alert clears!)
        w5 = timeline[4]
        assert w5.is_drifting_this_week is False
        assert w5.consecutive_drift_weeks == 0
        assert w5.drift_alert is False
        assert w5.display_fallback is False
        assert w5.active_display_model == "AutoTheta"


class TestForecastPipelineDriftIntegration:
    """Tests that run_forecast_pipeline respects drift_status."""

    def test_pipeline_switches_shop_display_to_baseline_when_drift_alert_active(self) -> None:
        dataset = generate_synthetic_data(days=60, seed=42)

        active_drift = DriftCheckResult(
            is_drifting_this_week=True,
            consecutive_drift_weeks=2,
            drift_alert=True,
            display_fallback=True,
            active_display_model="SeasonalNaive",
            model_wape=0.38,
            baseline_wape=0.25,
            relative_ratio=1.52,
            threshold=0.20,
            message_ar="تنبيه دقة التوقعات",
            message_en="Drift alert active",
        )

        payload = run_forecast_pipeline(
            sales_rows=dataset.daily_sales,
            stock_rows=dataset.daily_stock,
            run_date=dt.date(2026, 6, 1),
            drift_status=active_drift,
        )

        # Check that shop forecast records use SeasonalNaive
        shop_fcs = [f for f in payload.forecasts if f.series_type == "shop"]
        assert len(shop_fcs) == 28
        for f in shop_fcs:
            assert f.model_name == "SeasonalNaive"

        # Check that payload notes record the drift flag and details
        assert payload.notes.get("drift_alert") is True
        assert payload.notes.get("display_fallback") is True
        assert payload.notes.get("drift_details", {}).get("consecutive_drift_weeks") == 2


class TestDatabaseAccuracyQueries:
    """Tests database fetching functions for forecast accuracy and runs."""

    def test_fetch_forecast_accuracy_and_runs_from_mock_db(self) -> None:
        mock_db = MockAnalyticsDb()

        mock_db.forecast_accuracy = [
            {
                "run_id": 1,
                "series_type": "shop",
                "series_id": None,
                "forecast_date": dt.date(2026, 6, 1),
                "horizon_step": 1,
                "model_name": "AutoTheta",
                "predicted_units": 105.0,
                "actual_units": 100.0,
                "unit_error": 5.0,
                "absolute_error": 5.0,
                "predicted_revenue": 1050.0,
                "actual_revenue": 1000.0,
                "in_interval_80": True,
            }
        ]
        mock_db.forecast_runs = [
            {
                "id": 1,
                "run_at": "2026-06-01T00:00:00Z",
                "git_commit": "abc1234",
                "model_version": "v1.0",
                "notes": {"drift_alert": False},
                "status": "completed",
            }
        ]

        acc_rows = fetch_forecast_accuracy(mock_db, series_type="shop")
        assert len(acc_rows) == 1
        assert acc_rows[0]["model_name"] == "AutoTheta"

        runs = fetch_past_forecast_runs(mock_db, limit=5)
        assert len(runs) == 1
        assert runs[0]["id"] == 1
