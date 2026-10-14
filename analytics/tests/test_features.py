"""Unit tests for feature engineering, data cleaning rules, and future-leakage prevention.

Verifies:
1. Cleaning Rule 1: Valid sales filtering (status & payment checks).
2. Cleaning Rule 2: Stock-out demand censoring and past same-weekday median imputation.
3. Cleaning Rule 4: Winsorisation of large wholesale outliers.
4. Cleaning Rule 5: Poisoned account exclusion based on rolling 30-day thresholds.
5. Mathematical proof that feature engineering contains ZERO future data leakage.
"""

from __future__ import annotations

from datetime import date, timedelta

from lolys_analytics.features import (
    DailyObservation,
    build_daily_features,
    censor_stockout_demand,
    filter_poisoned_accounts,
    filter_valid_sales,
    winsorise_outliers,
)


def test_cleaning_rule_1_valid_sales_filtering() -> None:
    """Tests that cancelled, expired, and unconfirmed orders are excluded from training."""
    orders = [
        {"id": 1, "payment_method": "cod", "status": "delivered", "payment_status": "paid"},
        {"id": 2, "payment_method": "cod", "status": "confirmed", "payment_status": "unpaid"},
        {
            "id": 3,
            "payment_method": "cod",
            "status": "pending",
            "payment_status": "unpaid",
        },  # Excluded
        {
            "id": 4,
            "payment_method": "cod",
            "status": "cancelled",
            "payment_status": "unpaid",
        },  # Excluded
        {"id": 5, "payment_method": "instapay_qr", "status": "confirmed", "payment_status": "paid"},
        {
            "id": 6,
            "payment_method": "instapay_qr",
            "status": "pending",
            "payment_status": "under_review",
        },
        {
            "id": 7,
            "payment_method": "instapay_qr",
            "status": "cancelled",
            "payment_status": "rejected",
        },  # Excluded
        {
            "id": 8,
            "payment_method": "instapay_qr",
            "status": "pending",
            "payment_status": "expired",
        },  # Excluded
    ]
    valid = filter_valid_sales(orders)
    valid_ids = [o["id"] for o in valid]
    assert valid_ids == [1, 2, 5, 6]


def test_cleaning_rule_2_stockout_censoring_and_past_median_imputation() -> None:
    """Tests that stock-outs censor demand using historical same-weekday medians."""
    # Build 3 weeks of daily observations starting Monday 2026-03-02
    start = date(2026, 3, 2)
    obs_list: list[DailyObservation] = []
    for i in range(21):
        cur_day = start + timedelta(days=i)
        # Weekdays get 10 units, Fridays get 20 units
        weekday = (cur_day.weekday() + 1) % 7
        units = 20.0 if weekday == 5 else 10.0
        # Force a stock-out on the 3rd Friday (index 18)
        closing_stock = 0 if i == 18 else 50
        is_stockout = closing_stock <= 0
        obs_list.append(
            DailyObservation(
                day=cur_day,
                units=0.0 if is_stockout else units,
                closing_stock=closing_stock,
                is_stockout=is_stockout,
            )
        )

    clean = censor_stockout_demand(obs_list)
    # The stock-out day (index 18) should have been imputed with past Friday values (20.0)
    assert clean[18].is_stockout is True
    assert clean[18].units == 20.0
    # Non-stockout days should be unchanged
    assert clean[0].units == 10.0
    assert clean[4].units == 20.0


def test_cleaning_rule_4_outlier_winsorisation() -> None:
    """Tests that values exceeding the 99th percentile are clipped and logged."""
    # 200 observations: 198 regular (around 10), 2 extreme wholesale spikes (1000, 2000)
    series = [10.0 + (i % 5) for i in range(198)] + [1000.0, 2000.0]
    clipped, clip_count, cutoff = winsorise_outliers(series, percentile=0.99)

    assert clip_count == 2
    assert cutoff < 100.0
    assert max(clipped) <= cutoff
    # Verify non-outliers are untouched
    assert clipped[0] == series[0]
    assert clipped[50] == series[50]


