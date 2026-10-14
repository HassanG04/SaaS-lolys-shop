"""Statistical forecasting models (Rung 1) for Lolys' Analytics.

Per analytics-plan.md Section 5:
- AutoETS: Exponential Smoothing with automated parameter selection,
  supporting Holt-Winters level, trend, and 7-day seasonality.
- AutoTheta: Assimakopoulos-Nikolopoulos Theta decomposition method with
  seasonal adjustment and combination of linear drift and exponential smoothing.

Both models produce point forecasts and 80% conformal prediction intervals.
"""

from __future__ import annotations

from typing import Any

from lolys_analytics.models.baselines import (
    ForecastResult,
    _compute_conformal_margin,
    _extract_series,
)


class AutoETSModel:
    """Automated Exponential Smoothing (ETS / Holt-Winters) Model.

    Fits level (alpha), trend (beta), and additive seasonal factors (gamma)
    for cyclical time-series (default period m=7 for daily retail sales).
    Automatically optimizes smoothing parameters over a candidate grid to
    minimize in-sample mean squared error.
    """

    def __init__(self, seasonality: int = 7) -> None:
        self.seasonality = seasonality
        self.model_name = "auto_ets"
        self._history: list[float] = []
        self._residuals: list[float] = []
        self._alpha: float = 0.2
        self._beta: float = 0.05
        self._gamma: float = 0.3
        self._level: float = 0.0
        self._trend: float = 0.0
        self._seasonal: list[float] = [0.0] * seasonality

    def fit(self, data: list[Any]) -> AutoETSModel:
        """Fits Holt-Winters model with grid search parameter optimization."""
        self._history = _extract_series(data)
        n = len(self._history)
        m = self.seasonality

        if n < m * 2:
            # Fallback for short series: simple mean and level
            self._level = sum(self._history) / max(1, n)
            self._trend = 0.0
            self._seasonal = [0.0] * m
            self._residuals = [y - self._level for y in self._history]
            return self

        # Initial seasonal factors and level
        initial_level = sum(self._history[:m]) / m
        initial_trend = (sum(self._history[m : 2 * m]) - sum(self._history[:m])) / (m * m)
        initial_seasonal = [self._history[i] - initial_level for i in range(m)]

        # Grid search over smoothing parameters
        candidate_params = [
            (0.1, 0.01, 0.2),
            (0.2, 0.02, 0.3),
            (0.3, 0.05, 0.4),
            (0.2, 0.00, 0.3),
            (0.4, 0.02, 0.2),
            (0.15, 0.01, 0.35),
        ]

        best_mse = float("inf")
        best_params = candidate_params[0]
        best_level = initial_level
        best_trend = initial_trend
        best_seasonal = list(initial_seasonal)
        best_residuals: list[float] = []

        for alpha, beta, gamma in candidate_params:
            level = initial_level
            trend = initial_trend
            seasonal = list(initial_seasonal)
            residuals: list[float] = []
            sse = 0.0

            for t in range(m, n):
                y = self._history[t]
                s_idx = t % m
                # 1-step ahead prediction
                pred = level + trend + seasonal[s_idx]
                err = y - pred
                residuals.append(err)
                sse += err * err

                # Holt-Winters updates
                prev_level = level
                level = alpha * (y - seasonal[s_idx]) + (1.0 - alpha) * (level + trend)
                trend = beta * (level - prev_level) + (1.0 - beta) * trend
                seasonal[s_idx] = gamma * (y - level) + (1.0 - gamma) * seasonal[s_idx]

            mse = sse / max(1, len(residuals))
            if mse < best_mse:
                best_mse = mse
                best_params = (alpha, beta, gamma)
                best_level = level
                best_trend = trend
                best_seasonal = seasonal
                best_residuals = residuals

        self._alpha, self._beta, self._gamma = best_params
        self._level = best_level
        self._trend = best_trend
        self._seasonal = best_seasonal
        self._residuals = best_residuals

        return self

    def predict(self, horizon: int) -> ForecastResult:
        """Projects future demand and conformal 80% prediction intervals."""
        n = len(self._history)
        if n == 0:
            raise ValueError("Model has not been fitted or history is empty.")

        m = self.seasonality
        predictions: list[float] = []

        for h in range(1, horizon + 1):
            s_idx = (n + h - 1) % m
            val = self._level + (h * self._trend) + self._seasonal[s_idx]
            predictions.append(max(0.0, float(val)))

        # Conformal intervals
        margin = _compute_conformal_margin(self._residuals, percentile=0.80)
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


