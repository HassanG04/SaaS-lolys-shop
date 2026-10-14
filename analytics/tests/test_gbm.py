"""Unit and property tests for Global ML / LightGBM model and ADR-0005.

Per T-9.06:
- ADR-0005 exists and documents the gating and activation policy.
- Data readiness gates require >= 180 days history and >= 30 active products.
- Feature extraction guarantees zero future leakage.
- Direct multi-horizon model produces valid non-negative forecasts and conformal intervals.
- Config reflects disabled-by-default status at launch.
"""

from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

import pytest

from lolys_analytics.backtest import run_backtest
from lolys_analytics.config import load_config
from lolys_analytics.features import DailyObservation
from lolys_analytics.models.gbm import (
    LightGBMDirectModel,
    check_readiness,
    extract_gbm_features,
)
from lolys_analytics.synthetic import generate_synthetic_data


def test_adr_0005_exists_and_documents_policy() -> None:
    """Verifies ADR-0005 exists with accepted status and mandatory gating criteria."""
    adr_path = (
        Path(__file__).resolve().parent.parent.parent
        / "docs"
        / "adr"
        / "0005-optional-lightgbm-model.md"
    )
    assert adr_path.is_file(), f"ADR-0005 not found at {adr_path}"

    content = adr_path.read_text(encoding="utf-8")
    assert "Status: accepted" in content
    assert "180" in content  # 6 months (180 days)
    assert "30" in content  # 30 active products
    assert "disabled" in content.lower()


def test_config_global_ml_disabled_by_default() -> None:
    """Verifies that config.toml sets global ML to disabled by default at launch."""
    config = load_config()
    assert config.global_ml.enabled is False
    assert config.global_ml.min_history_days == 180
    assert config.global_ml.min_active_products == 30
    assert config.global_ml.min_beat_percentage == 0.05
    assert config.global_ml.direct_horizons == (7, 14, 21, 28)


def test_check_readiness_gates() -> None:
    """Tests the ADR-0005 data readiness gate validator."""
    # Fails both
    ready, msg = check_readiness(history_days=60, active_products=10)
    assert ready is False
    assert "60 days" in msg

    # Fails product count
    ready, msg = check_readiness(history_days=200, active_products=15)
    assert ready is False
    assert "15 active products" in msg

    # Fails history
    ready, msg = check_readiness(history_days=150, active_products=40)
    assert ready is False
    assert "150 days" in msg

    # Passes both
    ready, msg = check_readiness(history_days=185, active_products=35)
    assert ready is True
    assert "satisfied" in msg.lower()


def test_lightgbm_direct_enforce_gates() -> None:
    """Tests that LightGBMDirectModel strictly enforces gates when enforce_gates=True."""
    model = LightGBMDirectModel(enforce_gates=True)
    short_history = [10.0] * 60  # Only 60 days

    with pytest.raises(ValueError, match="ADR-0005 Gate Refusal"):
        model.fit(short_history, active_products=12)


def test_extract_gbm_features_no_future_leakage() -> None:
    """Property test proving zero future data leakage during feature extraction."""
    start_date = date(2026, 1, 1)
    n = 100
    series1 = [
        DailyObservation(
            day=start_date + timedelta(days=i),
            units=float(10 + (i % 5)),
            closing_stock=50,
            discount_pct=0.1 if (i % 10 == 0) else 0.0,
        )
        for i in range(n)
    ]

    origin = 50
    feats1 = extract_gbm_features(series1, origin_idx=origin)

    # Modify all observations strictly after origin
    series2 = [
        DailyObservation(
            day=obs.day,
            units=obs.units if i <= origin else 9999.0,
            closing_stock=obs.closing_stock if i <= origin else 0,
            discount_pct=obs.discount_pct if i <= origin else 0.99,
        )
        for i, obs in enumerate(series1)
    ]

    feats2 = extract_gbm_features(series2, origin_idx=origin)

    # Features at origin MUST be identical
    assert len(feats1) == 18
    assert len(feats2) == 18
    assert feats1 == feats2


def test_lightgbm_direct_fit_predict() -> None:
    """Tests direct multi-horizon gradient boosted forecasting and interval outputs."""
    dataset = generate_synthetic_data(days=180, seed=42)
    day_totals: dict[str, float] = {}
    for row in dataset.daily_sales:
        d = row.day.isoformat()
        day_totals[d] = day_totals.get(d, 0.0) + float(row.units)

    daily_units = [day_totals[d] for d in sorted(day_totals.keys())]

    model = LightGBMDirectModel(n_estimators=20, learning_rate=0.1)
    model.fit(daily_units)
    res = model.predict(horizon=28)

    assert res.model_name == "LightGBMDirect"
    assert res.horizon == 28
    assert len(res.point_forecast) == 28
    assert len(res.lower_80) == 28
    assert len(res.upper_80) == 28

    # Non-negativity and interval monotonicity
    for p, lo, hi in zip(res.point_forecast, res.lower_80, res.upper_80, strict=False):
        assert p >= 0.0
        assert lo >= 0.0
        assert lo <= p <= hi


def test_lightgbm_backtest_execution() -> None:
    """Tests rolling-origin backtest on LightGBMDirectModel."""
    dataset = generate_synthetic_data(days=180, seed=42)
    day_totals: dict[str, float] = {}
    for row in dataset.daily_sales:
        d = row.day.isoformat()
        day_totals[d] = day_totals.get(d, 0.0) + float(row.units)

    daily_units = [day_totals[d] for d in sorted(day_totals.keys())]

    model = LightGBMDirectModel(n_estimators=15, learning_rate=0.1)
    report = run_backtest(daily_units, model, n_folds=3, horizon=28)

    assert report.model_name == "LightGBMDirect"
    assert report.n_folds == 3
    assert report.horizon == 28
    assert 0.0 <= report.mean_wape <= 2.0
    assert 0.0 <= report.mean_coverage_80 <= 1.0

    table_md = report.to_markdown_table()
    assert "LightGBMDirect" in table_md
    assert "| **Mean** |" in table_md