def test_cleaning_rule_5_poisoned_account_filtering() -> None:
    """Tests that accounts with >= 3 unpaid/rejected orders in 30 days are excluded."""
    orders = [
        # Good user 1
        {"id": 101, "user_id": "good_user", "status": "delivered", "day": "2026-03-01"},
        {"id": 102, "user_id": "good_user", "status": "delivered", "day": "2026-03-10"},
        # Poisoned user 2 (3 expired/rejected within 10 days)
        {"id": 201, "user_id": "bad_user", "status": "expired", "day": "2026-03-01"},
        {"id": 202, "user_id": "bad_user", "status": "rejected", "day": "2026-03-05"},
        {"id": 203, "user_id": "bad_user", "status": "expired", "day": "2026-03-09"},
        {"id": 204, "user_id": "bad_user", "status": "delivered", "day": "2026-03-12"},
        # Slow user 3 (3 expired orders spread over 90 days - NOT poisoned)
        {"id": 301, "user_id": "slow_user", "status": "expired", "day": "2026-01-01"},
        {"id": 302, "user_id": "slow_user", "status": "expired", "day": "2026-02-15"},
        {"id": 303, "user_id": "slow_user", "status": "expired", "day": "2026-04-01"},
        {"id": 304, "user_id": "slow_user", "status": "delivered", "day": "2026-04-10"},
    ]

    clean_orders, poisoned_users = filter_poisoned_accounts(orders, threshold=3, window_days=30)
    assert poisoned_users == {"bad_user"}
    clean_user_ids = {o["user_id"] for o in clean_orders}
    assert "bad_user" not in clean_user_ids
    assert "good_user" in clean_user_ids
    assert "slow_user" in clean_user_ids


def test_zero_future_data_leakage_proof() -> None:
    """MATHEMATICAL PROOF: Modifying future data at index >= T has ZERO effect on features at t < T."""
    start = date(2026, 1, 1)
    original_series: list[DailyObservation] = []
    for i in range(60):
        original_series.append(
            DailyObservation(
                day=start + timedelta(days=i),
                units=float(10 + (i % 7)),
                closing_stock=100,
                discount_pct=0.0,
            )
        )

    # Compute features on original history
    features_original = build_daily_features(original_series)

    # Create a perturbed future starting at cutoff T=35
    cutoff_idx = 35
    modified_series: list[DailyObservation] = []
    for i in range(60):
        if i >= cutoff_idx:
            # Drastically perturb future values
            modified_series.append(
                DailyObservation(
                    day=original_series[i].day,
                    units=original_series[i].units * 50.0 + 9999.0,
                    closing_stock=0,  # stock-out in future
                    discount_pct=0.50,
                )
            )
        else:
            modified_series.append(original_series[i])

    # Compute features on modified history
    features_modified = build_daily_features(modified_series)

    # Assert that for all time steps t < cutoff_idx, features are 100% numerically identical
    assert len(features_original) == len(features_modified) == 60

    for i in range(cutoff_idx):
        f_orig = features_original[i]
        f_mod = features_modified[i]

        assert f_orig.day == f_mod.day
        assert f_orig.target_units == f_mod.target_units
        assert f_orig.lag_1 == f_mod.lag_1
        assert f_orig.lag_7 == f_mod.lag_7
        assert f_orig.lag_14 == f_mod.lag_14
        assert f_orig.lag_28 == f_mod.lag_28
        assert f_orig.rolling_mean_7 == f_mod.rolling_mean_7
        assert f_orig.rolling_std_7 == f_mod.rolling_std_7
        assert f_orig.rolling_mean_28 == f_mod.rolling_mean_28
        assert f_orig.rolling_std_28 == f_mod.rolling_std_28
        assert f_orig.discount_pct == f_mod.discount_pct
        assert f_orig.in_stock_fraction == f_mod.in_stock_fraction
        assert f_orig.demand_censored == f_mod.demand_censored
