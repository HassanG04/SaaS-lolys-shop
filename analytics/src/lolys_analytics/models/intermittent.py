"""Intermittent demand forecasting models (Rung 2) for Lolys' Analytics.

Per analytics-plan.md Section 5:
- Croston (SBA variant): Syntetos-Boylan Approximation correcting Croston's positive bias.
- TSB: Teunter-Syntetos-Babai model updating demand probability in every period.
- ADIDA: Aggregate-Disaggregate Intermittent Demand Approach.

Designed specifically for slow-moving products with intermittent demand and frequent zeros.
"""

from __future__ import annotations

from typing import Any

from lolys_analytics.models.baselines import (
    ForecastResult,
    _compute_conformal_margin,
    _extract_series,
)


class CrostonSBAModel:
    """Croston's Method with Syntetos-Boylan Approximation (SBA).

    Separately models non-zero demand size (z) and inter-demand arrival intervals (p).
    Applies the Syntetos-Boylan factor (1 - alpha/2) to eliminate the positive bias
    inherent in standard Croston estimation.
    """

    def __init__(self, alpha: float = 0.1) -> None:
        self.alpha = alpha
        self.model_name = "croston_sba"
        self._history: list[float] = []
        self._residuals: list[float] = []
        self._demand_rate: float = 0.0

    def fit(self, data: list[Any]) -> CrostonSBAModel:
        """Fits Croston SBA model by tracking non-zero sizes and intervals."""
        self._history = _extract_series(data)
        n = len(self._history)

        if n == 0 or all(y == 0.0 for y in self._history):
            self._demand_rate = 0.0
            self._residuals = [0.0] * n
            return self

        # Initialize with first non-zero demand
        first_idx = next(i for i, y in enumerate(self._history) if y > 0)
        z = self._history[first_idx]
        p = float(first_idx + 1)
        q = 1  # Time since last demand

        alpha = self.alpha
        residuals: list[float] = []

        for t in range(first_idx + 1, n):
            y = self._history[t]
            # SBA rate = (1 - alpha/2) * (z / p)
            rate = (1.0 - (alpha / 2.0)) * (z / max(1.0, p))
            residuals.append(y - rate)

            if y > 0:
                # Update demand size and inter-demand interval
                z = alpha * y + (1.0 - alpha) * z
                p = alpha * q + (1.0 - alpha) * p
                q = 1
            else:
                q += 1

        self._demand_rate = max(0.0, (1.0 - (alpha / 2.0)) * (z / max(1.0, p)))
        self._residuals = residuals if residuals else [0.0]

        return self

    def predict(self, horizon: int) -> ForecastResult:
        """Projects constant intermittent demand rate and conformal intervals."""
        rate = self._demand_rate
        predictions = [rate] * horizon

        margin = _compute_conformal_margin(self._residuals, percentile=0.80)
        lower_80: list[float] = []
        upper_80: list[float] = []

        for p in predictions:
            eff_margin = margin if margin > 0 else (0.25 * p if p > 0 else 0.5)
            lower_80.append(max(0.0, p - eff_margin))
            upper_80.append(p + eff_margin)

        return ForecastResult(
            model_name=self.model_name,
            point_forecast=predictions,
            lower_80=lower_80,
            upper_80=upper_80,
            horizon=horizon,
        )


