"""Unit tests for Rung 0 baseline forecasting models.

Verifies:
1. SeasonalNaiveModel periodic projection and conformal intervals.
2. MovingAverage28Model rolling window mean and constant horizon projection.
"""

from __future__ import annotations

from lolys_analytics.models.baselines import MovingAverage28Model, SeasonalNaiveModel


def test_seasonal_naive_exact_weekly_cycle() -> None:
    """Tests that seasonal naive reproduces exact weekly cycle."""
    # 2 weeks of repetitive pattern: Mon=1, Tue=2, Wed=3, Thu=4, Fri=10, Sat=8, Sun=2
    weekly_pattern = [1.0, 2.0, 3.0, 4.0, 10.0, 8.0, 2.0]
    history = weekly_pattern * 2  # 14 days

    model = SeasonalNaiveModel(seasonality=7)
    model.fit(history)
    forecast = model.predict(horizon=7)

    assert forecast.model_name == "seasonal_naive"
    assert len(forecast.point_forecast) == 7
    # Future 7 days should exactly match the weekly pattern
    assert forecast.point_forecast == weekly_pattern
    # Intervals should be valid and bounded
    assert len(forecast.lower_80) == 7
    assert len(forecast.upper_80) == 7
    for lower, point, upper in zip(
        forecast.lower_80, forecast.point_forecast, forecast.upper_80, strict=True
    ):
        assert 0.0 <= lower <= point <= upper


def test_seasonal_naive_multi_cycle_projection() -> None:
    """Tests projecting seasonal naive across multi-week horizons (e.g. 21 days)."""
    weekly_pattern = [5.0, 10.0, 15.0, 20.0, 25.0, 30.0, 35.0]
    history = weekly_pattern * 4  # 28 days

    model = SeasonalNaiveModel(seasonality=7)
    model.fit(history)
    forecast = model.predict(horizon=21)

    assert len(forecast.point_forecast) == 21
    # 3 repetitions of the 7-day pattern
    assert forecast.point_forecast == weekly_pattern * 3


def test_moving_average_28_exact_calculation() -> None:
    """Tests 28-day moving average computation and constant horizon projection."""
    # 30 days of history: days 0..27 all have value 10.0, last 2 days have 20.0
    # Last 28 days: 26 days of 10.0 and 2 days of 20.0
    # Mean = (26 * 10 + 2 * 20) / 28 = (260 + 40) / 28 = 300 / 28 = 10.7142857...
    history = [5.0, 5.0] + ([10.0] * 26) + [20.0, 20.0]
    assert len(history) == 30

    expected_mean = (26 * 10.0 + 2 * 20.0) / 28.0

    model = MovingAverage28Model(window=28)
    model.fit(history)
    forecast = model.predict(horizon=14)

    assert forecast.model_name == "moving_average_28"
    assert len(forecast.point_forecast) == 14
    for val in forecast.point_forecast:
        assert abs(val - expected_mean) < 1e-6

    # Intervals must bracket the point forecast
    for lower, upper in zip(forecast.lower_80, forecast.upper_80, strict=True):
        assert 0.0 <= lower <= expected_mean <= upper
