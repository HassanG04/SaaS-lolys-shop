"""Database connectivity and query helpers for Lolys' Analytics.

Connects to PostgreSQL using TLS-enforced restricted roles (analytics_reader,
analytics_writer) per ADR-0003 and analytics-plan.md Section 10.
Zero access to public tables, zero personal data exposure (Scenario S31).
"""

from __future__ import annotations

import os
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

try:
    import psycopg
    from psycopg.rows import dict_row

    HAS_PSYCOPG = True
except ImportError:  # pragma: no cover
    HAS_PSYCOPG = False
    dict_row = None  # type: ignore[assignment]


def get_db_url(env: str = "staging", custom_url: str | None = None) -> str:
    """Resolve database connection string for target environment.

    Checks ANALYTICS_DB_URL_STAGING, ANALYTICS_DB_URL_PRODUCTION,
    or generic ANALYTICS_DB_URL.
    """
    if custom_url:
        return custom_url

    env_normalized = env.strip().lower()
    if env_normalized in ("prod", "production"):
        url = os.environ.get("ANALYTICS_DB_URL_PRODUCTION") or os.environ.get("ANALYTICS_DB_URL")
        key_name = "ANALYTICS_DB_URL_PRODUCTION"
    else:
        url = os.environ.get("ANALYTICS_DB_URL_STAGING") or os.environ.get("ANALYTICS_DB_URL")
        key_name = "ANALYTICS_DB_URL_STAGING"

    if not url:
        raise ValueError(
            f"Missing database connection URL for environment '{env}'. "
            f"Set {key_name} or pass explicit connection string."
        )
    return url


def enforce_tls_in_url(db_url: str) -> str:
    """Ensure remote connections enforce TLS (sslmode=require) per ADR-0003."""
    parsed = urlparse(db_url)
    hostname = (parsed.hostname or "").lower()

    # Local development / container endpoints exempt from mandatory SSL
    if hostname in ("localhost", "127.0.0.1", "::1", "db", "postgres"):
        return db_url

    query_params = parse_qs(parsed.query)
    sslmode = query_params.get("sslmode", [None])[0]
    if not sslmode or sslmode == "disable":
        query_params["sslmode"] = ["require"]
        new_query = urlencode(query_params, doseq=True)
        return urlunparse(
            (
                parsed.scheme,
                parsed.netloc,
                parsed.path,
                parsed.params,
                new_query,
                parsed.fragment,
            )
        )
    return db_url


def connect(
    db_url: str | None = None,
    env: str = "staging",
) -> Any:
    """Open a TLS-enforced database connection using psycopg."""
    if not HAS_PSYCOPG:
        raise RuntimeError("psycopg is not installed. Please install psycopg[binary]>=3.1.0.")

    target_url = get_db_url(env=env, custom_url=db_url)
    secure_url = enforce_tls_in_url(target_url)

    # autocommit=False ensures transactions for write rollback safety
    conn = psycopg.connect(secure_url, row_factory=dict_row, autocommit=False)
    return conn


def fetch_sales_daily(conn: Any) -> list[dict[str, Any]]:
    """Query aggregate sales from analytics.sales_daily view (analytics_reader role).

    Zero personal data: aggregates only by day, product_id, and category_id.
    """
    query = """
        SELECT
            day,
            product_id,
            category_id,
            units,
            revenue,
            orders,
            avg_discount_pct
        FROM analytics.sales_daily
        ORDER BY day ASC, product_id ASC;
    """
    with conn.cursor() as cur:
        cur.execute(query)
        rows = cur.fetchall()
        return [dict(r) for r in rows]


def fetch_stock_daily(conn: Any) -> list[dict[str, Any]]:
    """Query closing stock and stockout flags from analytics.stock_daily view."""
    query = """
        SELECT
            day,
            product_id,
            closing_stock,
            stockout_flag
        FROM analytics.stock_daily
        ORDER BY day ASC, product_id ASC;
    """
    with conn.cursor() as cur:
        cur.execute(query)
        rows = cur.fetchall()
        return [dict(r) for r in rows]


