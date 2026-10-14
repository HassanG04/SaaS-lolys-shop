"""Accuracy tracking and drift alert module.

Reference: docs/spec/analytics-plan.md Section 9 (Monitoring)
- analytics.forecast_accuracy compares each past forecast with actual sales by horizon.
- Alert rule: if the 4-week rolling WAPE of the shop forecast is more than 20% worse
  than seasonal naive for 2 weeks in a row, switch the display back to the baseline,
  mark it, and surface a banner to the admin.
- When accuracy recovers (rolling WAPE <= 1.20 * baseline), clear the alert and restore
  the selected model display.
"""

from __future__ import annotations

import datetime as dt
from collections.abc import Sequence
from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class ForecastAccuracyPoint:
    """Individual forecast vs actual observation from analytics.forecast_accuracy."""

    forecast_date: dt.date
    predicted_units: float
    actual_units: float
    model_name: str
    horizon_step: int = 1
    lower_80: float = 0.0
    upper_80: float = 0.0
    series_type: str = "shop"
    series_id: int | None = None
    run_id: int | None = None


@dataclass(frozen=True)
class WindowAccuracyResult:
    """Aggregated accuracy metrics over an evaluation window (e.g., 4-week rolling window)."""

    model_name: str
    wape: float
    total_actual_units: float
    total_predicted_units: float
    total_abs_error: float
    interval_coverage: float
    mean_bias: float
    sample_count: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class DriftCheckResult:
    """Result of weekly accuracy evaluation and drift detection."""

    is_drifting_this_week: bool
    consecutive_drift_weeks: int
    drift_alert: bool
    display_fallback: bool
    active_display_model: str
    model_wape: float
    baseline_wape: float
    relative_ratio: float
    threshold: float
    message_ar: str
    message_en: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def compute_wape(actuals: Sequence[float], predictions: Sequence[float]) -> float:
    """Compute Weighted Absolute Percentage Error (WAPE = sum(|y - y_hat|) / sum(y)).

    If actuals sum to zero, returns 0.0 if predictions are also 0.0, else 1.0.
    """
    if len(actuals) != len(predictions):
        raise ValueError(
            f"Length mismatch: {len(actuals)} actuals vs {len(predictions)} predictions."
        )
    if not actuals:
        return 0.0

    total_actual = sum(float(a) for a in actuals)
    total_abs_err = sum(abs(float(a) - float(p)) for a, p in zip(actuals, predictions, strict=True))

    if total_actual <= 0:
        return 0.0 if total_abs_err == 0 else 1.0

    return total_abs_err / total_actual


def compute_interval_coverage(
    actuals: Sequence[float],
    lower: Sequence[float],
    upper: Sequence[float],
) -> float:
    """Compute empirical coverage percentage of actuals inside [lower, upper] interval."""
    if not actuals:
        return 0.0
    in_bounds = sum(
        1
        for a, lo, hi in zip(actuals, lower, upper, strict=True)
        if float(lo) <= float(a) <= float(hi)
    )
    return in_bounds / len(actuals)


def compute_mean_bias(actuals: Sequence[float], predictions: Sequence[float]) -> float:
    """Compute mean signed bias (mean(predicted - actual))."""
    if not actuals:
        return 0.0
    return sum(float(p) - float(a) for a, p in zip(actuals, predictions, strict=True)) / len(
        actuals
    )


def evaluate_accuracy_window(
    points: Sequence[ForecastAccuracyPoint],
    window_days: int = 28,
    as_of_date: dt.date | None = None,
) -> WindowAccuracyResult:
    """Evaluate accuracy over the most recent `window_days` for a series of accuracy points."""
    if not points:
        return WindowAccuracyResult(
            model_name="unknown",
            wape=0.0,
            total_actual_units=0.0,
            total_predicted_units=0.0,
            total_abs_error=0.0,
            interval_coverage=0.0,
            mean_bias=0.0,
            sample_count=0,
        )

    ref_date = as_of_date or max(p.forecast_date for p in points)
    cutoff = ref_date - dt.timedelta(days=window_days)

    filtered = [p for p in points if cutoff < p.forecast_date <= ref_date]
    if not filtered:
        filtered = list(points)

    actuals = [p.actual_units for p in filtered]
    preds = [p.predicted_units for p in filtered]
    lowers = [p.lower_80 for p in filtered]
    uppers = [p.upper_80 for p in filtered]

    wape = compute_wape(actuals, preds)
    cov = compute_interval_coverage(actuals, lowers, uppers)
    bias = compute_mean_bias(actuals, preds)

    model_name = filtered[0].model_name if filtered else "unknown"

    return WindowAccuracyResult(
        model_name=model_name,
        wape=round(wape, 4),
        total_actual_units=round(sum(actuals), 2),
        total_predicted_units=round(sum(preds), 2),
        total_abs_error=round(sum(abs(a - p) for a, p in zip(actuals, preds, strict=True)), 2),
        interval_coverage=round(cov, 4),
        mean_bias=round(bias, 4),
        sample_count=len(filtered),
    )


