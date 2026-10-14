"""Configuration loader and data classes for Lolys Analytics."""

from __future__ import annotations

import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class GatesConfig:
    shop_min_days: int = 56
    shop_min_orders: int = 30
    category_min_days: int = 84
    category_min_units: int = 40
    product_min_weeks: int = 12
    product_min_nonzero_weeks: int = 6


@dataclass(frozen=True)
class ReorderConfig:
    default_lead_time_days: int = 7
    default_service_z: float = 1.28
    review_cycle_days: int = 7


@dataclass(frozen=True)
class CleaningConfig:
    winsorize_percentile: float = 0.99
    poison_threshold_rejected_or_expired: int = 3
    poison_window_days: int = 30
    mask_stockout_days: bool = True


@dataclass(frozen=True)
class IntervalsConfig:
    confidence_level: float = 0.80
    min_coverage_threshold: float = 0.70


@dataclass(frozen=True)
class SyntheticConfig:
    default_days: int = 180
    default_seed: int = 42
    num_categories: int = 5
    num_products: int = 25
    base_daily_orders: int = 15
    trend_daily_growth: float = 0.0015
    ramadan_uplift: float = 0.45
    eid_uplift: float = 0.75
    mothers_day_uplift: float = 0.85
    valentines_uplift: float = 0.40
    black_friday_uplift: float = 1.10
    outlier_rate: float = 0.015
    stockout_probability: float = 0.03
    poisoned_accounts_count: int = 3


@dataclass(frozen=True)
class GlobalMLConfig:
    enabled: bool = False
    min_history_days: int = 180
    min_active_products: int = 30
    min_beat_percentage: float = 0.05
    direct_horizons: tuple[int, ...] = (7, 14, 21, 28)


@dataclass(frozen=True)
class AnalyticsConfig:
    gates: GatesConfig
    reorder: ReorderConfig
    cleaning: CleaningConfig
    intervals: IntervalsConfig
    synthetic: SyntheticConfig
    global_ml: GlobalMLConfig = GlobalMLConfig()


def get_default_config_path() -> Path:
    """Return default location of config.toml."""
    # Try looking in analytics/config.toml relative to this file
    here = Path(__file__).resolve()
    candidate = here.parent.parent.parent / "config.toml"
    if candidate.is_file():
        return candidate
    return Path("config.toml")


def load_config(path: str | Path | None = None) -> AnalyticsConfig:
    """Load and parse analytics config from TOML file."""
    config_path = Path(path) if path else get_default_config_path()

    if not config_path.is_file():
        # Fall back to default dataclass values if file not found
        return AnalyticsConfig(
            gates=GatesConfig(),
            reorder=ReorderConfig(),
            cleaning=CleaningConfig(),
            intervals=IntervalsConfig(),
            synthetic=SyntheticConfig(),
        )

    with open(config_path, "rb") as f:
        data: dict[str, Any] = tomllib.load(f)

    gates_data = data.get("gates", {})
    reorder_data = data.get("reorder", {})
    cleaning_data = data.get("cleaning", {})
    intervals_data = data.get("intervals", {})
    synthetic_data = data.get("synthetic", {})
    global_ml_data = data.get("global_ml", {})

    return AnalyticsConfig(
        gates=GatesConfig(
            shop_min_days=int(gates_data.get("shop_min_days", 56)),
            shop_min_orders=int(gates_data.get("shop_min_orders", 30)),
            category_min_days=int(gates_data.get("category_min_days", 84)),
            category_min_units=int(gates_data.get("category_min_units", 40)),
            product_min_weeks=int(gates_data.get("product_min_weeks", 12)),
            product_min_nonzero_weeks=int(gates_data.get("product_min_nonzero_weeks", 6)),
        ),
        reorder=ReorderConfig(
            default_lead_time_days=int(reorder_data.get("default_lead_time_days", 7)),
            default_service_z=float(reorder_data.get("default_service_z", 1.28)),
            review_cycle_days=int(reorder_data.get("review_cycle_days", 7)),
        ),
        cleaning=CleaningConfig(
            winsorize_percentile=float(cleaning_data.get("winsorize_percentile", 0.99)),
            poison_threshold_rejected_or_expired=int(
                cleaning_data.get("poison_threshold_rejected_or_expired", 3)
            ),
            poison_window_days=int(cleaning_data.get("poison_window_days", 30)),
            mask_stockout_days=bool(cleaning_data.get("mask_stockout_days", True)),
        ),
        intervals=IntervalsConfig(
            confidence_level=float(intervals_data.get("confidence_level", 0.80)),
            min_coverage_threshold=float(intervals_data.get("min_coverage_threshold", 0.70)),
        ),
        synthetic=SyntheticConfig(
            default_days=int(synthetic_data.get("default_days", 180)),
            default_seed=int(synthetic_data.get("default_seed", 42)),
            num_categories=int(synthetic_data.get("num_categories", 5)),
            num_products=int(synthetic_data.get("num_products", 25)),
            base_daily_orders=int(synthetic_data.get("base_daily_orders", 15)),
            trend_daily_growth=float(synthetic_data.get("trend_daily_growth", 0.0015)),
            ramadan_uplift=float(synthetic_data.get("ramadan_uplift", 0.45)),
            eid_uplift=float(synthetic_data.get("eid_uplift", 0.75)),
            mothers_day_uplift=float(synthetic_data.get("mothers_day_uplift", 0.85)),
            valentines_uplift=float(synthetic_data.get("valentines_uplift", 0.40)),
            black_friday_uplift=float(synthetic_data.get("black_friday_uplift", 1.10)),
            outlier_rate=float(synthetic_data.get("outlier_rate", 0.015)),
            stockout_probability=float(synthetic_data.get("stockout_probability", 0.03)),
            poisoned_accounts_count=int(synthetic_data.get("poisoned_accounts_count", 3)),
        ),
        global_ml=GlobalMLConfig(
            enabled=bool(global_ml_data.get("enabled", False)),
            min_history_days=int(global_ml_data.get("min_history_days", 180)),
            min_active_products=int(global_ml_data.get("min_active_products", 30)),
            min_beat_percentage=float(global_ml_data.get("min_beat_percentage", 0.05)),
            direct_horizons=tuple(global_ml_data.get("direct_horizons", (7, 14, 21, 28))),
        ),
    )