def fetch_calendar(conn: Any) -> list[dict[str, Any]]:
    """Query pre-computed events and dates from analytics.calendar table."""
    query = """
        SELECT
            day,
            ramadan,
            eid_fitr,
            eid_adha,
            mothers_day,
            valentines,
            black_friday,
            back_to_school,
            weekday
        FROM analytics.calendar
        ORDER BY day ASC;
    """
    with conn.cursor() as cur:
        cur.execute(query)
        rows = cur.fetchall()
        return [dict(r) for r in rows]


def fetch_forecast_accuracy(
    conn: Any,
    series_type: str = "shop",
    series_id: int | None = None,
    days: int = 28,
) -> list[dict[str, Any]]:
    """Query recent forecast accuracy records from analytics.forecast_accuracy view.

    Zero personal data (Scenario S31).
    """
    if series_id is not None:
        query = """
            SELECT
                run_id,
                series_type,
                series_id,
                forecast_date,
                horizon_step,
                model_name,
                predicted_units,
                actual_units,
                unit_error,
                absolute_error,
                predicted_revenue,
                actual_revenue,
                in_interval_80
            FROM analytics.forecast_accuracy
            WHERE series_type = %s AND series_id = %s
              AND forecast_date >= CURRENT_DATE - (%s || ' days')::interval
            ORDER BY forecast_date ASC;
        """
        params: tuple[Any, ...] = (series_type, series_id, days)
    else:
        query = """
            SELECT
                run_id,
                series_type,
                series_id,
                forecast_date,
                horizon_step,
                model_name,
                predicted_units,
                actual_units,
                unit_error,
                absolute_error,
                predicted_revenue,
                actual_revenue,
                in_interval_80
            FROM analytics.forecast_accuracy
            WHERE series_type = %s AND series_id IS NULL
              AND forecast_date >= CURRENT_DATE - (%s || ' days')::interval
            ORDER BY forecast_date ASC;
        """
        params = (series_type, days)

    with conn.cursor() as cur:
        cur.execute(query, params)
        rows = cur.fetchall()
        return [dict(r) for r in rows]


def fetch_past_forecast_runs(conn: Any, limit: int = 5) -> list[dict[str, Any]]:
    """Fetch recent completed forecast runs from analytics.forecast_runs."""
    query = """
        SELECT
            id,
            run_at,
            git_commit,
            model_version,
            notes,
            status
        FROM analytics.forecast_runs
        WHERE status = 'completed'
        ORDER BY run_at DESC
        LIMIT %s;
    """
    with conn.cursor() as cur:
        cur.execute(query, (limit,))
        rows = cur.fetchall()
        return [dict(r) for r in rows]


class MockCursor:
    """Mock database cursor for testing without a live Postgres instance."""

    def __init__(self, db: MockAnalyticsDb) -> None:
        self.db = db
        self._last_result: list[dict[str, Any]] = []

    def execute(self, query: str, params: Any = None) -> None:
        self.db.execute_sql(query, params)

    def fetchall(self) -> list[dict[str, Any]]:
        return list(self.db.last_fetch)

    def fetchone(self) -> dict[str, Any] | None:
        return self.db.last_fetch[0] if self.db.last_fetch else None

    def __enter__(self) -> MockCursor:
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        pass


