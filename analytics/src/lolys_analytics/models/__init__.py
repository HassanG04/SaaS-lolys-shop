"""Forecasting models package for Lolys' Analytics."""

from lolys_analytics.models.baselines import (
    ForecastResult,
    MovingAverage28Model,
    SeasonalNaiveModel,
)

__all__ = [
    "ForecastResult",
    "MovingAverage28Model",
    "SeasonalNaiveModel",
]