def evaluate_drift(
    candidate_points: Sequence[ForecastAccuracyPoint],
    baseline_points: Sequence[ForecastAccuracyPoint],
    prior_consecutive_drift_weeks: int = 0,
    threshold: float = 0.20,
    min_consecutive_weeks: int = 2,
    candidate_model_name: str | None = None,
    baseline_model_name: str = "SeasonalNaive",
    window_days: int = 28,
    as_of_date: dt.date | None = None,
) -> DriftCheckResult:
    """Evaluate drift rule: 4-week rolling WAPE > 20% worse than Seasonal Naive for 2 weeks in a row.

    Rule:
    - If candidate WAPE > (1.0 + threshold) * baseline WAPE: drift condition met.
      consecutive_drift_weeks = prior_consecutive_drift_weeks + 1.
    - Else: accuracy is normal or recovered.
      consecutive_drift_weeks = 0.
    - If consecutive_drift_weeks >= min_consecutive_weeks (2):
      drift_alert = True, display_fallback = True, active_display_model = SeasonalNaive.
    """
    cand_eval = evaluate_accuracy_window(
        candidate_points, window_days=window_days, as_of_date=as_of_date
    )
    base_eval = evaluate_accuracy_window(
        baseline_points, window_days=window_days, as_of_date=as_of_date
    )

    cand_wape = cand_eval.wape
    base_wape = base_eval.wape
    model_name = candidate_model_name or cand_eval.model_name

    # Relative comparison: is candidate > 20% worse than baseline?
    if base_wape > 0:
        rel_diff = (cand_wape - base_wape) / base_wape
        rel_ratio = cand_wape / base_wape
    else:
        rel_diff = 1.0 if cand_wape > 0 else 0.0
        rel_ratio = 1.0 + rel_diff

    is_drifting = rel_diff > threshold

    if is_drifting:
        consecutive = prior_consecutive_drift_weeks + 1
    else:
        consecutive = 0

    drift_alert = consecutive >= min_consecutive_weeks
    display_fallback = drift_alert
    active_display_model = baseline_model_name if display_fallback else model_name

    if drift_alert:
        msg_ar = (
            "تنبيه دقة التوقعات: انخفضت دقة نموذج التوقعات بأكثر من 20% "
            "مقارنة بالنموذج المرجعي لأسبوعين متتاليين. تم تحويل العرض تلقائيًا "
            "إلى النموذج الموسمي المرجعي (SeasonalNaive) لضمان موثوقية التخطيط."
        )
        msg_en = (
            f"Drift alert active: {model_name} rolling 4-week WAPE ({cand_wape:.2%}) is >20% worse "
            f"than {baseline_model_name} ({base_wape:.2%}) for {consecutive} consecutive weeks. "
            f"Display switched to {baseline_model_name} fallback."
        )
    elif is_drifting:
        msg_ar = (
            f"ملاحظة: انخفضت دقة نموذج التوقعات ({cand_wape:.2%}) هذا الأسبوع مقارنة بالمرجعي "
            f"({base_wape:.2%}) لمدة أسبوع واحد. التنبيه لم يُفعل بعد في انتظار استقرار الأسبوع القادم."
        )
        msg_en = (
            f"Drift warning: {model_name} WAPE ({cand_wape:.2%}) worse than {baseline_model_name} "
            f"({base_wape:.2%}) for 1 week. Threshold not yet breached (requires 2 consecutive weeks)."
        )
    else:
        msg_ar = "دقة التوقعات ضمن المعدل الطبيعي مقارنة بالنموذج المرجعي."
        msg_en = (
            f"Forecast accuracy healthy. {model_name} WAPE: {cand_wape:.2%}, "
            f"{baseline_model_name} WAPE: {base_wape:.2%}."
        )

    return DriftCheckResult(
        is_drifting_this_week=is_drifting,
        consecutive_drift_weeks=consecutive,
        drift_alert=drift_alert,
        display_fallback=display_fallback,
        active_display_model=active_display_model,
        model_wape=round(cand_wape, 4),
        baseline_wape=round(base_wape, 4),
        relative_ratio=round(rel_ratio, 4),
        threshold=threshold,
        message_ar=msg_ar,
        message_en=msg_en,
    )


