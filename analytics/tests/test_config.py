"""Unit tests for analytics configuration loading."""

from __future__ import annotations

from pathlib import Path

from lolys_analytics.config import AnalyticsConfig, load_config


def test_load_config_defaults() -> None:
    """Config loads valid default values even when file is missing."""
    cfg = load_config(path="non_existent_file.toml")
    assert isinstance(cfg, AnalyticsConfig)
    assert cfg.gates.shop_min_days == 56
    assert cfg.gates.shop_min_orders == 30
    assert cfg.gates.category_min_days == 84
    assert cfg.gates.category_min_units == 40
    assert cfg.gates.product_min_weeks == 12
    assert cfg.gates.product_min_nonzero_weeks == 6
    assert cfg.reorder.default_lead_time_days == 7
    assert cfg.reorder.default_service_z == 1.28
    assert cfg.cleaning.winsorize_percentile == 0.99
    assert cfg.intervals.confidence_level == 0.80


def test_load_real_config_file() -> None:
    """Verifies that analytics/config.toml loads cleanly and matches expectations."""
    config_file = Path(__file__).resolve().parent.parent / "config.toml"
    assert config_file.is_file(), f"Expected config file at {config_file}"

    cfg = load_config(path=config_file)
    assert cfg.gates.shop_min_days == 56
    assert cfg.gates.category_min_days == 84
    assert cfg.cleaning.poison_threshold_rejected_or_expired == 3
    assert cfg.cleaning.poison_window_days == 30
    assert cfg.synthetic.default_days == 180
    assert cfg.synthetic.default_seed == 42
    assert cfg.synthetic.num_products == 25
