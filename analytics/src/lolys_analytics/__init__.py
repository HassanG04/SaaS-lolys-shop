"""Lolys' Accessories & Home Analytics Package."""

from lolys_analytics.backtest import (
    BacktestFold,
    BacktestReport,
    MetricSummary,
    calculate_bias,
    calculate_mase,
    calculate_pinball_loss,
    calculate_wape,
    create_rolling_origin_folds,
    evaluate_forecast,
    run_backtest,
)
from lolys_analytics.calendar import (
    COMMITTED_OFFICIAL_EVENTS,
    CalendarDay,
    get_calendar_day,
)
from lolys_analytics.config import AnalyticsConfig, load_config
from lolys_analytics.features import (
    DailyObservation,
    FeatureRow,
    build_daily_features,
    censor_stockout_demand,
    filter_poisoned_accounts,
    filter_valid_sales,
    winsorise_outliers,
)
from lolys_analytics.models.baselines import (
    ForecastResult,
    MovingAverage28Model,
    SeasonalNaiveModel,
)

__version__ = "0.1.0"

__all__ = [
    "COMMITTED_OFFICIAL_EVENTS",
    "AnalyticsConfig",
    "BacktestFold",
    "BacktestReport",
    "CalendarDay",
    "DailyObservation",
    "FeatureRow",
    "ForecastResult",
    "MetricSummary",
    "MovingAverage28Model",
    "SeasonalNaiveModel",
    "build_daily_features",
    "calculate_bias",
    "calculate_mase",
    "calculate_pinball_loss",
    "calculate_wape",
    "censor_stockout_demand",
    "create_rolling_origin_folds",
    "evaluate_forecast",
    "filter_poisoned_accounts",
    "filter_valid_sales",
    "get_calendar_day",
    "load_config",
    "run_backtest",
    "winsorise_outliers",
]