def simulate_drift_and_recovery_timeline(
    candidate_model_name: str = "AutoTheta",
    baseline_model_name: str = "SeasonalNaive",
    threshold: float = 0.20,
) -> list[DriftCheckResult]:
    """Simulate a multi-week lifecycle testing drift trigger and recovery.

    Timeline:
    - Week 1: Healthy period (Candidate WAPE 18% vs Baseline 25%). Consecutive = 0, Alert = False.
    - Week 2: Demand shift onset (Candidate WAPE 35% vs Baseline 25%, +40%). Consecutive = 1, Alert = False.
    - Week 3: Second week of drift (Candidate WAPE 38% vs Baseline 25%, +52%). Consecutive = 2, Alert = True!
      Display switches to SeasonalNaive.
    - Week 4: Third week of drift (Candidate WAPE 40% vs Baseline 24%, +66%). Consecutive = 3, Alert = True!
      Display remains SeasonalNaive fallback.
    - Week 5: Recovery week (Candidate WAPE 20% vs Baseline 26%, -23%). Consecutive = 0, Alert = False!
      Flag clears and display is restored to Candidate model.
    """
    weekly_profiles = [
        # (cand_actual, cand_pred, base_actual, base_pred) for 28 daily steps
        ("healthy", 0.18, 0.25),
        ("drift_w1", 0.35, 0.25),
        ("drift_w2", 0.38, 0.25),
        ("drift_w3", 0.40, 0.24),
        ("recovered", 0.20, 0.26),
    ]

    results: list[DriftCheckResult] = []
    prior_consecutive = 0
    start_date = dt.date(2026, 6, 1)

    for week_idx, (_, target_cand_wape, target_base_wape) in enumerate(weekly_profiles):
        eval_date = start_date + dt.timedelta(weeks=week_idx + 1)
        # Generate 28 points matching target WAPE
        cand_points: list[ForecastAccuracyPoint] = []
        base_points: list[ForecastAccuracyPoint] = []

        for d in range(28):
            pdate = eval_date - dt.timedelta(days=27 - d)
            actual = 100.0
            # error distributed across days
            cand_pred = actual * (1.0 + target_cand_wape * (1 if d % 2 == 0 else -1))
            base_pred = actual * (1.0 + target_base_wape * (1 if d % 2 == 0 else -1))

            cand_points.append(
                ForecastAccuracyPoint(
                    forecast_date=pdate,
                    predicted_units=cand_pred,
                    actual_units=actual,
                    model_name=candidate_model_name,
                    lower_80=actual * 0.8,
                    upper_80=actual * 1.2,
                )
            )
            base_points.append(
                ForecastAccuracyPoint(
                    forecast_date=pdate,
                    predicted_units=base_pred,
                    actual_units=actual,
                    model_name=baseline_model_name,
                    lower_80=actual * 0.75,
                    upper_80=actual * 1.25,
                )
            )

        res = evaluate_drift(
            candidate_points=cand_points,
            baseline_points=base_points,
            prior_consecutive_drift_weeks=prior_consecutive,
            threshold=threshold,
            min_consecutive_weeks=2,
            candidate_model_name=candidate_model_name,
            baseline_model_name=baseline_model_name,
            window_days=28,
            as_of_date=eval_date,
        )
        results.append(res)
        prior_consecutive = res.consecutive_drift_weeks

    return results
