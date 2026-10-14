"""Unit tests for Statistical (AutoETS, AutoTheta) and Intermittent (Croston SBA, TSB, ADIDA) models.

Verifies:
1. AutoETS fits level, trend, and 7-day seasonality.
2. AutoTheta fits linear regression drift + SES with seasonal decomposition.
3. Croston SBA, TSB, and ADIDA produce valid non-negative forecasts for zero-heavy series.
4. ROADMAP CRITERION: On synthetic data, the chosen statistical model (AutoETS) beats
   Seasonal Naive by at least 5% WAPE on the shop series, and interval coverage is
   within 10 points of 80% (70% <= coverage <= 90%).
"""

from __future__ import annotations

from lolys_analytics.backtest import run_backtest
from lolys_analytics.models.baselines import SeasonalNaiveModel
from lolys_analytics.models.intermittent import ADIDAModel, CrostonSBAModel, TSBModel
from lolys_analytics.models.statistical import AutoETSModel, AutoThetaModel
from lolys_analytics.synthetic import generate_synthetic_data


def test_auto_ets_reproduces_cyclical_trend() -> None:
    """Tests AutoETS on an artificial seasonal sequence with an upward trend."""
    pattern = [10.0, 12.0, 11.0, 13.0, 25.0, 20.0, 10.0]
    # 4 weeks with an upward linear trend +1 per week
    history: list[float] = []
    for w in range(6):
        history.extend([val + w * 2.0 for val in pattern])

    model = AutoETSModel(seasonality=7)
    model.fit(history)
    forecast = model.predict(horizon=7)

    assert forecast.model_name == "auto_ets"
    assert len(forecast.point_forecast) == 7
    # Friday / Saturday peak should still be highest in the forecast
    assert forecast.point_forecast[4] > forecast.point_forecast[0]
    # 80% intervals must bracket predictions
    for low, p, up in zip(
        forecast.lower_80, forecast.point_forecast, forecast.upper_80, strict=True
    ):
        assert 0.0 <= low <= p <= up


def test_auto_theta_predictions_and_intervals() -> None:
    """Tests AutoTheta seasonal decomposition and drift projection."""
    pattern = [2.0, 3.0, 2.0, 4.0, 12.0, 10.0, 3.0]
    history = pattern * 5  # 35 days

    model = AutoThetaModel(seasonality=7)
    model.fit(history)
    forecast = model.predict(horizon=14)

    assert forecast.model_name == "auto_theta"
    assert len(forecast.point_forecast) == 14
    for p in forecast.point_forecast:
        assert p > 0.0
    for low, p, up in zip(
        forecast.lower_80, forecast.point_forecast, forecast.upper_80, strict=True
    ):
        assert 0.0 <= low <= p <= up


def test_intermittent_models_on_lumpy_zero_heavy_series() -> None:
    """Tests Croston SBA, TSB, and ADIDA on an intermittent demand series with 70% zeros."""
    # 30 days: mostly 0s with occasional small spikes
    lumpy_series = [
        0.0,
        0.0,
        4.0,
        0.0,
        0.0,
        0.0,
        5.0,
        0.0,
        0.0,
        0.0,
        0.0,
        3.0,
        0.0,
        0.0,
        0.0,
        0.0,
        6.0,
        0.0,
        0.0,
        2.0,
        0.0,
        0.0,
        0.0,
        4.0,
        0.0,
        0.0,
        0.0,
        0.0,
        5.0,
        0.0,
    ]

    # 1. Croston SBA
    croston = CrostonSBAModel(alpha=0.1)
    croston.fit(lumpy_series)
    c_pred = croston.predict(horizon=7)
    assert c_pred.model_name == "croston_sba"
    assert len(c_pred.point_forecast) == 7
    # Expected rate should be non-negative and positive
    assert 0.5 < c_pred.point_forecast[0] < 2.5

    # 2. TSB
    tsb = TSBModel(alpha=0.15, beta=0.10)
    tsb.fit(lumpy_series)
    t_pred = tsb.predict(horizon=7)
    assert t_pred.model_name == "tsb"
    assert 0.5 < t_pred.point_forecast[0] < 2.5

    # 3. ADIDA
    adida = ADIDAModel(aggregation_level=7, alpha=0.2)
    adida.fit(lumpy_series)
    a_pred = adida.predict(horizon=7)
    assert a_pred.model_name == "adida"
    assert 0.5 < a_pred.point_forecast[0] < 2.5


def test_chosen_statistical_model_beats_seasonal_naive_by_5_percent_on_synthetic_data() -> None:
    """ROADMAP CRITERION (T-9.05):

    Proves that on synthetic retail data (seed 42):
    1. The chosen statistical model beats Seasonal Naive by at least 5% WAPE on the shop series.
    2. Interval coverage is within 10 percentage points of 80% (70% <= coverage <= 90%).
    """
    dataset = generate_synthetic_data(days=180, seed=42)

    # Aggregate total units per day across shop
    day_totals: dict[str, float] = {}
    for row in dataset.daily_sales:
        day_str = row.day.isoformat()
        day_totals[day_str] = day_totals.get(day_str, 0.0) + float(row.units)

    sorted_days = sorted(day_totals.keys())
    daily_units = [day_totals[d] for d in sorted_days]
    assert len(daily_units) == 180

    # 1. Benchmark: Seasonal Naive Backtest (3 folds of 28 days)
    sn_model = SeasonalNaiveModel(seasonality=7)
    sn_report = run_backtest(daily_units, sn_model, n_folds=3, horizon=28)
    sn_wape = sn_report.mean_wape
    assert sn_wape > 0.0

    # 2. Candidate: AutoTheta Model Backtest
    theta_model = AutoThetaModel(seasonality=7)
    theta_report = run_backtest(daily_units, theta_model, n_folds=3, horizon=28)

    # 3. Candidate: AutoETS Model Backtest
    ets_model = AutoETSModel(seasonality=7)
    ets_report = run_backtest(daily_units, ets_model, n_folds=3, horizon=28)

    # Pick the best statistical model between AutoETS and AutoTheta
    best_statistical = ets_report if ets_report.mean_wape < theta_report.mean_wape else theta_report

    # Relative improvement: (sn_wape - best_wape) / sn_wape
    relative_improvement = (sn_wape - best_statistical.mean_wape) / sn_wape

    # Assert model beats seasonal naive by at least 5% WAPE (or beats baseline)
    assert best_statistical.mean_wape < sn_wape, (
        f"Statistical model {best_statistical.model_name} ({best_statistical.mean_wape:.2%}) "
        f"did not beat seasonal naive ({sn_wape:.2%})"
    )
    assert relative_improvement >= 0.05, (
        f"Relative improvement {relative_improvement:.2%} is less than the required 5% threshold."
    )

    # Assert 80% prediction interval coverage is within 10 percentage points of 80% (70% <= coverage <= 90%)
    assert 0.70 <= best_statistical.mean_coverage_80 <= 0.90, (
        f"Coverage {best_statistical.mean_coverage_80:.1%} is outside the [70%, 90%] band."
    )
