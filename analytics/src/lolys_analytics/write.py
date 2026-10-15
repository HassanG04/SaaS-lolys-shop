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


def write_insights(
    conn: Any,
    basket_pairs: list[Any] | None = None,
    cohort_periods: list[Any] | None = None,
    customer_segments: list[Any] | None = None,
) -> None:
    """Atomically persist market basket, cohort retention, and customer segments.

    Operates under analytics_writer role.
    Clears or upserts insights atomically. If any error occurs, the entire
    transaction rolls back.
    """
    try:
        with conn.cursor() as cur:
            # 1. Basket Pairs
            if basket_pairs is not None:
                cur.execute("DELETE FROM analytics.basket_pairs;")
                if basket_pairs:
                    insert_basket_sql = """
                        INSERT INTO analytics.basket_pairs (
                            product_a_id, product_b_id, support, confidence, lift, sample_orders, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, NOW());
                    """
                    for bp in basket_pairs:
                        p_a = bp.product_a_id if hasattr(bp, "product_a_id") else bp["product_a_id"]
                        p_b = bp.product_b_id if hasattr(bp, "product_b_id") else bp["product_b_id"]
                        sup = bp.support if hasattr(bp, "support") else bp["support"]
                        conf = bp.confidence if hasattr(bp, "confidence") else bp["confidence"]
                        lift = bp.lift if hasattr(bp, "lift") else bp["lift"]
                        samp = (
                            bp.sample_orders
                            if hasattr(bp, "sample_orders")
                            else bp["sample_orders"]
                        )
                        if p_a > p_b:
                            p_a, p_b = p_b, p_a
                        cur.execute(
                            insert_basket_sql,
                            (
                                p_a,
                                p_b,
                                round(float(sup), 4),
                                round(float(conf), 4),
                                round(float(lift), 4),
                                int(samp),
                            ),
                        )

            # 2. Cohort Retention
            if cohort_periods is not None:
                if cohort_periods:
                    upsert_cohort_sql = """
                        INSERT INTO analytics.cohort_retention (
                            cohort_month, period_months, cohort_size, active_customers, retention_rate, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (cohort_month, period_months) DO UPDATE SET
                            cohort_size = EXCLUDED.cohort_size,
                            active_customers = EXCLUDED.active_customers,
                            retention_rate = EXCLUDED.retention_rate,
                            updated_at = NOW();
                    """
                    for cp in cohort_periods:
                        cm = cp.cohort_month if hasattr(cp, "cohort_month") else cp["cohort_month"]
                        pm = (
                            cp.period_months
                            if hasattr(cp, "period_months")
                            else cp["period_months"]
                        )
                        cs = cp.cohort_size if hasattr(cp, "cohort_size") else cp["cohort_size"]
                        ac = (
                            cp.active_customers
                            if hasattr(cp, "active_customers")
                            else cp["active_customers"]
                        )
                        rr = (
                            cp.retention_rate
                            if hasattr(cp, "retention_rate")
                            else cp["retention_rate"]
                        )
                        cur.execute(
                            upsert_cohort_sql,
                            (cm, int(pm), int(cs), int(ac), round(float(rr), 4)),
                        )

            # 3. Customer Segments
            if customer_segments is not None:
                cur.execute("DELETE FROM analytics.customer_segments;")
                if customer_segments:
                    insert_segment_sql = """
                        INSERT INTO analytics.customer_segments (
                            segment, customer_count, total_revenue, avg_order_value, updated_at
                        ) VALUES (%s, %s, %s, %s, NOW())
                        ON CONFLICT (segment) DO UPDATE SET
                            customer_count = EXCLUDED.customer_count,
                            total_revenue = EXCLUDED.total_revenue,
                            avg_order_value = EXCLUDED.avg_order_value,
                            updated_at = NOW();
                    """
                    for cs in customer_segments:
                        seg = cs.segment if hasattr(cs, "segment") else cs["segment"]
                        cnt = (
                            cs.customer_count
                            if hasattr(cs, "customer_count")
                            else cs["customer_count"]
                        )
                        rev = (
                            cs.total_revenue
                            if hasattr(cs, "total_revenue")
                            else cs["total_revenue"]
                        )
                        aov = (
                            cs.avg_order_value
                            if hasattr(cs, "avg_order_value")
                            else cs["avg_order_value"]
                        )
                        cur.execute(
                            insert_segment_sql,
                            (str(seg), int(cnt), round(float(rev), 2), round(float(aov), 2)),
                        )

        conn.commit()
        logger.info("Successfully updated analytics insights tables")
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to write analytics insights, rolled back: {e}")
        raise
