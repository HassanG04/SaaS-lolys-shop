"""Rolling-origin backtesting harness and evaluation metrics for Lolys' Analytics.

Per analytics-plan.md Section 6:
- Rolling-origin backtests: shop and category use 3 folds of 28 days;
  products use 4 folds of 4 weeks. No fold ever sees future data.
- Metrics:
  - WAPE: Weighted Absolute Percentage Error (shop and category primary metric).
  - MASE: Mean Absolute Scaled Error against seasonal naive (products primary metric).
  - Pinball loss: Conformal quantile pinball loss for 80% prediction intervals.
  - Bias: Mean signed error (tracks systematic over/under-forecasting).
  - Coverage: Percentage of actuals covered within the 80% band (target >= 70%).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from lolys_analytics.models.baselines import _extract_series


@dataclass(frozen=True)
class MetricSummary:
    """Strongly typed summary of forecast evaluation metrics."""

    wape: float
    mase: float
    pinball_loss: float
    bias: float
    coverage_80: float

    def to_dict(self) -> dict[str, float]:
        return {
            "wape": round(self.wape, 4),
            "mase": round(self.mase, 4),
            "pinball_loss": round(self.pinball_loss, 4),
            "bias": round(self.bias, 4),
            "coverage_80": round(self.coverage_80, 4),
        }


@dataclass(frozen=True)
class BacktestFold:
    """One rolling-origin backtest split with strict temporal isolation."""

    fold_idx: int
    train_series: list[float]
    test_series: list[float]
    train_end_idx: int
    test_end_idx: int


@dataclass(frozen=True)
class FoldEvaluation:
    """Evaluation metrics and predictions for a single backtest fold."""

    fold_idx: int
    metrics: MetricSummary
    predictions: list[float]
    actuals: list[float]
    lower_80: list[float]
    upper_80: list[float]


@dataclass(frozen=True)
class BacktestReport:
    """Comprehensive backtesting report across all rolling-origin folds."""

    model_name: str
    n_folds: int
    horizon: int
    mean_wape: float
    mean_mase: float
    mean_pinball_loss: float
    mean_bias: float
    mean_coverage_80: float
    fold_evaluations: list[FoldEvaluation]

    def to_markdown_table(self) -> str:
        """Renders an accessible Markdown table summarizing backtest performance."""
        lines = [
            f"### Backtest Report: `{self.model_name}` ({self.n_folds} folds, {self.horizon}-day horizon)",
            "",
            "| Fold | WAPE | MASE | Pinball Loss | Bias | 80% Coverage |",
            "|---|---|---|---|---|---|",
        ]
        for fe in self.fold_evaluations:
            m = fe.metrics
            lines.append(
                f"| Fold {fe.fold_idx + 1} | {m.wape:.2%} | {m.mase:.3f} | {m.pinball_loss:.3f} | {m.bias:+.2f} | {m.coverage_80:.1%} |"
            )
        lines.append(
            f"| **Mean** | **{self.mean_wape:.2%}** | **{self.mean_mase:.3f}** | **{self.mean_pinball_loss:.3f}** | **{self.mean_bias:+.2f}** | **{self.mean_coverage_80:.1%}** |"
        )
        return "\n".join(lines)


# ==============================================================================
# 1. Evaluation Metrics
# ==============================================================================


def calculate_wape(actuals: list[float], predictions: list[float]) -> float:
    """Calculates Weighted Absolute Percentage Error: sum(|y - y_hat|) / sum(y)."""
    if len(actuals) != len(predictions):
        raise ValueError("Actuals and predictions must have equal length.")
    if not actuals:
        return 0.0

    total_actual = sum(actuals)
    total_abs_error = sum(abs(a - p) for a, p in zip(actuals, predictions, strict=True))

    if total_actual == 0.0:
        return 0.0 if total_abs_error == 0.0 else 1.0

    return float(total_abs_error / total_actual)


def calculate_mase(
    actuals: list[float],
    predictions: list[float],
    train_history: list[float],
    seasonality: int = 7,
) -> float:
    """Calculates Mean Absolute Scaled Error against seasonal naive in-sample scale."""
    if len(actuals) != len(predictions):
        raise ValueError("Actuals and predictions must have equal length.")
    if not actuals:
        return 0.0

    h = len(actuals)
    mae = sum(abs(a - p) for a, p in zip(actuals, predictions, strict=True)) / h

    # In-sample seasonal naive scale
    n = len(train_history)
    m = min(seasonality, n - 1) if n > 1 else 1

    if n <= m:
        # Fallback to non-seasonal naive or mean difference
        scale = sum(abs(train_history[i] - train_history[i - 1]) for i in range(1, n)) / max(
            1, n - 1
        )
    else:
        scale = sum(abs(train_history[t] - train_history[t - m]) for t in range(m, n)) / (n - m)

    if scale == 0.0:
        return 0.0 if mae == 0.0 else 1.0

    return float(mae / scale)


def calculate_pinball_loss(
    actuals: list[float],
    lower_80: list[float],
    upper_80: list[float],
    alpha: float = 0.80,
) -> float:
    """Calculates average quantile pinball loss for the lower and upper bounds of 80% interval."""
    if not (len(actuals) == len(lower_80) == len(upper_80)):
        raise ValueError("Actuals and interval bounds must have equal length.")
    if not actuals:
        return 0.0

    # For an 80% interval, alpha = 0.80 -> 10th percentile and 90th percentile
    q_low = (1.0 - alpha) / 2.0  # 0.10
    q_high = 1.0 - q_low  # 0.90

    total_loss = 0.0
    for y, l_b, u_b in zip(actuals, lower_80, upper_80, strict=True):
        # Loss at lower quantile (q=0.10)
        e_low = y - l_b
        loss_low = max(q_low * e_low, (q_low - 1.0) * e_low)

        # Loss at upper quantile (q=0.90)
        e_high = y - u_b
        loss_high = max(q_high * e_high, (q_high - 1.0) * e_high)

        total_loss += (loss_low + loss_high) / 2.0

    return float(total_loss / len(actuals))


def calculate_bias(actuals: list[float], predictions: list[float]) -> float:
    """Calculates mean signed error: mean(predictions - actuals).

    Positive bias indicates systematic overforecasting; negative indicates underforecasting.
    """
    if len(actuals) != len(predictions):
        raise ValueError("Actuals and predictions must have equal length.")
    if not actuals:
        return 0.0
    return float(sum(p - a for a, p in zip(actuals, predictions, strict=True)) / len(actuals))


def calculate_coverage(
    actuals: list[float],
    lower_80: list[float],
    upper_80: list[float],
) -> float:
    """Calculates empirical coverage: fraction of actuals between lower and upper bounds."""
    if not (len(actuals) == len(lower_80) == len(upper_80)):
        raise ValueError("Actuals and interval bounds must have equal length.")
    if not actuals:
        return 0.0

    covered_count = sum(
        1 for y, l_b, u_b in zip(actuals, lower_80, upper_80, strict=True) if l_b <= y <= u_b
    )
    return float(covered_count / len(actuals))


def evaluate_forecast(
    actuals: list[float],
    predictions: list[float],
    train_history: list[float],
    lower_80: list[float] | None = None,
    upper_80: list[float] | None = None,
    seasonality: int = 7,
) -> MetricSummary:
    """Computes all four core analytics plan metrics plus interval coverage."""
    wape = calculate_wape(actuals, predictions)
    mase = calculate_mase(actuals, predictions, train_history, seasonality=seasonality)
    bias = calculate_bias(actuals, predictions)

    if lower_80 is not None and upper_80 is not None:
        pinball = calculate_pinball_loss(actuals, lower_80, upper_80, alpha=0.80)
        coverage = calculate_coverage(actuals, lower_80, upper_80)
    else:
        pinball = 0.0
        coverage = 1.0

    return MetricSummary(
        wape=wape,
        mase=mase,
        pinball_loss=pinball,
        bias=bias,
        coverage_80=coverage,
    )


# ==============================================================================
# 2. Rolling-Origin Splitter & Backtest Runner
# ==============================================================================


def create_rolling_origin_folds(
    data: list[Any],
    n_folds: int = 3,
    horizon: int = 28,
    step_size: int | None = None,
    min_train: int = 14,
) -> list[BacktestFold]:
    """Splits a series into n rolling-origin folds with STRICT temporal isolation.

    GUARANTEE OF ZERO FUTURE LEAKAGE:
    For fold k:
      - test_series spans [test_start, test_end] where test_end = test_start + horizon.
      - train_series spans [0, test_start].
      - No observation from test_start or later is EVER accessible in train_series.
    """
    series = _extract_series(data)
    n = len(series)
    step = step_size if step_size is not None else horizon

    min_required_len = (n_folds * step) + min_train
    if n < min_required_len:
        raise ValueError(
            f"Series length {n} is insufficient for {n_folds} folds of horizon {horizon}. "
            f"Minimum required is {min_required_len} observations."
        )

    folds: list[BacktestFold] = []
    for k in range(n_folds):
        # Oldest fold is k=0, newest fold is k=n_folds-1
        # Test start shifts forward in time by step
        test_start = n - ((n_folds - k) * step)
        test_end = test_start + horizon

        if test_end > n:
            raise ValueError(f"Fold {k} test end {test_end} exceeds series length {n}.")

        train_series = series[:test_start]
        test_series = series[test_start:test_end]

        # Verify temporal isolation assertion
        assert len(train_series) == test_start
        assert len(test_series) == horizon

        folds.append(
            BacktestFold(
                fold_idx=k,
                train_series=train_series,
                test_series=test_series,
                train_end_idx=test_start,
                test_end_idx=test_end,
            )
        )

    return folds


def run_backtest(
    data: list[Any],
    model: Any,
    n_folds: int = 3,
    horizon: int = 28,
    step_size: int | None = None,
    min_train: int = 14,
) -> BacktestReport:
    """Executes rolling-origin backtests and aggregates performance metrics."""
    folds = create_rolling_origin_folds(
        data=data,
        n_folds=n_folds,
        horizon=horizon,
        step_size=step_size,
        min_train=min_train,
    )
    evaluations: list[FoldEvaluation] = []

    model_name = getattr(model, "model_name", model.__class__.__name__)

    for fold in folds:
        # Fit model on training slice only
        model.fit(fold.train_series)
        forecast_res = model.predict(horizon=horizon)

        metrics = evaluate_forecast(
            actuals=fold.test_series,
            predictions=forecast_res.point_forecast,
            train_history=fold.train_series,
            lower_80=forecast_res.lower_80,
            upper_80=forecast_res.upper_80,
        )

        evaluations.append(
            FoldEvaluation(
                fold_idx=fold.fold_idx,
                metrics=metrics,
                predictions=forecast_res.point_forecast,
                actuals=fold.test_series,
                lower_80=forecast_res.lower_80,
                upper_80=forecast_res.upper_80,
            )
        )

    # Compute mean metrics across all folds
    mean_wape = sum(e.metrics.wape for e in evaluations) / len(evaluations)
    mean_mase = sum(e.metrics.mase for e in evaluations) / len(evaluations)
    mean_pinball = sum(e.metrics.pinball_loss for e in evaluations) / len(evaluations)
    mean_bias = sum(e.metrics.bias for e in evaluations) / len(evaluations)
    mean_cov = sum(e.metrics.coverage_80 for e in evaluations) / len(evaluations)

    return BacktestReport(
        model_name=model_name,
        n_folds=n_folds,
        horizon=horizon,
        mean_wape=mean_wape,
        mean_mase=mean_mase,
        mean_pinball_loss=mean_pinball,
        mean_bias=mean_bias,
        mean_coverage_80=mean_cov,
        fold_evaluations=evaluations,
    )
