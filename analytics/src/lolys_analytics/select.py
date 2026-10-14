"""Model selection, readiness gates, and forecast output validation for Lolys' Analytics.

Per docs/spec/analytics-plan.md Sections 3, 5, and 6:
1. Readiness gates: Evaluates history length and sample volume against thresholds
   from config.toml; assigns statuses ('ok', 'preliminary', 'insufficient_data').
2. Model selection: Per series, chooses the model with the best metric (WAPE or MASE).
   Enforces the 5% rule: candidate must beat seasonal naive by at least 5% relative
   improvement, otherwise falls back to seasonal naive baseline.
3. Model combination (Rung 4): Median ensemble of top 2 or 3 models.
4. Output validation: Asserts forecasts are finite, non-negative, do not exceed 5x
   the series' historical maximum, and prediction intervals are correctly ordered.
5. Hierarchy reconciliation (Rung 5): Reconciles shop and category totals (bottom-up
   or proportional scaling) within tolerance.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from enum import StrEnum
from typing import Any

from lolys_analytics.backtest import BacktestReport
from lolys_analytics.config import GatesConfig
from lolys_analytics.models.baselines import ForecastResult, _extract_series


class ForecastStatus(StrEnum):
    """Forecast lifecycle and data readiness status."""

    OK = "ok"
    PRELIMINARY = "preliminary"
    INSUFFICIENT_DATA = "insufficient_data"


class SeriesLevel(StrEnum):
    """Aggregation level for sales series."""

    SHOP = "shop"
    CATEGORY = "category"
    PRODUCT = "product"


# ==============================================================================
# 1. Data Readiness Gates
# ==============================================================================


@dataclass(frozen=True)
class ReadinessEvaluation:
    """Outcome of data readiness gate evaluation."""

    level: SeriesLevel
    status: ForecastStatus
    can_use_statistical: bool
    can_use_intermittent: bool
    reason: str


def evaluate_readiness(
    level: SeriesLevel | str,
    days_since_first_sale: int,
    total_volume: int | float,
    nonzero_weeks: int = 0,
    total_weeks: int = 0,
    config: GatesConfig | None = None,
) -> ReadinessEvaluation:
    """Evaluates series against data readiness gates in analytics-plan.md Section 3."""
    cfg = config or GatesConfig()
    lvl = SeriesLevel(level) if isinstance(level, str) else level

    if lvl == SeriesLevel.SHOP:
        if days_since_first_sale >= cfg.shop_min_days and total_volume >= cfg.shop_min_orders:
            return ReadinessEvaluation(
                level=lvl,
                status=ForecastStatus.OK,
                can_use_statistical=True,
                can_use_intermittent=False,
                reason=f"Shop meets data readiness gates ({days_since_first_sale}d >= {cfg.shop_min_days}d, "
                f"{total_volume} orders >= {cfg.shop_min_orders}).",
            )
        if days_since_first_sale >= 7 and total_volume >= 1:
            return ReadinessEvaluation(
                level=lvl,
                status=ForecastStatus.PRELIMINARY,
                can_use_statistical=False,
                can_use_intermittent=False,
                reason="Shop has partial data; showing preliminary baseline forecast.",
            )
        return ReadinessEvaluation(
            level=lvl,
            status=ForecastStatus.INSUFFICIENT_DATA,
            can_use_statistical=False,
            can_use_intermittent=False,
            reason="Not enough data yet (ANL-001): shop history < 7 days or 0 orders.",
        )

    if lvl == SeriesLevel.CATEGORY:
        if (
            days_since_first_sale >= cfg.category_min_days
            and total_volume >= cfg.category_min_units
        ):
            return ReadinessEvaluation(
                level=lvl,
                status=ForecastStatus.OK,
                can_use_statistical=True,
                can_use_intermittent=False,
                reason=f"Category meets data readiness gates ({days_since_first_sale}d >= {cfg.category_min_days}d, "
                f"{total_volume} units >= {cfg.category_min_units}).",
            )
        if days_since_first_sale >= 7 and total_volume >= 1:
            return ReadinessEvaluation(
                level=lvl,
                status=ForecastStatus.PRELIMINARY,
                can_use_statistical=False,
                can_use_intermittent=False,
                reason="Category has partial data; showing preliminary baseline forecast.",
            )
        return ReadinessEvaluation(
            level=lvl,
            status=ForecastStatus.INSUFFICIENT_DATA,
            can_use_statistical=False,
            can_use_intermittent=False,
            reason="Not enough data yet (ANL-001): category history < 7 days or 0 units.",
        )

    # PRODUCT level
    effective_total_weeks = total_weeks if total_weeks > 0 else (days_since_first_sale // 7)
    if (
        effective_total_weeks >= cfg.product_min_weeks
        and nonzero_weeks >= cfg.product_min_nonzero_weeks
    ):
        return ReadinessEvaluation(
            level=lvl,
            status=ForecastStatus.OK,
            can_use_statistical=True,
            can_use_intermittent=True,
            reason=f"Product meets data readiness gates ({effective_total_weeks}w >= {cfg.product_min_weeks}w, "
            f"{nonzero_weeks} non-zero weeks).",
        )
    if nonzero_weeks >= 3 or total_volume >= 5:
        # Candidate for intermittent demand method (Croston/TSB/ADIDA)
        return ReadinessEvaluation(
            level=lvl,
            status=ForecastStatus.OK,
            can_use_statistical=False,
            can_use_intermittent=True,
            reason="Product has intermittent sales pattern; eligible for intermittent demand models.",
        )
    if effective_total_weeks >= 1 and total_volume >= 1:
        return ReadinessEvaluation(
            level=lvl,
            status=ForecastStatus.PRELIMINARY,
            can_use_statistical=False,
            can_use_intermittent=False,
            reason="Product has preliminary sales history; showing preliminary baseline projection.",
        )
    return ReadinessEvaluation(
        level=lvl,
        status=ForecastStatus.INSUFFICIENT_DATA,
        can_use_statistical=False,
        can_use_intermittent=False,
        reason="Not enough data yet (ANL-001): product has zero sales history.",
    )


# ==============================================================================
# 2. Model Selection & The 5% Beat Rule
# ==============================================================================


@dataclass(frozen=True)
class SelectionResult:
    """Outcome of model selection against the 5% beat rule."""

    chosen_model: str
    is_baseline_fallback: bool
    chosen_metric_value: float
    baseline_metric_value: float
    relative_improvement: float
    primary_metric: str
    reason: str


def select_best_model(
    candidate_reports: list[BacktestReport],
    baseline_report: BacktestReport,
    min_beat_percentage: float = 0.05,
    primary_metric: str = "wape",
) -> SelectionResult:
    """Selects the best model per series enforcing the 5% rule over baseline."""
    # Extract baseline score
    metric_key = primary_metric.lower()
    baseline_score = (
        baseline_report.mean_mase if metric_key == "mase" else baseline_report.mean_wape
    )

    if not candidate_reports:
        return SelectionResult(
            chosen_model=baseline_report.model_name,
            is_baseline_fallback=True,
            chosen_metric_value=baseline_score,
            baseline_metric_value=baseline_score,
            relative_improvement=0.0,
            primary_metric=primary_metric,
            reason="No candidate models evaluated; defaulting to baseline.",
        )

    # Sort candidates by primary metric (lower is better for WAPE and MASE)
    scored_candidates: list[tuple[float, BacktestReport]] = []
    for rep in candidate_reports:
        val = rep.mean_mase if metric_key == "mase" else rep.mean_wape
        scored_candidates.append((val, rep))

    scored_candidates.sort(key=lambda x: x[0])
    best_score, best_rep = scored_candidates[0]

    if baseline_score <= 1e-9:
        # Edge case: baseline has perfect 0 error
        rel_improvement = 0.0
    else:
        rel_improvement = (baseline_score - best_score) / baseline_score

    # Check 5% beat rule
    if rel_improvement >= min_beat_percentage:
        return SelectionResult(
            chosen_model=best_rep.model_name,
            is_baseline_fallback=False,
            chosen_metric_value=best_score,
            baseline_metric_value=baseline_score,
            relative_improvement=rel_improvement,
            primary_metric=primary_metric,
            reason=f"Selected {best_rep.model_name}: beats baseline by "
            f"{rel_improvement * 100:.2f}% ({best_score:.4f} vs {baseline_score:.4f}).",
        )

    # 5% rule failed: fallback to seasonal naive baseline
    return SelectionResult(
        chosen_model=baseline_report.model_name,
        is_baseline_fallback=True,
        chosen_metric_value=baseline_score,
        baseline_metric_value=baseline_score,
        relative_improvement=rel_improvement,
        primary_metric=primary_metric,
        reason=f"Candidate {best_rep.model_name} failed 5% beat rule "
        f"(improvement {rel_improvement * 100:.2f}% < {min_beat_percentage * 100:.0f}%); "
        f"falling back to {baseline_report.model_name}.",
    )


# ==============================================================================
# 3. Model Combination / Ensemble (Rung 4)
# ==============================================================================


def create_ensemble_forecast(
    forecasts: list[ForecastResult],
    model_name: str = "EnsembleMedian",
) -> ForecastResult:
    """Combines predictions from top models using median ensemble across horizon."""
    if not forecasts:
        raise ValueError("Cannot create ensemble from empty list of forecasts.")
    if len(forecasts) == 1:
        return forecasts[0]

    h = forecasts[0].horizon
    for f in forecasts:
        if f.horizon != h:
            raise ValueError(f"Inconsistent horizon in ensemble: {f.horizon} != {h}")

    point_forecast: list[float] = []
    lower_80: list[float] = []
    upper_80: list[float] = []

    for step in range(h):
        # Extract point predictions for this step
        step_pts = sorted(f.point_forecast[step] for f in forecasts)
        n = len(step_pts)
        if n % 2 == 1:
            med_pt = step_pts[n // 2]
        else:
            med_pt = (step_pts[n // 2 - 1] + step_pts[n // 2]) / 2.0
        point_forecast.append(med_pt)

        # Lower 80 median
        step_lows = sorted(f.lower_80[step] for f in forecasts)
        med_low = (
            step_lows[n // 2] if n % 2 == 1 else (step_lows[n // 2 - 1] + step_lows[n // 2]) / 2.0
        )
        lower_80.append(min(med_pt, max(0.0, med_low)))

        # Upper 80 median
        step_highs = sorted(f.upper_80[step] for f in forecasts)
        med_high = (
            step_highs[n // 2]
            if n % 2 == 1
            else (step_highs[n // 2 - 1] + step_highs[n // 2]) / 2.0
        )
        upper_80.append(max(med_pt, med_high))

    return ForecastResult(
        model_name=model_name,
        point_forecast=point_forecast,
        lower_80=lower_80,
        upper_80=upper_80,
        horizon=h,
    )


# ==============================================================================
# 4. Output Validation & Sanity Checks
# ==============================================================================


@dataclass(frozen=True)
class ValidationResult:
    """Outcome of forecast sanity and bound checks."""

    is_valid: bool
    error_code: str | None = None
    error_message: str | None = None


def validate_forecast(
    forecast: ForecastResult,
    history_data: list[Any],
    max_multiplier: float = 5.0,
) -> ValidationResult:
    """Applies all 4 output sanity checks before writing to database.

    Rules:
    1. All values are finite (no NaN, inf, -inf).
    2. No point prediction or lower bound is negative.
    3. No value exceeds 5 times the series' historical maximum (if max > 0).
    4. Interval ordering holds: lower_80 <= point_forecast <= upper_80.
    """
    history_vals = _extract_series(history_data)
    hist_max = max(history_vals) if history_vals else 0.0

    # 1. Finite check
    for name, seq in [
        ("point_forecast", forecast.point_forecast),
        ("lower_80", forecast.lower_80),
        ("upper_80", forecast.upper_80),
    ]:
        for idx, val in enumerate(seq):
            if not math.isfinite(val):
                return ValidationResult(
                    is_valid=False,
                    error_code="VAL-001",
                    error_message=f"Non-finite value in {name}[{idx}]: {val}",
                )

    # 2. Non-negativity check
    for idx, val in enumerate(forecast.point_forecast):
        if val < 0.0:
            return ValidationResult(
                is_valid=False,
                error_code="VAL-002",
                error_message=f"Negative point forecast at step {idx}: {val}",
            )
    for idx, val in enumerate(forecast.lower_80):
        if val < 0.0:
            return ValidationResult(
                is_valid=False,
                error_code="VAL-002",
                error_message=f"Negative lower bound at step {idx}: {val}",
            )

    # 3. 5x historical max check
    if hist_max > 0.0:
        ceiling = hist_max * max_multiplier
        for idx, val in enumerate(forecast.point_forecast):
            if val > ceiling:
                return ValidationResult(
                    is_valid=False,
                    error_code="VAL-003",
                    error_message=f"Forecast value {val} at step {idx} exceeds {max_multiplier}x historical maximum ({hist_max})",
                )

    # 4. Interval ordering check
    for idx in range(forecast.horizon):
        lo = forecast.lower_80[idx]
        pt = forecast.point_forecast[idx]
        hi = forecast.upper_80[idx]
        if lo > pt + 1e-6 or pt > hi + 1e-6:
            return ValidationResult(
                is_valid=False,
                error_code="VAL-004",
                error_message=f"Interval ordering violation at step {idx}: lower={lo}, point={pt}, upper={hi}",
            )

    return ValidationResult(is_valid=True)


def sanitize_or_fallback(
    forecast: ForecastResult,
    baseline_forecast: ForecastResult,
    history_data: list[Any],
    max_multiplier: float = 5.0,
) -> tuple[ForecastResult, bool]:
    """Validates forecast; returns sanitized forecast or baseline fallback if invalid.

    Returns:
        (resulting_forecast, was_fallback_triggered)
    """
    res = validate_forecast(forecast, history_data, max_multiplier=max_multiplier)
    if res.is_valid:
        return forecast, False

    # Validation failure: fall back to baseline
    # Also clamp baseline just in case
    history_vals = _extract_series(history_data)
    hist_max = max(history_vals) if history_vals else 100.0
    ceiling = hist_max * max_multiplier

    clamped_pts = [max(0.0, min(ceiling, p)) for p in baseline_forecast.point_forecast]
    clamped_low = [
        max(0.0, min(clamped_pts[i], low_val))
        for i, low_val in enumerate(baseline_forecast.lower_80)
    ]
    clamped_high = [max(clamped_pts[i], h) for i, h in enumerate(baseline_forecast.upper_80)]

    fallback_result = ForecastResult(
        model_name=f"{baseline_forecast.model_name}_fallback",
        point_forecast=clamped_pts,
        lower_80=clamped_low,
        upper_80=clamped_high,
        horizon=baseline_forecast.horizon,
    )
    return fallback_result, True


# ==============================================================================
# 5. Hierarchy Reconciliation (Rung 5)
# ==============================================================================


@dataclass(frozen=True)
class HierarchyResult:
    """Reconciled hierarchy forecasts."""

    shop_forecast: list[float]
    category_forecasts: dict[str, list[float]]
    discrepancy_max_pct: float
    is_within_tolerance: bool


def reconcile_hierarchy(
    shop_forecast: list[float],
    category_forecasts: dict[str, list[float]],
    method: str = "bottom_up",
    tolerance_pct: float = 0.10,
) -> HierarchyResult:
    """Reconciles hierarchy so shop and category forecasts sum coherently."""
    h = len(shop_forecast)
    categories = sorted(category_forecasts.keys())

    # Verify all category forecasts match horizon
    for cat, series in category_forecasts.items():
        if len(series) != h:
            raise ValueError(f"Category {cat} horizon {len(series)} != shop horizon {h}")

    # Compute category sums at each step
    category_sums = [sum(category_forecasts[cat][step] for cat in categories) for step in range(h)]

    # Calculate maximum relative discrepancy
    max_disc = 0.0
    for step in range(h):
        s_val = shop_forecast[step]
        c_sum = category_sums[step]
        if s_val > 1e-6:
            disc = abs(s_val - c_sum) / s_val
            if disc > max_disc:
                max_disc = disc

    is_within_tol = max_disc <= tolerance_pct

    if method == "bottom_up":
        # Shop total is explicitly set to the sum of category forecasts
        reconciled_shop = list(category_sums)
        reconciled_categories = {cat: list(vals) for cat, vals in category_forecasts.items()}
    elif method == "proportional":
        # Categories are scaled proportionally to match shop forecast
        reconciled_shop = list(shop_forecast)
        reconciled_categories = {cat: [0.0] * h for cat in categories}

        for step in range(h):
            s_val = shop_forecast[step]
            c_sum = category_sums[step]
            if c_sum > 1e-9:
                scale = s_val / c_sum
            else:
                scale = 1.0

            for cat in categories:
                reconciled_categories[cat][step] = category_forecasts[cat][step] * scale
    else:
        raise ValueError(f"Unknown reconciliation method: {method}")

    return HierarchyResult(
        shop_forecast=reconciled_shop,
        category_forecasts=reconciled_categories,
        discrepancy_max_pct=max_disc,
        is_within_tolerance=is_within_tol,
    )