class MockAnalyticsDb:
    """In-memory mock database simulating analytics schema tables and transactions.

    Supports:
    - analytics.forecast_runs
    - analytics.sales_forecasts
    - analytics.forecast_metrics
    - Transactions with commit() and rollback()
    - Idempotent delete cascades
    """

    def __init__(self) -> None:
        self.forecast_runs: list[dict[str, Any]] = []
        self.sales_forecasts: list[dict[str, Any]] = []
        self.forecast_metrics: list[dict[str, Any]] = []
        self.sales_daily: list[dict[str, Any]] = []
        self.stock_daily: list[dict[str, Any]] = []
        self.calendar: list[dict[str, Any]] = []
        self.forecast_accuracy: list[dict[str, Any]] = []

        self._in_transaction = False
        self._next_run_id = 1
        self._uncommitted_runs: list[dict[str, Any]] = []
        self._uncommitted_forecasts: list[dict[str, Any]] = []
        self._uncommitted_metrics: list[dict[str, Any]] = []
        self.last_fetch: list[dict[str, Any]] = []
        self.autocommit = False

    def cursor(self) -> MockCursor:
        return MockCursor(self)

    def commit(self) -> None:
        self.forecast_runs.extend(self._uncommitted_runs)
        self.sales_forecasts.extend(self._uncommitted_forecasts)
        self.forecast_metrics.extend(self._uncommitted_metrics)
        self._uncommitted_runs.clear()
        self._uncommitted_forecasts.clear()
        self._uncommitted_metrics.clear()
        self._in_transaction = False

    def rollback(self) -> None:
        self._uncommitted_runs.clear()
        self._uncommitted_forecasts.clear()
        self._uncommitted_metrics.clear()
        self._in_transaction = False

    def close(self) -> None:
        pass

    def __enter__(self) -> MockAnalyticsDb:
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        if exc_type is not None:
            self.rollback()
        else:
            self.commit()

    def execute_sql(self, query: str, params: Any = None) -> None:
        q = query.strip()
        params = params or ()

        # 1. DELETE FROM analytics.forecast_runs WHERE run_at::date = %s
        if "DELETE FROM analytics.forecast_runs" in q:
            date_param = params[0] if params else None
            # Find run IDs matching the date
            matching_ids = {
                r["id"] for r in self.forecast_runs if str(r["run_at"]).startswith(str(date_param))
            }
            # Cascade delete in memory
            self.forecast_runs = [r for r in self.forecast_runs if r["id"] not in matching_ids]
            self.sales_forecasts = [
                f for f in self.sales_forecasts if f["run_id"] not in matching_ids
            ]
            self.forecast_metrics = [
                m for m in self.forecast_metrics if m["run_id"] not in matching_ids
            ]
            return

        # 2. INSERT INTO analytics.forecast_runs ... RETURNING id
        if "INSERT INTO analytics.forecast_runs" in q:
            run_id = self._next_run_id
            self._next_run_id += 1
            # Params: run_at, git_commit, model_version, input_hash, notes, status
            run_row = {
                "id": run_id,
                "run_at": params[0],
                "git_commit": params[1],
                "model_version": params[2],
                "input_hash": params[3],
                "notes": params[4],
                "status": params[5],
            }
            self._uncommitted_runs.append(run_row)
            self.last_fetch = [{"id": run_id}]
            return

        # 3. INSERT INTO analytics.sales_forecasts
        if "INSERT INTO analytics.sales_forecasts" in q:
            row = {
                "run_id": params[0],
                "series_type": params[1],
                "series_id": params[2],
                "forecast_date": params[3],
                "horizon_step": params[4],
                "predicted_units": params[5],
                "predicted_revenue": params[6],
                "lower_80": params[7],
                "upper_80": params[8],
                "model_name": params[9],
            }
            self._uncommitted_forecasts.append(row)
            return

        # 4. INSERT INTO analytics.forecast_metrics
        if "INSERT INTO analytics.forecast_metrics" in q:
            row = {
                "run_id": params[0],
                "series_type": params[1],
                "series_id": params[2],
                "model_name": params[3],
                "fold": params[4],
                "wape": params[5],
                "mase": params[6],
                "pinball_loss": params[7],
                "bias": params[8],
                "is_selected": params[9],
            }
            self._uncommitted_metrics.append(row)
            return

        # 5. SELECT from views
        if "FROM analytics.sales_daily" in q:
            self.last_fetch = self.sales_daily
            return
        if "FROM analytics.stock_daily" in q:
            self.last_fetch = self.stock_daily
            return
        if "FROM analytics.calendar" in q:
            self.last_fetch = self.calendar
            return
        if "FROM analytics.forecast_accuracy" in q:
            self.last_fetch = self.forecast_accuracy
            return
        if "FROM analytics.forecast_runs" in q:
            limit = params[0] if params else 5
            sorted_runs = sorted(self.forecast_runs, key=lambda r: str(r["run_at"]), reverse=True)
            self.last_fetch = sorted_runs[:limit]
            return
