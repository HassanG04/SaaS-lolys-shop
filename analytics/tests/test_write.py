"""Unit and integration tests for database writes, idempotency, and forecast pipeline."""

from __future__ import annotations

import datetime as dt
import os
import unittest

from lolys_analytics.config import load_config
from lolys_analytics.db import (
    MockAnalyticsDb,
    enforce_tls_in_url,
    fetch_calendar,
    fetch_sales_daily,
    fetch_stock_daily,
    get_db_url,
)
from lolys_analytics.forecast import compute_input_hash, get_git_commit_sha, run_forecast_pipeline
from lolys_analytics.synthetic import (
    DailySalesRecord,
    generate_synthetic_data,
)
from lolys_analytics.write import (
    ForecastRecord,
    ForecastRunPayload,
    MetricRecord,
    validate_records_before_write,
    write_forecast_run,
)


class TestDatabaseConnectionAndTLS(unittest.TestCase):
    def test_enforce_tls_adds_sslmode_require_for_remote_hosts(self) -> None:
        raw_url = "postgresql://user:pass@project.pooler.supabase.com:6543/postgres"
        secured = enforce_tls_in_url(raw_url)
        self.assertIn("sslmode=require", secured)

    def test_enforce_tls_exempts_localhost_and_127(self) -> None:
        local_url = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
        secured = enforce_tls_in_url(local_url)
        self.assertEqual(secured, local_url)

    def test_get_db_url_environment_resolution(self) -> None:
        old_staging = os.environ.get("ANALYTICS_DB_URL_STAGING")
        old_prod = os.environ.get("ANALYTICS_DB_URL_PRODUCTION")
        try:
            os.environ["ANALYTICS_DB_URL_STAGING"] = "postgresql://staging:pw@host/db"
            os.environ["ANALYTICS_DB_URL_PRODUCTION"] = "postgresql://prod:pw@host/db"

            self.assertEqual(get_db_url(env="staging"), "postgresql://staging:pw@host/db")
            self.assertEqual(get_db_url(env="production"), "postgresql://prod:pw@host/db")
            self.assertEqual(
                get_db_url(custom_url="postgresql://custom:pw@host/db"),
                "postgresql://custom:pw@host/db",
            )
        finally:
            if old_staging is not None:
                os.environ["ANALYTICS_DB_URL_STAGING"] = old_staging
            else:
                os.environ.pop("ANALYTICS_DB_URL_STAGING", None)
            if old_prod is not None:
                os.environ["ANALYTICS_DB_URL_PRODUCTION"] = old_prod
            else:
                os.environ.pop("ANALYTICS_DB_URL_PRODUCTION", None)

    def test_mock_db_fetches(self) -> None:
        db = MockAnalyticsDb()
        db.sales_daily = [{"day": dt.date(2026, 10, 1), "product_id": 1, "units": 5}]
        db.stock_daily = [{"day": dt.date(2026, 10, 1), "product_id": 1, "closing_stock": 20}]
        db.calendar = [{"day": dt.date(2026, 10, 1), "ramadan": False}]

        self.assertEqual(len(fetch_sales_daily(db)), 1)
        self.assertEqual(len(fetch_stock_daily(db)), 1)
        self.assertEqual(len(fetch_calendar(db)), 1)


class TestValidationBeforeWrite(unittest.TestCase):
    def setUp(self) -> None:
        self.valid_forecast = ForecastRecord(
            series_type="shop",
            series_id=None,
            forecast_date=dt.date(2026, 10, 15),
            horizon_step=1,
            predicted_units=10.0,
            predicted_revenue=1000.0,
            lower_80=5.0,
            upper_80=15.0,
            model_name="AutoTheta",
        )
        self.valid_metric = MetricRecord(
            series_type="shop",
            series_id=None,
            model_name="AutoTheta",
            fold=1,
            wape=0.35,
            is_selected=True,
        )

    def test_empty_forecast_raises(self) -> None:
        payload = ForecastRunPayload(
            run_date=dt.date(2026, 10, 14),
            git_commit="abcdef",
            model_version="v1.0",
            input_hash="1234",
            notes={},
            forecasts=[],
            metrics=[self.valid_metric],
        )
        with self.assertRaises(ValueError):
            validate_records_before_write(payload)

    def test_negative_units_raises(self) -> None:
        bad_fc = ForecastRecord(
            series_type="shop",
            series_id=None,
            forecast_date=dt.date(2026, 10, 15),
            horizon_step=1,
            predicted_units=-5.0,
            predicted_revenue=100.0,
            lower_80=0.0,
            upper_80=10.0,
            model_name="bad",
        )
        payload = ForecastRunPayload(
            run_date=dt.date(2026, 10, 14),
            git_commit="abcdef",
            model_version="v1.0",
            input_hash="1234",
            notes={},
            forecasts=[bad_fc],
            metrics=[],
        )
        with self.assertRaises(ValueError):
            validate_records_before_write(payload)

    def test_invalid_interval_order_raises(self) -> None:
        bad_fc = ForecastRecord(
            series_type="shop",
            series_id=None,
            forecast_date=dt.date(2026, 10, 15),
            horizon_step=1,
            predicted_units=10.0,
            predicted_revenue=100.0,
            lower_80=15.0,
            upper_80=5.0,  # upper < lower
            model_name="bad",
        )
        payload = ForecastRunPayload(
            run_date=dt.date(2026, 10, 14),
            git_commit="abcdef",
            model_version="v1.0",
            input_hash="1234",
            notes={},
            forecasts=[bad_fc],
            metrics=[],
        )
        with self.assertRaises(ValueError):
            validate_records_before_write(payload)


