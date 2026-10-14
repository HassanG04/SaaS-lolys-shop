"""Lolys' Accessories & Home Analytics Package."""

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

__version__ = "0.1.0"

__all__ = [
    "COMMITTED_OFFICIAL_EVENTS",
    "AnalyticsConfig",
    "CalendarDay",
    "DailyObservation",
    "FeatureRow",
    "build_daily_features",
    "censor_stockout_demand",
    "filter_poisoned_accounts",
    "filter_valid_sales",
    "get_calendar_day",
    "load_config",
    "winsorise_outliers",
]
