"""Unit tests for synthetic shop retail time-series generator."""

from __future__ import annotations

from lolys_analytics.config import CleaningConfig
from lolys_analytics.synthetic import apply_cleaning_rules, generate_synthetic_data


def test_synthetic_data_determinism() -> None:
    """Verifies that the generator is strictly deterministic with the same seed."""
    run_1 = generate_synthetic_data(days=60, seed=42)
    run_2 = generate_synthetic_data(days=60, seed=42)

    assert len(run_1.orders) == len(run_2.orders)
    assert len(run_1.daily_sales) == len(run_2.daily_sales)
    assert len(run_1.daily_stock) == len(run_2.daily_stock)
    assert run_1.summary == run_2.summary

    # Spot check specific records
    for s1, s2 in zip(run_1.daily_sales[:20], run_2.daily_sales[:20], strict=True):
        assert s1.day == s2.day
        assert s1.product_id == s2.product_id
        assert s1.units == s2.units
        assert abs(s1.revenue - s2.revenue) < 1e-5


def test_synthetic_seed_variation() -> None:
    """Different seeds generate different data streams."""
    run_a = generate_synthetic_data(days=60, seed=42)
    run_b = generate_synthetic_data(days=60, seed=999)

    assert run_a.orders[0].order_id != run_b.orders[0].order_id or run_a.summary != run_b.summary


def test_synthetic_data_exercises_all_cleaning_rules() -> None:
    """The generator must exercise every cleaning rule defined in analytics-plan.md:

    1. Normal sales filtering (COD confirmed/delivered, InstaPay paid vs cancelled/rejected)
    2. Poisoned accounts (>= 3 rejected/expired orders in 30 days)
    3. Outlier winsorization (orders exceeding the 99th percentile)
    4. Stock-out censoring (flagged days where closing stock hits 0)
    5. Promotional discount periods
    """
    dataset = generate_synthetic_data(days=180, seed=42)

    # 1. Non-sales orders exist (cancelled or rejected)
    cancelled_or_rejected = [
        o for o in dataset.orders if o.status == "cancelled" or o.payment_status == "rejected"
    ]
    assert len(cancelled_or_rejected) > 0, "Synthetic dataset must contain non-sales orders"

    # 2. Stockout episodes exist
    stockouts = [s for s in dataset.daily_stock if s.stockout_flag]
    assert len(stockouts) > 0, "Synthetic dataset must exercise stock-outs (closing stock = 0)"
    assert any(s.closing_stock == 0 for s in stockouts)

    # 3. Promotions exist
    promo_rows = [r for r in dataset.daily_sales if r.avg_discount_pct > 0]
    assert len(promo_rows) > 0, "Synthetic dataset must exercise promotional discounts"

    # 4. Outliers exist
    max_units = max(r.units for r in dataset.daily_sales)
    median_units = sorted(r.units for r in dataset.daily_sales)[len(dataset.daily_sales) // 2]
    assert max_units > median_units * 3, "Synthetic dataset must include wholesale outlier spikes"

    # 5. Intermittent items exist
    intermittent_prods = [p for p in dataset.products if p.is_intermittent]
    assert len(intermittent_prods) > 0

    # 6. Apply cleaning rules helper and verify results
    clean_config = CleaningConfig(
        winsorize_percentile=0.99,
        poison_threshold_rejected_or_expired=3,
        poison_window_days=30,
    )
    clean_report = apply_cleaning_rules(dataset, clean_config)

    assert clean_report["excluded_sales_orders"] > 0
    assert clean_report["clean_orders"] > 0
    assert len(clean_report["poisoned_accounts_detected"]) >= 1
    assert clean_report["winsorize_clipped_points"] >= 1
    assert clean_report["stockout_days_flagged"] > 0


def test_synthetic_serialization() -> None:
    """Verifies that dataset can be exported to dictionary for JSON output."""
    dataset = generate_synthetic_data(days=14, seed=123)
    d = dataset.to_dict()

    assert "seed" in d
    assert "start_date" in d
    assert "summary" in d
    assert len(d["daily_sales"]) > 0
    assert len(d["daily_stock"]) > 0
    assert len(d["products"]) == 25