class TSBModel:
    """Teunter-Syntetos-Babai (TSB) Intermittent Demand Model.

    Updates demand probability (d) in every period (not just positive periods),
    preventing positive bias and obsolete stock buildup for declining items.
    Demand size (z) is updated on non-zero demand periods.
    """

    def __init__(self, alpha: float = 0.15, beta: float = 0.10) -> None:
        self.alpha = alpha  # smoothing for demand size
        self.beta = beta  # smoothing for demand probability
        self.model_name = "tsb"
        self._history: list[float] = []
        self._residuals: list[float] = []
        self._rate: float = 0.0

    def fit(self, data: list[Any]) -> TSBModel:
        """Fits TSB model updating probability at every time step."""
        self._history = _extract_series(data)
        n = len(self._history)

        if n == 0 or all(y == 0.0 for y in self._history):
            self._rate = 0.0
            self._residuals = [0.0] * n
            return self

        # Initial estimates
        non_zeros = [y for y in self._history if y > 0]
        z = sum(non_zeros) / len(non_zeros) if non_zeros else 1.0
        d = len(non_zeros) / n if n > 0 else 0.1

        residuals: list[float] = []
        alpha = self.alpha
        beta = self.beta

        for y in self._history:
            rate = d * z
            residuals.append(y - rate)

            # Update demand probability every period
            indicator = 1.0 if y > 0 else 0.0
            d = beta * indicator + (1.0 - beta) * d

            # Update demand size only when demand occurs
            if y > 0:
                z = alpha * y + (1.0 - alpha) * z

        self._rate = max(0.0, d * z)
        self._residuals = residuals

        return self

    def predict(self, horizon: int) -> ForecastResult:
        """Projects constant TSB rate and conformal intervals."""
        rate = self._rate
        predictions = [rate] * horizon

        margin = _compute_conformal_margin(self._residuals, percentile=0.80)
        lower_80: list[float] = []
        upper_80: list[float] = []

        for p in predictions:
            eff_margin = margin if margin > 0 else (0.25 * p if p > 0 else 0.5)
            lower_80.append(max(0.0, p - eff_margin))
            upper_80.append(p + eff_margin)

        return ForecastResult(
            model_name=self.model_name,
            point_forecast=predictions,
            lower_80=lower_80,
            upper_80=upper_80,
            horizon=horizon,
        )


class ADIDAModel:
    """Aggregate-Disaggregate Intermittent Demand Approach (ADIDA).

    Aggregates intermittent demand into higher-frequency temporal buckets
    (default aggregation level k=7 for weekly aggregation), applies exponential
    smoothing to the dense aggregated series, and disaggregates back to daily rate.
    """

    def __init__(self, aggregation_level: int = 7, alpha: float = 0.2) -> None:
        self.aggregation_level = aggregation_level
        self.alpha = alpha
        self.model_name = "adida"
        self._history: list[float] = []
        self._residuals: list[float] = []
        self._daily_rate: float = 0.0

    def fit(self, data: list[Any]) -> ADIDAModel:
        """Aggregates series into buckets and fits exponential smoothing."""
        self._history = _extract_series(data)
        n = len(self._history)
        k = self.aggregation_level

        if n < k:
            self._daily_rate = sum(self._history) / max(1, n)
            self._residuals = [y - self._daily_rate for y in self._history]
            return self

        # 1. Aggregate non-overlapping buckets of size k
        num_buckets = n // k
        bucket_sums: list[float] = []
        for b in range(num_buckets):
            chunk = self._history[b * k : (b + 1) * k]
            bucket_sums.append(sum(chunk))

        # 2. Simple exponential smoothing on aggregated buckets
        alpha = self.alpha
        level = bucket_sums[0]
        for s in bucket_sums:
            level = alpha * s + (1.0 - alpha) * level

        # 3. Disaggregate back to daily rate
        self._daily_rate = max(0.0, level / k)

        # In-sample daily residuals
        self._residuals = [y - self._daily_rate for y in self._history]

        return self

    def predict(self, horizon: int) -> ForecastResult:
        """Projects disaggregated rate and conformal intervals."""
        rate = self._daily_rate
        predictions = [rate] * horizon

        margin = _compute_conformal_margin(self._residuals, percentile=0.80)
        lower_80: list[float] = []
        upper_80: list[float] = []

        for p in predictions:
            eff_margin = margin if margin > 0 else (0.25 * p if p > 0 else 0.5)
            lower_80.append(max(0.0, p - eff_margin))
            upper_80.append(p + eff_margin)

        return ForecastResult(
            model_name=self.model_name,
            point_forecast=predictions,
            lower_80=lower_80,
            upper_80=upper_80,
            horizon=horizon,
        )