class AutoThetaModel:
    """Assimakopoulos-Nikolopoulos Theta Method with Seasonal Decomposition.

    Deseasonalizes using classical 7-day additive decomposition, applies
    equal combination of linear regression drift (theta=0) and simple
    exponential smoothing (theta=2), and re-applies seasonal patterns.
    """

    def __init__(self, seasonality: int = 7) -> None:
        self.seasonality = seasonality
        self.model_name = "auto_theta"
        self._history: list[float] = []
        self._residuals: list[float] = []
        self._seasonal_factors: list[float] = [0.0] * seasonality
        self._intercept: float = 0.0
        self._slope: float = 0.0
        self._ses_level: float = 0.0
        self._ses_alpha: float = 0.2

    def fit(self, data: list[Any]) -> AutoThetaModel:
        """Fits Theta model on the history."""
        self._history = _extract_series(data)
        n = len(self._history)
        m = self.seasonality

        if n < m:
            # Fallback for tiny series
            self._ses_level = sum(self._history) / max(1, n)
            self._seasonal_factors = [0.0] * m
            self._residuals = [y - self._ses_level for y in self._history]
            return self

        # 1. Classical additive seasonal decomposition
        # Compute mean for each weekday phase
        phase_sums: list[float] = [0.0] * m
        phase_counts: list[int] = [0] * m
        total_mean = sum(self._history) / n

        for i, y in enumerate(self._history):
            phase = i % m
            phase_sums[phase] += y
            phase_counts[phase] += 1

        self._seasonal_factors = [
            (phase_sums[p] / phase_counts[p]) - total_mean if phase_counts[p] > 0 else 0.0
            for p in range(m)
        ]

        # Deseasonalized series
        deseasonalized = [y - self._seasonal_factors[i % m] for i, y in enumerate(self._history)]

        # 2. Linear regression component (Theta=0 line)
        # x = 0, 1, ..., n-1
        x_mean = (n - 1) / 2.0
        y_mean = sum(deseasonalized) / n
        ss_xx = sum((x - x_mean) ** 2 for x in range(n))
        ss_xy = sum((x - x_mean) * (y - y_mean) for x, y in enumerate(deseasonalized))

        self._slope = ss_xy / ss_xx if ss_xx > 0 else 0.0
        self._intercept = y_mean - self._slope * x_mean

        # 3. Simple Exponential Smoothing component (Theta=2 line)
        alpha = self._ses_alpha
        level = deseasonalized[0]
        residuals: list[float] = []

        for t, y in enumerate(deseasonalized):
            # 1-step forecast is previous level
            pred = level + self._seasonal_factors[t % m]
            residuals.append(self._history[t] - pred)
            level = alpha * y + (1.0 - alpha) * level

        self._ses_level = level
        self._residuals = residuals

        return self

    def predict(self, horizon: int) -> ForecastResult:
        """Projects Theta forecasts combining drift and SES with seasonal re-adjustment."""
        n = len(self._history)
        if n == 0:
            raise ValueError("Model has not been fitted or history is empty.")

        m = self.seasonality
        predictions: list[float] = []

        for h in range(1, horizon + 1):
            future_x = n - 1 + h
            # Theta = 0 (linear regression drift)
            y_theta0 = self._intercept + self._slope * future_x
            # Theta = 2 (SES level)
            y_theta2 = self._ses_level
            # Standard Theta combination: 0.5 * Theta0 + 0.5 * Theta2
            combined = 0.5 * y_theta0 + 0.5 * y_theta2
            # Re-apply seasonal factor
            s_idx = (n + h - 1) % m
            val = combined + self._seasonal_factors[s_idx]
            predictions.append(max(0.0, float(val)))

        # Conformal intervals
        margin = _compute_conformal_margin(self._residuals, percentile=0.80)
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
