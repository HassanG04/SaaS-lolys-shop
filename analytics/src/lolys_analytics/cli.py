"""Command-line interface for Lolys' Accessories & Home Analytics."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from lolys_analytics.accuracy import (
    ForecastAccuracyPoint,
    evaluate_drift,
    simulate_drift_and_recovery_timeline,
)
from lolys_analytics.config import load_config
from lolys_analytics.synthetic import apply_cleaning_rules, generate_synthetic_data


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="lolys-analytics",
        description="Lolys' Accessories & Home: Analytics and Sales Forecasting CLI",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Subcommand: info
    subparsers.add_parser(
        "info", help="Display current analytics configuration and readiness gates"
    )

    # Subcommand: generate-synthetic
    gen_parser = subparsers.add_parser(
        "generate-synthetic", help="Generate deterministic synthetic retail time-series"
    )
    gen_parser.add_argument("--days", type=int, default=180, help="Number of days to simulate")
    gen_parser.add_argument("--seed", type=int, default=42, help="Random generator seed")
    gen_parser.add_argument(
        "--output", type=str, default=None, help="Optional output JSON filepath"
    )

    # Subcommand: test-cleaning
    subparsers.add_parser(
        "test-cleaning",
        help="Run cleaning rules verification against deterministic synthetic data",
    )

    # Subcommand: calendar-check
    cal_parser = subparsers.add_parser(
        "calendar-check",
        help="Cross-check algorithmic calendar against committed official events table",
    )
    cal_parser.add_argument("--year", type=int, default=2026, help="Year to cross-check")

    # Subcommand: backtest
    bt_parser = subparsers.add_parser(
        "backtest",
        help="Run rolling-origin backtest on synthetic data",
    )
    bt_parser.add_argument(
        "--model",
        type=str,
        default="seasonal_naive",
        choices=[
            "seasonal_naive",
            "moving_average_28",
            "auto_ets",
            "auto_theta",
            "croston_sba",
            "tsb",
            "adida",
            "lightgbm",
        ],
        help="Forecasting model to backtest",
    )
    bt_parser.add_argument("--folds", type=int, default=3, help="Number of rolling-origin folds")
    bt_parser.add_argument("--horizon", type=int, default=28, help="Forecast horizon (days)")
    bt_parser.add_argument("--seed", type=int, default=42, help="Random seed for synthetic data")

    # Subcommand: run
    run_parser = subparsers.add_parser(
        "run",
        help="Execute weekly forecast pipeline and write to database",
    )
    run_parser.add_argument(
        "--env",
        type=str,
        default="staging",
        choices=["staging", "production"],
        help="Target environment (staging or production)",
    )
    run_parser.add_argument(
        "--db-url",
        type=str,
        default=None,
        help="Optional database URL override",
    )
    run_parser.add_argument(
        "--synthetic",
        action="store_true",
        help="Use synthetic dataset for staging or testing",
    )
    run_parser.add_argument(
        "--days",
        type=int,
        default=180,
        help="Days of history to simulate when using --synthetic",
    )
    run_parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed when using --synthetic",
    )
    run_parser.add_argument(
        "--date",
        type=str,
        default=None,
        help="Optional target date in YYYY-MM-DD format (defaults to current UTC date)",
    )
    run_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Execute pipeline and output validation without writing to database",
    )

    # Subcommand: check-drift
    drift_parser = subparsers.add_parser(
        "check-drift",
        help="Evaluate 4-week rolling accuracy and drift alerts",
    )
    drift_parser.add_argument(
        "--env",
        type=str,
        default="staging",
        choices=["staging", "production"],
        help="Target environment (staging or production)",
    )
    drift_parser.add_argument(
        "--db-url",
        type=str,
        default=None,
        help="Optional database URL override",
    )
    drift_parser.add_argument(
        "--simulate",
        action="store_true",
        help="Run simulated multi-week drift and recovery lifecycle",
    )

    args = parser.parse_args(argv)
    config = load_config()

    if args.command == "info":
        print("=== Lolys Analytics Configuration ===")
        print(
            f"Shop Readiness: {config.gates.shop_min_days} days / {config.gates.shop_min_orders} orders"
        )
        print(
            f"Category Readiness: {config.gates.category_min_days} days / {config.gates.category_min_units} units"
        )
        print(
            f"Product Readiness: {config.gates.product_min_weeks} weeks / {config.gates.product_min_nonzero_weeks} non-zero weeks"
        )
        print(
            f"Reorder Lead Time: {config.reorder.default_lead_time_days} days (Z={config.reorder.default_service_z})"
        )
        print(f"Winsorize Percentile: {config.cleaning.winsorize_percentile * 100}%")
        return 0

    if args.command == "generate-synthetic":
        print(f"Generating synthetic data: {args.days} days, seed={args.seed}...")
        dataset = generate_synthetic_data(days=args.days, seed=args.seed, config=config.synthetic)
        print(f"Total simulated orders: {dataset.summary['total_orders']}")
        print(f"Daily sales rows: {dataset.summary['valid_sales_rows']}")
        print(f"Outlier orders: {dataset.summary['outlier_orders_count']}")
        print(f"Stockout events: {dataset.summary['stockout_events_count']}")

        if args.output:
            out_path = Path(args.output)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(dataset.to_dict(), f, indent=2)
            print(f"Saved dataset to {out_path}")
        return 0

    if args.command == "test-cleaning":
        print("Testing cleaning rules against synthetic dataset...")
        dataset = generate_synthetic_data(days=180, seed=42, config=config.synthetic)
        results = apply_cleaning_rules(dataset, config.cleaning)
        print(f"Raw orders: {results['total_raw_orders']}")
        print(f"Excluded sales orders: {results['excluded_sales_orders']}")
        print(f"Poisoned accounts detected: {len(results['poisoned_accounts_detected'])}")
        print(f"Winsorize clipped points: {results['winsorize_clipped_points']}")
        print(f"Stockout days flagged: {results['stockout_days_flagged']}")
        return 0

    if args.command == "calendar-check":
        from lolys_analytics.calendar import cross_check_events

        print(f"Cross-checking calendar events for {args.year} against official table...")
        report = cross_check_events(args.year)
        for ev, data in report.items():
            align_str = "ALIGNED" if data["aligned"] else "MISALIGNED"
            delta = data.get("delta_start_days", 0)
            print(f"  [{align_str}] {ev}: official={data['official']} delta={delta}d")
        return 0

    if args.command == "backtest":
        from lolys_analytics.backtest import run_backtest
        from lolys_analytics.models.baselines import MovingAverage28Model, SeasonalNaiveModel
        from lolys_analytics.models.gbm import LightGBMDirectModel
        from lolys_analytics.models.intermittent import ADIDAModel, CrostonSBAModel, TSBModel
        from lolys_analytics.models.statistical import AutoETSModel, AutoThetaModel

        print(
            f"Running rolling-origin backtest ({args.model}, {args.folds} folds, {args.horizon}d horizon)..."
        )
        dataset = generate_synthetic_data(days=180, seed=args.seed, config=config.synthetic)

        # Aggregate product sales to daily shop total
        day_totals: dict[str, float] = {}
        for row in dataset.daily_sales:
            day_str = row.day.isoformat()
            day_totals[day_str] = day_totals.get(day_str, 0.0) + float(row.units)

        daily_units = [day_totals[d] for d in sorted(day_totals.keys())]

        models_map: dict[str, Any] = {
            "seasonal_naive": SeasonalNaiveModel(seasonality=7),
            "moving_average_28": MovingAverage28Model(window=28),
            "auto_ets": AutoETSModel(seasonality=7),
            "auto_theta": AutoThetaModel(seasonality=7),
            "croston_sba": CrostonSBAModel(),
            "tsb": TSBModel(),
            "adida": ADIDAModel(),
            "lightgbm": LightGBMDirectModel(),
        }
        model = models_map[args.model]
        report = run_backtest(daily_units, model, n_folds=args.folds, horizon=args.horizon)
        print(report.to_markdown_table())
        return 0

    if args.command == "run":
        import datetime as dt

        from lolys_analytics import db
        from lolys_analytics.forecast import run_forecast_pipeline
        from lolys_analytics.synthetic import DailySalesRecord, DailyStockRecord
        from lolys_analytics.write import write_forecast_run

        target_date = (
            dt.date.fromisoformat(args.date) if args.date else dt.datetime.now(dt.UTC).date()
        )

        print(
            f"[ANALYTICS] Starting weekly forecast workflow (env={args.env}, "
            f"synthetic={args.synthetic}, date={target_date})"
        )

        if args.synthetic:
            print(f"[ANALYTICS] Generating {args.days}d synthetic dataset (seed={args.seed})...")
            dataset = generate_synthetic_data(
                days=args.days, seed=args.seed, config=config.synthetic
            )
            sales_rows = dataset.daily_sales
            stock_rows = dataset.daily_stock
        else:
            print(f"[ANALYTICS] Connecting to {args.env} database...")
            conn = db.connect(db_url=args.db_url, env=args.env)
            try:
                sales_raw = db.fetch_sales_daily(conn)
                stock_raw = db.fetch_stock_daily(conn)
                acc_raw = db.fetch_forecast_accuracy(conn, series_type="shop")
                past_runs = db.fetch_past_forecast_runs(conn, limit=5)
            finally:
                conn.close()

            if not sales_raw:
                print("[ANALYTICS] No sales data found in database (ANL-001). Exiting cleanly.")
                return 0

            sales_rows = [
                DailySalesRecord(
                    day=(
                        r["day"]
                        if isinstance(r["day"], dt.date)
                        else dt.date.fromisoformat(str(r["day"]))
                    ),
                    product_id=int(r["product_id"]),
                    category_id=int(r["category_id"]),
                    units=int(r["units"]),
                    revenue=float(r["revenue"]),
                    orders=int(r["orders"]),
                    avg_discount_pct=float(r.get("avg_discount_pct", 0.0)),
                )
                for r in sales_raw
            ]
            stock_rows = [
                DailyStockRecord(
                    day=(
                        r["day"]
                        if isinstance(r["day"], dt.date)
                        else dt.date.fromisoformat(str(r["day"]))
                    ),
                    product_id=int(r["product_id"]),
                    closing_stock=int(r["closing_stock"]),
                    stockout_flag=bool(r["stockout_flag"]),
                )
                for r in stock_raw
            ]

        drift_status = None
        if not args.synthetic and acc_raw:
            cand_pts = [
                ForecastAccuracyPoint(
                    forecast_date=(
                        r["forecast_date"]
                        if isinstance(r["forecast_date"], dt.date)
                        else dt.date.fromisoformat(str(r["forecast_date"]))
                    ),
                    predicted_units=float(r["predicted_units"]),
                    actual_units=float(r["actual_units"]),
                    model_name=r["model_name"],
                    lower_80=0.0,
                    upper_80=float(r["predicted_units"]) * 2.0,
                )
                for r in acc_raw
                if r["model_name"] != "SeasonalNaive"
            ]
            base_pts = [
                ForecastAccuracyPoint(
                    forecast_date=(
                        r["forecast_date"]
                        if isinstance(r["forecast_date"], dt.date)
                        else dt.date.fromisoformat(str(r["forecast_date"]))
                    ),
                    predicted_units=float(r["predicted_units"]),
                    actual_units=float(r["actual_units"]),
                    model_name="SeasonalNaive",
                    lower_80=0.0,
                    upper_80=float(r["predicted_units"]) * 2.0,
                )
                for r in acc_raw
                if r["model_name"] == "SeasonalNaive"
            ]
            prior_consecutive = 0
            if past_runs and isinstance(past_runs[0].get("notes"), dict):
                prior_consecutive = int(
                    past_runs[0]["notes"].get("drift_details", {}).get("consecutive_drift_weeks", 0)
                )

            if cand_pts and base_pts:
                drift_status = evaluate_drift(
                    candidate_points=cand_pts,
                    baseline_points=base_pts,
                    prior_consecutive_drift_weeks=prior_consecutive,
                    threshold=config.monitoring.drift_relative_wape_threshold,
                    min_consecutive_weeks=config.monitoring.consecutive_drift_weeks_to_alert,
                    window_days=config.monitoring.rolling_window_days,
                    as_of_date=target_date,
                )
                if drift_status.drift_alert:
                    print(f"[ANALYTICS] WARNING: {drift_status.message_en}")

        print(f"[ANALYTICS] Loaded {len(sales_rows)} sales records across shop.")
        print(
            "[ANALYTICS] Running model selection, readiness gates, and hierarchical reconciliation..."
        )
        payload = run_forecast_pipeline(
            sales_rows=sales_rows,
            stock_rows=stock_rows,
            run_date=target_date,
            config=config,
            drift_status=drift_status,
        )

        print(
            f"[ANALYTICS] Forecast run assembled: {len(payload.forecasts)} forecasts, "
            f"{len(payload.metrics)} metrics."
        )
        print(f"[ANALYTICS] Series summary: {payload.notes.get('series_counts', {})}")
        print(f"[ANALYTICS] Readiness summary: {payload.notes.get('readiness_summary', {})}")
        if payload.notes.get("drift_alert"):
            print(
                f"[ANALYTICS] ALERT: Drift active. Display fallback model is "
                f"{payload.notes.get('drift_details', {}).get('active_display_model', 'SeasonalNaive')}."
            )

        if args.dry_run:
            print("[ANALYTICS] Dry run complete. Database write skipped.")
            return 0

        print(f"[ANALYTICS] Writing forecast run to database for date {target_date}...")
        conn = db.connect(db_url=args.db_url, env=args.env)
        try:
            run_id = write_forecast_run(conn, payload, replace_date=target_date)
            print(
                f"[ANALYTICS] Completed successfully: run_id={run_id} written to analytics.forecast_runs."
            )
        finally:
            conn.close()
        return 0

    if args.command == "check-drift":
        if args.simulate:
            print("[ANALYTICS] Running simulated multi-week drift and recovery timeline...")
            results = simulate_drift_and_recovery_timeline()
            header = f"{'Week':<6} | {'Model WAPE':<10} | {'Base WAPE':<10} | {'Ratio':<8} | {'Streak':<6} | {'Alert':<6} | {'Display Model':<15}"
            print(header)
            print("-" * len(header))
            for i, r in enumerate(results, start=1):
                print(
                    f"{i:<6} | {r.model_wape:<10.2%} | {r.baseline_wape:<10.2%} | {r.relative_ratio:<8.2f} | {r.consecutive_drift_weeks:<6} | {str(r.drift_alert):<6} | {r.active_display_model:<15}"
                )
            print("\n[ANALYTICS] Simulation finished.")
            return 0

        print(f"[ANALYTICS] Querying forecast accuracy from {args.env} database...")
        from lolys_analytics import db

        conn = db.connect(db_url=args.db_url, env=args.env)
        try:
            acc_raw = db.fetch_forecast_accuracy(conn, series_type="shop")
            past_runs = db.fetch_past_forecast_runs(conn, limit=5)
        finally:
            conn.close()

        cand_pts = [
            ForecastAccuracyPoint(
                forecast_date=(
                    r["forecast_date"]
                    if isinstance(r["forecast_date"], dt.date)
                    else dt.date.fromisoformat(str(r["forecast_date"]))
                ),
                predicted_units=float(r["predicted_units"]),
                actual_units=float(r["actual_units"]),
                model_name=r["model_name"],
            )
            for r in acc_raw
            if r["model_name"] != "SeasonalNaive"
        ]
        base_pts = [
            ForecastAccuracyPoint(
                forecast_date=(
                    r["forecast_date"]
                    if isinstance(r["forecast_date"], dt.date)
                    else dt.date.fromisoformat(str(r["forecast_date"]))
                ),
                predicted_units=float(r["predicted_units"]),
                actual_units=float(r["actual_units"]),
                model_name="SeasonalNaive",
            )
            for r in acc_raw
            if r["model_name"] == "SeasonalNaive"
        ]

        prior_consecutive = 0
        if past_runs and isinstance(past_runs[0].get("notes"), dict):
            prior_consecutive = int(
                past_runs[0]["notes"].get("drift_details", {}).get("consecutive_drift_weeks", 0)
            )

        if not cand_pts or not base_pts:
            print("[ANALYTICS] Insufficient accuracy observations to evaluate drift.")
            return 0

        res = evaluate_drift(
            candidate_points=cand_pts,
            baseline_points=base_pts,
            prior_consecutive_drift_weeks=prior_consecutive,
            threshold=config.monitoring.drift_relative_wape_threshold,
            min_consecutive_weeks=config.monitoring.consecutive_drift_weeks_to_alert,
            window_days=config.monitoring.rolling_window_days,
        )
        print(f"[ANALYTICS] Candidate Model WAPE: {res.model_wape:.2%}")
        print(f"[ANALYTICS] Baseline Model WAPE:  {res.baseline_wape:.2%}")
        print(
            f"[ANALYTICS] Relative Ratio:       {res.relative_ratio:.2f} (threshold: {1.0 + res.threshold:.2f})"
        )
        print(f"[ANALYTICS] Consecutive Weeks:    {res.consecutive_drift_weeks}")
        print(f"[ANALYTICS] Drift Alert:          {res.drift_alert}")
        print(f"[ANALYTICS] Active Display Model: {res.active_display_model}")
        print(f"[ANALYTICS] Admin Notice:         {res.message_ar}")
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
