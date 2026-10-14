"""Baseline forecasting models (Rung 0) for Lolys' Analytics.

Per analytics-plan.md Section 5:
- Seasonal Naive (same weekday last week, 7-day cyclical projection).
- 28-day Moving Average (rolling mean of the past 28 observations).

These represent the fundamental performance baseline that every statistical
or ML model must beat by at least 5% in backtests to be selected.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ForecastResult:
    """Strongly typed forecast output with point predictions and prediction intervals."""

    model_name: str
    point_forecast: list[float]
    lower_80: list[float]
    upper_80: list[float]
    horizon: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "model_name": self.model_name,
            "point_forecast": [round(x, 4) for x in self.point_forecast],
            "lower_80": [round(x, 4) for x in self.lower_80],
            "upper_80": [round(x, 4) for x in self.upper_80],
            "horizon": self.horizon,
        }


def _extract_series(data: list[Any]) -> list[float]:
    """Helper to extract float units from either numbers or DailyObservation objects."""
    result: list[float] = []
    for item in data:
        if hasattr(item, "units"):
            result.append(float(item.units))
        elif isinstance(item, (int, float)):
            result.append(float(item))
        elif isinstance(item, dict) and "units" in item:
            result.append(float(item["units"]))
        else:
            raise TypeError(f"Cannot extract numeric demand from {type(item)}")
    return result


def _compute_conformal_margin(residuals: list[float], percentile: float = 0.80) -> float:
    """Calculates empirical conformal margin for target coverage."""
    if not residuals:
        return 0.0
    abs_res = sorted(abs(r) for r in residuals)
    n = len(abs_res)
    idx = int(math.ceil(percentile * n)) - 1
    idx = max(0, min(idx, n - 1))
    return float(abs_res[idx])


class SeasonalNaiveModel:
    """Seasonal Naive Baseline Model.

    Predicts future demand using the observation from the exact same phase
    of the most recent seasonal cycle (default period m=7 for daily data).
    """

    def __init__(self, seasonality: int = 7) -> None:
        self.seasonality = seasonality
        self.model_name = "seasonal_naive"
        self._history: list[float] = []
        self._residuals: list[float] = []

    def fit(self, data: list[Any]) -> SeasonalNaiveModel:
        """Fits seasonal naive by storing history and computing in-sample residuals."""
        self._history = _extract_series(data)
        n = len(self._history)
        m = self.seasonality

        self._residuals = []
        if n > m:
            for t in range(m, n):
                pred = self._history[t - m]
                actual = self._history[t]
                self._residuals.append(actual - pred)

        return self

    def predict(self, horizon: int) -> ForecastResult:
        """Projects seasonal naive predictions and conformal 80% intervals."""
        n = len(self._history)
        if n == 0:
            raise ValueError("Model has not been fitted or history is empty.")

        m = min(self.seasonality, n)
        predictions: list[float] = []

        # Canonical seasonal naive projection:
        # For step h in 1..horizon, pick the observation from the last cycle:
        # index = n - m + ((h - 1) % m)
        for h in range(1, horizon + 1):
            source_idx = n - m + ((h - 1) % m)
            val = max(0.0, float(self._history[source_idx]))
            predictions.append(val)

        # 80% Conformal Prediction Intervals
        margin = _compute_conformal_margin(self._residuals, percentile=0.80)
        # If no residuals available, default margin to 15% of prediction
        lower_80: list[float] = []
        upper_80: list[float] = []
        for p in predictions:
            eff_margin = margin if margin > 0 else (0.15 * p if p > 0 else 1.0)
            lower_80.append(max(0.0, p - eff_margin))
            upper_80.append(p + eff_margin)

        return ForecastResult(
            model_name=self.model_name,
            point_forecast=predictions,
            lower_80=lower_80,
            upper_80=upper_80,
            horizon=horizon,
        )


class MovingAverage28Model:
    """28-day Moving Average Baseline Model.

    Predicts future demand using the mean of the past 28 observations.
    Projects a constant level across the forecast horizon.
    """

    def __init__(self, window: int = 28) -> None:
        self.window = window
        self.model_name = "moving_average_28"
        self._history: list[float] = []
        self._residuals: list[float] = []
        self._mean_value: float = 0.0

    def fit(self, data: list[Any]) -> MovingAverage28Model:
        """Fits moving average by computing mean over the window and in-sample residuals."""
        self._history = _extract_series(data)
        n = len(self._history)

        if n == 0:
            self._mean_value = 0.0
            self._residuals = []
            return self

        w = min(self.window, n)
        window_slice = self._history[-w:]
        self._mean_value = sum(window_slice) / len(window_slice)

        # In-sample residuals over rolling windows
        self._residuals = []
        if n > 1:
            for t in range(1, n):
                past_w = self._history[max(0, t - self.window) : t]
                rolling_avg = sum(past_w) / len(past_w)
                self._residuals.append(self._history[t] - rolling_avg)

        return self

    def predict(self, horizon: int) -> ForecastResult:
        """Projects moving average predictions and conformal 80% intervals."""
        if not self._history:
            raise ValueError("Model has not been fitted or history is empty.")

        val = max(0.0, self._mean_value)
        predictions = [val] * horizon

        margin = _compute_conformal_margin(self._residuals, percentile=0.80)
        lower_80: list[float] = []
        upper_80: list[float] = []
        for p in predictions:
            eff_margin = margin if margin > 0 else (0.20 * p if p > 0 else 1.0)
            lower_80.append(max(0.0, p - eff_margin))
            upper_80.append(p + eff_margin)

        return ForecastResult(
            model_name=self.model_name,
            point_forecast=predictions,
            lower_80=lower_80,
            upper_80=upper_80,
            horizon=horizon,
        )
