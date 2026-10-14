"""End-to-end forecasting pipeline for Lolys' Accessories & Home.

Coordinates data ingestion, cleaning, multi-level series construction,
readiness gates, model selection, hierarchical reconciliation,
output validation, and database preparation per analytics-plan.md.
Zero customer personal data used, processed, or logged (Scenario S31).
"""

from __future__ import annotations

import datetime as dt
import hashlib
import logging
import subprocess

from lolys_analytics.backtest import BacktestReport, run_backtest
from lolys_analytics.config import AnalyticsConfig, load_config
from lolys_analytics.models.baselines import (
    ForecastResult,
    MovingAverage28Model,
    SeasonalNaiveModel,
)
from lolys_analytics.models.gbm import LightGBMDirectModel
from lolys_analytics.models.intermittent import ADIDAModel, CrostonSBAModel, TSBModel
from lolys_analytics.models.statistical import AutoETSModel, AutoThetaModel
from lolys_analytics.select import (
    SeriesLevel,
    evaluate_readiness,
    reconcile_hierarchy,
    select_best_model,
    validate_forecast,
)
from lolys_analytics.synthetic import (
    DailySalesRecord,
    DailyStockRecord,
)
from lolys_analytics.write import ForecastRecord, ForecastRunPayload, MetricRecord

logger = logging.getLogger(__name__)


def get_git_commit_sha() -> str:
    """Retrieve current commit SHA from environment or git command."""
    import os

    sha = os.environ.get("GITHUB_SHA")
    if sha and len(sha) >= 7:
        return sha[:40]

    try:
        res = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            check=False,
            timeout=5,
        )
        if res.returncode == 0 and res.stdout.strip():
            return res.stdout.strip()[:40]
    except Exception:
        pass

    return "unknown_commit"


def compute_input_hash(sales_rows: list[DailySalesRecord]) -> str:
    """Compute deterministic SHA-256 hash of aggregate sales data."""
    hasher = hashlib.sha256()
    for row in sorted(sales_rows, key=lambda r: (r.day, r.product_id)):
        entry = f"{row.day.isoformat()}|{row.product_id}|{row.units}|{row.revenue}\n"
        hasher.update(entry.encode("utf-8"))
    return hasher.hexdigest()


