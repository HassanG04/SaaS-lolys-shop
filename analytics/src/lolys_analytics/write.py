"""Database persistence for forecast runs, predictions, and metrics.

Writes through analytics_writer restricted role (ADR-0003, analytics-plan.md).
Guarantees:
1. Idempotent per day: rerunning on the same day replaces rather than duplicates.
2. Atomic transactional write: a failed validation or query writes nothing.
3. Zero personal data exposure: operates purely on aggregate time-series.
"""

from __future__ import annotations

import datetime as dt
import json
import logging
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ForecastRecord:
    series_type: str  # 'shop', 'category', 'product'
    series_id: int | None
    forecast_date: dt.date
    horizon_step: int
    predicted_units: float
    predicted_revenue: float
    lower_80: float
    upper_80: float
    model_name: str


@dataclass(frozen=True)
class MetricRecord:
    series_type: str
    series_id: int | None
    model_name: str
    fold: int
    wape: float
    mase: float | None = None
    pinball_loss: float | None = None
    bias: float | None = None
    is_selected: bool = False


@dataclass
class ForecastRunPayload:
    run_date: dt.date
    git_commit: str
    model_version: str
    input_hash: str
    notes: dict[str, Any]
    forecasts: list[ForecastRecord]
    metrics: list[MetricRecord]


def validate_records_before_write(payload: ForecastRunPayload) -> None:
    """Strictly assert database-level constraints before opening transaction.

    Ensures that a failed validation writes nothing.
    """
    if not payload.forecasts:
        raise ValueError("Cannot write empty forecast list to database.")

    for i, fc in enumerate(payload.forecasts):
        if fc.series_type not in ("shop", "category", "product"):
            raise ValueError(f"Invalid series_type '{fc.series_type}' at forecast index {i}")
        if fc.horizon_step < 1:
            raise ValueError(f"Horizon step must be >= 1 at forecast index {i}")
        if fc.predicted_units < 0:
            raise ValueError(
                f"Negative predicted units ({fc.predicted_units}) at forecast index {i}"
            )
        if fc.predicted_revenue < 0:
            raise ValueError(
                f"Negative predicted revenue ({fc.predicted_revenue}) at forecast index {i}"
            )
        if fc.lower_80 < 0:
            raise ValueError(f"Negative lower_80 bound ({fc.lower_80}) at forecast index {i}")
        if fc.upper_80 < fc.lower_80:
            raise ValueError(
                f"upper_80 ({fc.upper_80}) < lower_80 ({fc.lower_80}) at forecast index {i}"
            )

    for j, m in enumerate(payload.metrics):
        if m.series_type not in ("shop", "category", "product"):
            raise ValueError(f"Invalid series_type '{m.series_type}' at metric index {j}")
        if m.wape < 0:
            raise ValueError(f"Negative WAPE ({m.wape}) at metric index {j}")


def write_forecast_run(
    conn: Any,
    payload: ForecastRunPayload,
    replace_date: dt.date | None = None,
) -> int:
    """Atomically and idempotently persist a forecast run and its predictions.

    If an existing run exists for the target date, it is deleted (cascading
    to previous forecasts and metrics) to guarantee idempotency.
    If validation fails or any error occurs, the transaction rolls back completely.
    """
    # 1. Pre-write validation - fails fast before any DB mutation
    validate_records_before_write(payload)

    target_date = replace_date or payload.run_date
    run_timestamp = dt.datetime.combine(target_date, dt.time(12, 0, 0), tzinfo=dt.UTC)
    notes_json = (
        json.dumps(payload.notes) if isinstance(payload.notes, dict) else str(payload.notes)
    )

    try:
        with conn.cursor() as cur:
            # 2. Idempotency: remove previous run for the same date (cascades)
            delete_sql = "DELETE FROM analytics.forecast_runs WHERE run_at::date = %s;"
            cur.execute(delete_sql, (target_date,))

            # 3. Insert new forecast_runs record
            insert_run_sql = """
                INSERT INTO analytics.forecast_runs (
                    run_at, git_commit, model_version, input_hash, notes, status
                ) VALUES (%s, %s, %s, %s, %s, 'completed')
                RETURNING id;
            """
            cur.execute(
                insert_run_sql,
                (
                    run_timestamp,
                    payload.git_commit,
                    payload.model_version,
                    payload.input_hash,
                    notes_json,
                    "completed",
                ),
            )
            ret = cur.fetchone()
            if isinstance(ret, dict):
                run_id = int(ret["id"])
            elif isinstance(ret, (list, tuple)):
                run_id = int(ret[0])
            else:
                raise RuntimeError("Failed to obtain inserted run_id from database")

            # 4. Insert sales_forecasts in batch
            insert_forecast_sql = """
                INSERT INTO analytics.sales_forecasts (
                    run_id, series_type, series_id, forecast_date, horizon_step,
                    predicted_units, predicted_revenue, lower_80, upper_80, model_name
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
            """
            for fc in payload.forecasts:
                cur.execute(
                    insert_forecast_sql,
                    (
                        run_id,
                        fc.series_type,
                        fc.series_id,
                        fc.forecast_date,
                        fc.horizon_step,
                        round(float(fc.predicted_units), 2),
                        round(float(fc.predicted_revenue), 2),
                        round(float(fc.lower_80), 2),
                        round(float(fc.upper_80), 2),
                        fc.model_name,
                    ),
                )

            # 5. Insert forecast_metrics in batch
            insert_metric_sql = """
                INSERT INTO analytics.forecast_metrics (
                    run_id, series_type, series_id, model_name, fold,
                    wape, mase, pinball_loss, bias, is_selected
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
            """
            for m in payload.metrics:
                cur.execute(
                    insert_metric_sql,
                    (
                        run_id,
                        m.series_type,
                        m.series_id,
                        m.model_name,
                        m.fold,
                        round(float(m.wape), 4),
                        round(float(m.mase), 4) if m.mase is not None else None,
                        round(float(m.pinball_loss), 4) if m.pinball_loss is not None else None,
                        round(float(m.bias), 4) if m.bias is not None else None,
                        m.is_selected,
                    ),
                )

        conn.commit()
        logger.info(
            f"Successfully recorded forecast run {run_id} ({len(payload.forecasts)} forecasts, "
            f"{len(payload.metrics)} metrics) for date {target_date}"
        )
        return run_id

    except Exception as e:
        conn.rollback()
        logger.error(f"Database write failed, rolled back completely: {e}")
        raise