class TestIdempotencyAndWrites(unittest.TestCase):
    def test_atomic_write_and_cascade_idempotency(self) -> None:
        db = MockAnalyticsDb()
        target_date = dt.date(2026, 10, 14)

        fc1 = ForecastRecord(
            series_type="shop",
            series_id=None,
            forecast_date=dt.date(2026, 10, 15),
            horizon_step=1,
            predicted_units=12.0,
            predicted_revenue=1200.0,
            lower_80=8.0,
            upper_80=16.0,
            model_name="AutoTheta",
        )
        m1 = MetricRecord(
            series_type="shop",
            series_id=None,
            model_name="AutoTheta",
            fold=1,
            wape=0.32,
            is_selected=True,
        )
        payload1 = ForecastRunPayload(
            run_date=target_date,
            git_commit="commit_1",
            model_version="v1.0",
            input_hash="hash_1",
            notes={"run": 1},
            forecasts=[fc1],
            metrics=[m1],
        )

        # 1. First run on target_date
        run_id1 = write_forecast_run(db, payload1, replace_date=target_date)
        self.assertEqual(run_id1, 1)
        self.assertEqual(len(db.forecast_runs), 1)
        self.assertEqual(len(db.sales_forecasts), 1)
        self.assertEqual(len(db.forecast_metrics), 1)

        # 2. Re-run on the same day replaces rather than duplicates
        fc2 = ForecastRecord(
            series_type="shop",
            series_id=None,
            forecast_date=dt.date(2026, 10, 15),
            horizon_step=1,
            predicted_units=15.0,
            predicted_revenue=1500.0,
            lower_80=10.0,
            upper_80=20.0,
            model_name="AutoTheta",
        )
        m2 = MetricRecord(
            series_type="shop",
            series_id=None,
            model_name="AutoTheta",
            fold=1,
            wape=0.28,
            is_selected=True,
        )
        payload2 = ForecastRunPayload(
            run_date=target_date,
            git_commit="commit_2",
            model_version="v1.0",
            input_hash="hash_2",
            notes={"run": 2},
            forecasts=[fc2],
            metrics=[m2],
        )

        run_id2 = write_forecast_run(db, payload2, replace_date=target_date)
        self.assertEqual(run_id2, 2)
        # Verify replaced, NOT duplicated
        self.assertEqual(len(db.forecast_runs), 1)
        self.assertEqual(len(db.sales_forecasts), 1)
        self.assertEqual(len(db.forecast_metrics), 1)
        self.assertEqual(db.forecast_runs[0]["id"], 2)
        self.assertEqual(db.sales_forecasts[0]["predicted_units"], 15.0)

    def test_failed_validation_writes_nothing(self) -> None:
        db = MockAnalyticsDb()
        target_date = dt.date(2026, 10, 14)

        bad_fc = ForecastRecord(
            series_type="invalid_type",  # validation error!
            series_id=None,
            forecast_date=dt.date(2026, 10, 15),
            horizon_step=1,
            predicted_units=10.0,
            predicted_revenue=100.0,
            lower_80=5.0,
            upper_80=15.0,
            model_name="bad",
        )
        payload = ForecastRunPayload(
            run_date=target_date,
            git_commit="abc",
            model_version="v1.0",
            input_hash="123",
            notes={},
            forecasts=[bad_fc],
            metrics=[],
        )

        with self.assertRaises(ValueError):
            write_forecast_run(db, payload, replace_date=target_date)

        # Asserts that failed validation wrote NOTHING
        self.assertEqual(len(db.forecast_runs), 0)
        self.assertEqual(len(db.sales_forecasts), 0)
        self.assertEqual(len(db.forecast_metrics), 0)


class TestForecastPipelineEndToEnd(unittest.TestCase):
    def test_pipeline_on_synthetic_data(self) -> None:
        cfg = load_config()
        dataset = generate_synthetic_data(days=60, seed=42, config=cfg.synthetic)

        payload = run_forecast_pipeline(
            sales_rows=dataset.daily_sales,
            stock_rows=dataset.daily_stock,
            run_date=dt.date(2026, 10, 14),
            config=cfg,
        )

        self.assertGreater(len(payload.forecasts), 0)
        self.assertEqual(payload.run_date, dt.date(2026, 10, 14))
        self.assertIn("series_counts", payload.notes)
        self.assertIn("readiness_summary", payload.notes)

        # Validate that writing to mock DB succeeds
        db = MockAnalyticsDb()
        run_id = write_forecast_run(db, payload)
        self.assertEqual(run_id, 1)
        self.assertEqual(len(db.forecast_runs), 1)
        self.assertEqual(len(db.sales_forecasts), len(payload.forecasts))
        self.assertEqual(len(db.forecast_metrics), len(payload.metrics))

    def test_git_sha_and_hash_helpers(self) -> None:
        sha = get_git_commit_sha()
        self.assertIsInstance(sha, str)
        self.assertGreaterEqual(len(sha), 7)

        rows = [
            DailySalesRecord(
                day=dt.date(2026, 10, 1),
                product_id=1,
                category_id=1,
                units=10,
                revenue=100.0,
                orders=2,
                avg_discount_pct=0.0,
            )
        ]
        h1 = compute_input_hash(rows)
        h2 = compute_input_hash(rows)
        self.assertEqual(h1, h2)
        self.assertEqual(len(h1), 64)


if __name__ == "__main__":
    unittest.main()