def compute_n_folds(series_len: int, horizon: int, min_train: int = 14) -> int:
    """Calculate maximum rolling-origin folds supported by series length (up to 3)."""
    if series_len < horizon + min_train:
        return 0
    return min(3, (series_len - min_train) // horizon)


def run_forecast_pipeline(
    sales_rows: list[DailySalesRecord],
    stock_rows: list[DailyStockRecord] | None = None,
    run_date: dt.date | None = None,
    config: AnalyticsConfig | None = None,
) -> ForecastRunPayload:
    """Execute the full weekly forecasting pipeline.

    Steps:
    1. Clean and aggregate raw time series across shop, categories, and products.
    2. Evaluate readiness gates per series (ANL-001 / preliminary fallback).
    3. Run rolling-origin backtests and select best models enforcing 5% beat rule.
    4. Fit models and project forecasts with 80% conformal prediction intervals.
    5. Reconcile hierarchy bottom-up (shop matches sum of categories).
    6. Validate all forecasts against sanity rules (VAL-001..VAL-004).
    7. Assemble ForecastRunPayload ready for atomic database write.
    """
    cfg = config or load_config()
    target_date = run_date or dt.datetime.now(dt.UTC).date()
    stock_rows = stock_rows or []

    # 1. Clean sales rows (apply 99th percentile winsorisation on units)
    if not sales_rows:
        raise ValueError("No sales data provided to forecast pipeline.")

    all_units = [r.units for r in sales_rows]
    all_units_sorted = sorted(all_units)
    idx_99 = int(len(all_units_sorted) * cfg.cleaning.winsorize_percentile)
    p99_threshold = (
        all_units_sorted[min(idx_99, len(all_units_sorted) - 1)] if all_units_sorted else 1000
    )

    valid_sales = [
        DailySalesRecord(
            day=r.day,
            product_id=r.product_id,
            category_id=r.category_id,
            units=min(r.units, p99_threshold),
            revenue=r.revenue,
            orders=r.orders,
            avg_discount_pct=r.avg_discount_pct,
        )
        for r in sales_rows
    ]

    input_hash = compute_input_hash(valid_sales)

    # 2. Extract series
    # A. Shop daily series
    shop_day_units: dict[dt.date, float] = {}
    shop_day_rev: dict[dt.date, float] = {}
    shop_day_orders: dict[dt.date, int] = {}

    # B. Category daily series
    cat_day_units: dict[int, dict[dt.date, float]] = {}
    cat_day_rev: dict[int, dict[dt.date, float]] = {}

    # C. Product daily / weekly series
    prod_day_units: dict[int, dict[dt.date, float]] = {}
    prod_day_rev: dict[int, dict[dt.date, float]] = {}

    for r in valid_sales:
        d = r.day
        # Shop
        shop_day_units[d] = shop_day_units.get(d, 0.0) + float(r.units)
        shop_day_rev[d] = shop_day_rev.get(d, 0.0) + float(r.revenue)
        shop_day_orders[d] = shop_day_orders.get(d, 0) + int(r.orders)

        # Category
        cid = r.category_id
        if cid not in cat_day_units:
            cat_day_units[cid] = {}
            cat_day_rev[cid] = {}
        cat_day_units[cid][d] = cat_day_units[cid].get(d, 0.0) + float(r.units)
        cat_day_rev[cid][d] = cat_day_rev[cid].get(d, 0.0) + float(r.revenue)

        # Product
        pid = r.product_id
        if pid not in prod_day_units:
            prod_day_units[pid] = {}
            prod_day_rev[pid] = {}
        prod_day_units[pid][d] = prod_day_units[pid].get(d, 0.0) + float(r.units)
        prod_day_rev[pid][d] = prod_day_rev[pid].get(d, 0.0) + float(r.revenue)

    all_days = sorted(shop_day_units.keys())
    first_sale_date = all_days[0]
    last_sale_date = all_days[-1]
    history_days = (last_sale_date - first_sale_date).days + 1
    total_shop_orders = sum(shop_day_orders.values())

    # Build dense chronological series for shop
    cur_d = first_sale_date
    dense_shop_units: list[float] = []
    dense_shop_rev: list[float] = []
    while cur_d <= last_sale_date:
        dense_shop_units.append(shop_day_units.get(cur_d, 0.0))
        dense_shop_rev.append(shop_day_rev.get(cur_d, 0.0))
        cur_d += dt.timedelta(days=1)

    total_units_sold = sum(dense_shop_units)
    avg_shop_unit_price = (
        (sum(dense_shop_rev) / total_units_sold) if total_units_sold > 0 else 100.0
    )

    forecast_records: list[ForecastRecord] = []
    metric_records: list[MetricRecord] = []
    selected_models_summary: dict[str, str] = {}
    readiness_summary: dict[str, int] = {"ok": 0, "preliminary": 0, "insufficient_data": 0}

    # 3. Model Shop Series (Horizon: 28 days)
    shop_readiness = evaluate_readiness(
        level=SeriesLevel.SHOP,
        days_since_first_sale=history_days,
        total_volume=total_shop_orders,
        config=cfg.gates,
    )
    readiness_summary[shop_readiness.status.value] += 1

    shop_baseline_model = SeasonalNaiveModel(seasonality=7)
    shop_folds = compute_n_folds(len(dense_shop_units), horizon=28, min_train=14)

    candidate_reps: list[BacktestReport] = []
    shop_baseline_rep: BacktestReport | None = None

    if shop_folds >= 1:
        shop_baseline_rep = run_backtest(
            dense_shop_units, shop_baseline_model, n_folds=shop_folds, horizon=28
        )
        if shop_readiness.can_use_statistical and len(dense_shop_units) >= 56:
            theta_m = AutoThetaModel(seasonality=7)
            ets_m = AutoETSModel(seasonality=7)
            candidate_reps.append(
                run_backtest(dense_shop_units, theta_m, n_folds=shop_folds, horizon=28)
            )
            candidate_reps.append(
                run_backtest(dense_shop_units, ets_m, n_folds=shop_folds, horizon=28)
            )

            if cfg.global_ml.enabled and history_days >= cfg.global_ml.min_history_days:
                gbm_m = LightGBMDirectModel()
                candidate_reps.append(
                    run_backtest(dense_shop_units, gbm_m, n_folds=shop_folds, horizon=28)
                )

        shop_selection = select_best_model(
            candidate_reports=candidate_reps,
            baseline_report=shop_baseline_rep,
            min_beat_percentage=cfg.global_ml.min_beat_percentage,
        )
    else:
        from lolys_analytics.select import SelectionResult

        shop_selection = SelectionResult(
            chosen_model="seasonal_naive",
            is_baseline_fallback=True,
            chosen_metric_value=0.0,
            baseline_metric_value=0.0,
            relative_improvement=0.0,
            primary_metric="wape",
            reason="Preliminary data (<42 days); defaulted to seasonal naive.",
        )

    selected_models_summary["shop"] = shop_selection.chosen_model

    # Fit chosen model on full data
    models_dict = {
        "seasonal_naive": SeasonalNaiveModel(seasonality=7),
        "moving_average_28": MovingAverage28Model(window=28),
        "autotheta": AutoThetaModel(seasonality=7),
        "autoets": AutoETSModel(seasonality=7),
        "lightgbm": LightGBMDirectModel(),
    }
    shop_model = models_dict.get(shop_selection.chosen_model.lower(), shop_baseline_model)
    shop_fc = shop_model.fit(dense_shop_units).predict(horizon=28)

    val_res = validate_forecast(shop_fc, dense_shop_units)
    if not val_res.is_valid:
        raise ValueError(f"Shop forecast failed validation: {val_res.error_message}")

    # Record shop metrics
    all_shop_reps = ([shop_baseline_rep] if shop_baseline_rep else []) + candidate_reps
    for rep in all_shop_reps:
        is_sel = rep.model_name == shop_selection.chosen_model
        for fold_idx, fe in enumerate(rep.fold_evaluations, start=1):
            metric_records.append(
                MetricRecord(
                    series_type="shop",
                    series_id=None,
                    model_name=rep.model_name,
                    fold=fold_idx,
                    wape=fe.metrics.wape,
                    mase=fe.metrics.mase,
                    pinball_loss=fe.metrics.pinball_loss,
                    bias=fe.metrics.bias,
                    is_selected=is_sel,
                )
            )

    # 4. Model Category Series (Horizon: 28 days)
    category_forecasts_map: dict[str, list[float]] = {}
    category_results: dict[int, tuple[ForecastResult, float]] = {}

    for cid in sorted(cat_day_units.keys()):
        cur_d = first_sale_date
        dense_cat_units: list[float] = []
        dense_cat_rev: list[float] = []
        while cur_d <= last_sale_date:
            dense_cat_units.append(cat_day_units[cid].get(cur_d, 0.0))
            dense_cat_rev.append(cat_day_rev[cid].get(cur_d, 0.0))
            cur_d += dt.timedelta(days=1)

        total_cat_units = sum(dense_cat_units)
        avg_cat_price = (
            (sum(dense_cat_rev) / total_cat_units) if total_cat_units > 0 else avg_shop_unit_price
        )

        cat_readiness = evaluate_readiness(
            level=SeriesLevel.CATEGORY,
            days_since_first_sale=history_days,
            total_volume=total_cat_units,
            config=cfg.gates,
        )
        readiness_summary[cat_readiness.status.value] += 1

        cat_folds = compute_n_folds(len(dense_cat_units), horizon=28, min_train=14)
        cat_candidates: list[BacktestReport] = []
        cat_baseline_rep: BacktestReport | None = None

        if cat_folds >= 1:
            cat_baseline_rep = run_backtest(
                dense_cat_units, shop_baseline_model, n_folds=cat_folds, horizon=28
            )
            if cat_readiness.can_use_statistical and len(dense_cat_units) >= 56:
                cat_candidates.append(
                    run_backtest(
                        dense_cat_units,
                        AutoThetaModel(seasonality=7),
                        n_folds=cat_folds,
                        horizon=28,
                    )
                )
                cat_candidates.append(
                    run_backtest(
                        dense_cat_units, AutoETSModel(seasonality=7), n_folds=cat_folds, horizon=28
                    )
                )

            cat_selection = select_best_model(
                candidate_reports=cat_candidates,
                baseline_report=cat_baseline_rep,
            )
        else:
            from lolys_analytics.select import SelectionResult

            cat_selection = SelectionResult(
                chosen_model="seasonal_naive",
                is_baseline_fallback=True,
                chosen_metric_value=0.0,
                baseline_metric_value=0.0,
                relative_improvement=0.0,
                primary_metric="wape",
                reason="Preliminary data (<42 days); defaulted to seasonal naive.",
            )

        selected_models_summary[f"category_{cid}"] = cat_selection.chosen_model

        cat_model = models_dict.get(cat_selection.chosen_model.lower(), shop_baseline_model)
        cat_fc = cat_model.fit(dense_cat_units).predict(horizon=28)

        val_cat = validate_forecast(cat_fc, dense_cat_units)
        if not val_cat.is_valid:
            raise ValueError(f"Category {cid} forecast failed validation: {val_cat.error_message}")

        category_forecasts_map[str(cid)] = list(cat_fc.point_forecast)
        category_results[cid] = (cat_fc, avg_cat_price)

        # Metrics for category
        all_cat_reps = ([cat_baseline_rep] if cat_baseline_rep else []) + cat_candidates
        for rep in all_cat_reps:
            is_sel = rep.model_name == cat_selection.chosen_model
            for fold_idx, fe in enumerate(rep.fold_evaluations, start=1):
                metric_records.append(
                    MetricRecord(
                        series_type="category",
                        series_id=cid,
                        model_name=rep.model_name,
                        fold=fold_idx,
                        wape=fe.metrics.wape,
                        mase=fe.metrics.mase,
                        pinball_loss=fe.metrics.pinball_loss,
                        bias=fe.metrics.bias,
                        is_selected=is_sel,
                    )
                )

    # 5. Reconcile Hierarchy (Bottom-up: shop matches sum of categories)
    reconciled = reconcile_hierarchy(
        shop_forecast=shop_fc.point_forecast,
        category_forecasts=category_forecasts_map,
        method="bottom_up",
    )
    final_shop_points = reconciled.shop_forecast

    # Record shop forecasts
    for step in range(28):
        fc_day = target_date + dt.timedelta(days=step + 1)
        pt_u = final_shop_points[step]
        pt_r = pt_u * avg_shop_unit_price
        lo = min(pt_u, shop_fc.lower_80[step])
        hi = max(pt_u, shop_fc.upper_80[step])
        forecast_records.append(
            ForecastRecord(
                series_type="shop",
                series_id=None,
                forecast_date=fc_day,
                horizon_step=step + 1,
                predicted_units=pt_u,
                predicted_revenue=pt_r,
                lower_80=lo,
                upper_80=hi,
                model_name=shop_selection.chosen_model,
            )
        )

    # Record category forecasts
    for cid, (c_fc, cat_price) in category_results.items():
        reconciled_cat_pts = reconciled.category_forecasts[str(cid)]
        for step in range(28):
            fc_day = target_date + dt.timedelta(days=step + 1)
            pt_u = reconciled_cat_pts[step]
            pt_r = pt_u * cat_price
            lo = min(pt_u, c_fc.lower_80[step])
            hi = max(pt_u, c_fc.upper_80[step])
            forecast_records.append(
                ForecastRecord(
                    series_type="category",
                    series_id=cid,
                    forecast_date=fc_day,
                    horizon_step=step + 1,
                    predicted_units=pt_u,
                    predicted_revenue=pt_r,
                    lower_80=lo,
                    upper_80=hi,
                    model_name=selected_models_summary[f"category_{cid}"],
                )
            )

    # 6. Model Product Series (Weekly units, Horizon: 8 weeks)
    for pid in sorted(prod_day_units.keys()):
        cur_d = first_sale_date
        dense_prod_units: list[float] = []
        dense_prod_rev: list[float] = []
        while cur_d <= last_sale_date:
            dense_prod_units.append(prod_day_units[pid].get(cur_d, 0.0))
            dense_prod_rev.append(prod_day_rev[pid].get(cur_d, 0.0))
            cur_d += dt.timedelta(days=1)

        # Aggregate daily into 7-day weekly buckets
        weekly_units: list[float] = []
        for w_start in range(0, len(dense_prod_units), 7):
            w_chunk = dense_prod_units[w_start : w_start + 7]
            weekly_units.append(sum(w_chunk))

        tot_units = sum(weekly_units)
        tot_rev = sum(dense_prod_rev)
        avg_prod_price = (tot_rev / tot_units) if tot_units > 0 else avg_shop_unit_price
        nonzero_w = sum(1 for w in weekly_units if w > 0)
        tot_w = len(weekly_units)

        prod_readiness = evaluate_readiness(
            level=SeriesLevel.PRODUCT,
            days_since_first_sale=history_days,
            total_volume=tot_units,
            nonzero_weeks=nonzero_w,
            total_weeks=tot_w,
            config=cfg.gates,
        )
        readiness_summary[prod_readiness.status.value] += 1

        # Intermittent models or baseline
        p_folds = compute_n_folds(len(weekly_units), horizon=8, min_train=4)
        p_candidates: list[BacktestReport] = []
        p_baseline_rep: BacktestReport | None = None

        if p_folds >= 1:
            p_baseline_rep = run_backtest(
                weekly_units, MovingAverage28Model(window=4), n_folds=p_folds, horizon=8
            )
            if prod_readiness.can_use_intermittent and len(weekly_units) >= 12:
                p_candidates.append(
                    run_backtest(weekly_units, CrostonSBAModel(), n_folds=p_folds, horizon=8)
                )
                p_candidates.append(
                    run_backtest(weekly_units, TSBModel(), n_folds=p_folds, horizon=8)
                )
                p_candidates.append(
                    run_backtest(weekly_units, ADIDAModel(), n_folds=p_folds, horizon=8)
                )
            elif prod_readiness.can_use_statistical and len(weekly_units) >= 12:
                p_candidates.append(
                    run_backtest(
                        weekly_units, AutoThetaModel(seasonality=4), n_folds=p_folds, horizon=8
                    )
                )

            p_selection = select_best_model(
                candidate_reports=p_candidates,
                baseline_report=p_baseline_rep,
                primary_metric="mase",
            )
        else:
            from lolys_analytics.select import SelectionResult

            p_selection = SelectionResult(
                chosen_model="moving_average_28",
                is_baseline_fallback=True,
                chosen_metric_value=0.0,
                baseline_metric_value=0.0,
                relative_improvement=0.0,
                primary_metric="mase",
                reason="Preliminary product data (<12 weeks); defaulted to moving average.",
            )

        selected_models_summary[f"product_{pid}"] = p_selection.chosen_model

        intermittent_map = {
            "croston_sba": CrostonSBAModel(),
            "tsb": TSBModel(),
            "adida": ADIDAModel(),
            "moving_average_28": MovingAverage28Model(window=4),
            "seasonal_naive": SeasonalNaiveModel(seasonality=4),
        }
        p_model = intermittent_map.get(
            p_selection.chosen_model.lower(), MovingAverage28Model(window=4)
        )
        p_fc = p_model.fit(weekly_units).predict(horizon=8)

        val_p = validate_forecast(p_fc, weekly_units)
        if not val_p.is_valid:
            raise ValueError(f"Product {pid} forecast failed validation: {val_p.error_message}")

        # Metrics for product
        all_p_reps = ([p_baseline_rep] if p_baseline_rep else []) + p_candidates
        for rep in all_p_reps:
            is_sel = rep.model_name == p_selection.chosen_model
            for fold_idx, fe in enumerate(rep.fold_evaluations, start=1):
                metric_records.append(
                    MetricRecord(
                        series_type="product",
                        series_id=pid,
                        model_name=rep.model_name,
                        fold=fold_idx,
                        wape=fe.metrics.wape,
                        mase=fe.metrics.mase,
                        pinball_loss=fe.metrics.pinball_loss,
                        bias=fe.metrics.bias,
                        is_selected=is_sel,
                    )
                )

        # Forecast records for product (weekly horizon step 1..8)
        for step in range(8):
            fc_week_date = target_date + dt.timedelta(weeks=step + 1)
            pt_u = p_fc.point_forecast[step]
            pt_r = pt_u * avg_prod_price
            forecast_records.append(
                ForecastRecord(
                    series_type="product",
                    series_id=pid,
                    forecast_date=fc_week_date,
                    horizon_step=step + 1,
                    predicted_units=pt_u,
                    predicted_revenue=pt_r,
                    lower_80=p_fc.lower_80[step],
                    upper_80=p_fc.upper_80[step],
                    model_name=p_selection.chosen_model,
                )
            )

    # 7. Assemble run payload
    git_sha = get_git_commit_sha()
    notes = {
        "series_counts": {
            "shop": 1,
            "categories": len(cat_day_units),
            "products": len(prod_day_units),
            "total_series": 1 + len(cat_day_units) + len(prod_day_units),
        },
        "readiness_summary": readiness_summary,
        "selected_models": selected_models_summary,
        "hierarchy_discrepancy_max_pct": round(reconciled.discrepancy_max_pct, 4),
        "history_days": history_days,
        "total_units_sold": round(total_units_sold, 2),
    }

    return ForecastRunPayload(
        run_date=target_date,
        git_commit=git_sha,
        model_version="v1.0",
        input_hash=input_hash,
        notes=notes,
        forecasts=forecast_records,
        metrics=metric_records,
    )
