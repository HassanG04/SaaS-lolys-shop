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
from lolys_analytics.select import (
    ForecastStatus,
    HierarchyResult,
    ReadinessEvaluation,
    SelectionResult,
    SeriesLevel,
    ValidationResult,
    create_ensemble_forecast,
    evaluate_readiness,
    reconcile_hierarchy,
    sanitize_or_fallback,
    select_best_model,
    validate_forecast,
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
    "ForecastStatus",
    "HierarchyResult",
    "MetricSummary",
    "MovingAverage28Model",
    "ReadinessEvaluation",
    "SeasonalNaiveModel",
    "SelectionResult",
    "SeriesLevel",
    "ValidationResult",
    "build_daily_features",
    "calculate_bias",
    "calculate_mase",
    "calculate_pinball_loss",
    "calculate_wape",
    "censor_stockout_demand",
    "create_ensemble_forecast",
    "create_rolling_origin_folds",
    "evaluate_forecast",
    "evaluate_readiness",
    "filter_poisoned_accounts",
    "filter_valid_sales",
    "get_calendar_day",
    "load_config",
    "reconcile_hierarchy",
    "run_backtest",
    "sanitize_or_fallback",
    "select_best_model",
    "validate_forecast",
    "winsorise_outliers",
]
