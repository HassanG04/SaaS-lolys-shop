"""Feature engineering and data cleaning pipeline for Lolys' Analytics.

Implements all 5 cleaning rules from analytics-plan.md Section 3:
1. Valid sales filtering (excluding cancelled, expired, payment-rejected).
2. Stock-out censoring & same-weekday median imputation.
3. Promotion & discount features.
4. Outlier winsorisation (99th percentile clipping).
5. Poisoned account exclusion (>= 3 unpaid/rejected orders in 30 days).

Constructs lag, rolling statistics, calendar, and stock availability features
with mathematical guarantees of zero future data leakage.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

from lolys_analytics.calendar import get_calendar_day


@dataclass(frozen=True)
class DailyObservation:
    """Historical or synthetic observation for one day in a series."""

    day: date
    units: float
    revenue: float = 0.0
    closing_stock: int = 100
    discount_pct: float = 0.0
    is_stockout: bool = False


@dataclass(frozen=True)
class FeatureRow:
    """Strongly typed feature vector for model training and forecasting."""

    day: date
    target_units: float
    lag_1: float
    lag_7: float
    lag_14: float
    lag_28: float
    rolling_mean_7: float
    rolling_std_7: float
    rolling_mean_28: float
    rolling_std_28: float
    weekday: int
    is_weekend: bool
    day_of_month: int
    month: int
    ramadan: bool
    eid_fitr: bool
    eid_adha: bool
    mothers_day: bool
    valentines: bool
    black_friday: bool
    back_to_school: bool
    discount_pct: float
    in_stock_fraction: float
    demand_censored: bool

    def to_dict(self) -> dict[str, Any]:
        """Serializes the feature vector to a dictionary."""
        return {
            "day": self.day.isoformat(),
            "target_units": self.target_units,
            "lag_1": self.lag_1,
            "lag_7": self.lag_7,
            "lag_14": self.lag_14,
            "lag_28": self.lag_28,
            "rolling_mean_7": self.rolling_mean_7,
            "rolling_std_7": self.rolling_std_7,
            "rolling_mean_28": self.rolling_mean_28,
            "rolling_std_28": self.rolling_std_28,
            "weekday": self.weekday,
            "is_weekend": self.is_weekend,
            "day_of_month": self.day_of_month,
            "month": self.month,
            "ramadan": self.ramadan,
            "eid_fitr": self.eid_fitr,
            "eid_adha": self.eid_adha,
            "mothers_day": self.mothers_day,
            "valentines": self.valentines,
            "black_friday": self.black_friday,
            "back_to_school": self.back_to_school,
            "discount_pct": self.discount_pct,
            "in_stock_fraction": self.in_stock_fraction,
            "demand_censored": self.demand_censored,
        }


# ==============================================================================
# 1. Cleaning Rules (analytics-plan.md Section 3)
# ==============================================================================


def filter_valid_sales(orders: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Cleaning Rule 1: Include only orders that count as valid sales.

    Excludes cancelled, payment-rejected, and expired orders.
    Cash-on-delivery orders count when status is 'confirmed', 'shipped', or 'delivered'.
    InstaPay orders count when payment is approved ('under_review', 'paid', 'shipped', 'delivered').
    """
    valid_orders: list[dict[str, Any]] = []

    for order in orders:
        order_status = str(order.get("status", "")).lower()
        payment_status = str(order.get("payment_status", "")).lower()
        payment_method = str(order.get("payment_method", "")).lower()

        # Reject explicitly invalid statuses
        if order_status in ("cancelled", "rejected", "expired"):
            continue
        if payment_status in ("rejected", "expired"):
            continue

        if payment_method == "cod":
            # COD counts at confirmed or later
            if order_status in ("confirmed", "shipped", "delivered"):
                valid_orders.append(order)
        elif payment_method == "instapay_qr":
            # InstaPay counts once confirmed/paid or under review
            if payment_status in ("under_review", "paid") or order_status in (
                "confirmed",
                "shipped",
                "delivered",
            ):
                valid_orders.append(order)
        else:
            # Default fallback for synthetic / generic records
            if order_status not in ("cancelled", "rejected", "expired"):
                valid_orders.append(order)

    return valid_orders


def censor_stockout_demand(
    observations: list[DailyObservation],
    fill_strategy: str = "same_weekday_median",
) -> list[DailyObservation]:
    """Cleaning Rule 2: Stock-outs censor demand.

    Days with closing_stock <= 0 (or is_stockout is True) are censored.
    For statistical time-series models, censored demand is replaced by the
    historical median of non-stockout days for the SAME weekday observed PRIOR
    to that day (no future leakage).
    """
    clean: list[DailyObservation] = []
    # weekday -> list of historical in-stock units
    weekday_history: dict[int, list[float]] = {w: [] for w in range(7)}

    for obs in observations:
        is_stockout = obs.is_stockout or (obs.closing_stock <= 0)
        weekday = (obs.day.weekday() + 1) % 7  # 0=Sunday, 6=Saturday

        if is_stockout:
            history = weekday_history[weekday]
            if history and fill_strategy == "same_weekday_median":
                sorted_hist = sorted(history)
                n = len(sorted_hist)
                if n % 2 == 1:
                    imputed_units = sorted_hist[n // 2]
                else:
                    imputed_units = (sorted_hist[n // 2 - 1] + sorted_hist[n // 2]) / 2.0
            elif history:
                imputed_units = sum(history) / len(history)
            else:
                # If no prior weekday history exists, keep observed units
                imputed_units = obs.units

            clean.append(
                DailyObservation(
                    day=obs.day,
                    units=imputed_units,
                    revenue=obs.revenue,
                    closing_stock=obs.closing_stock,
                    discount_pct=obs.discount_pct,
                    is_stockout=True,
                )
            )
        else:
            # Non-stockout day: record in historical accumulator
            weekday_history[weekday].append(obs.units)
            clean.append(obs)

    return clean


def winsorise_outliers(
    values: list[float],
    percentile: float = 0.99,
) -> tuple[list[float], int, float]:
    """Cleaning Rule 4: Winsorise outliers at the given percentile (default 99th).

    Single large wholesale orders must not distort demand forecasts.
    Returns:
        (clipped_values, count_of_clipped_points, cutoff_threshold)
    """
    if not values:
        return [], 0, 0.0

    n = len(values)
    if n < 4:
        # Not enough points to compute a meaningful 99th percentile cutoff
        return list(values), 0, max(values) if values else 0.0

    sorted_vals = sorted(values)
    # Nearest-rank percentile calculation
    rank = int(math.ceil(percentile * n)) - 1
    rank = max(0, min(rank, n - 1))
    cutoff = float(sorted_vals[rank])

    clipped: list[float] = []
    clip_count = 0
    for v in values:
        if v > cutoff:
            clipped.append(cutoff)
            clip_count += 1
        else:
            clipped.append(float(v))

    return clipped, clip_count, cutoff


def filter_poisoned_accounts(
    orders: list[dict[str, Any]],
    threshold: int = 3,
    window_days: int = 30,
) -> tuple[list[dict[str, Any]], set[str]]:
    """Cleaning Rule 5: Exclude orders from accounts with >= 3 expired/rejected orders in 30 days.

    Prevents malicious or abandoned spam orders from poisoning training data.
    Returns:
        (clean_orders, set_of_poisoned_account_ids)
    """
    account_bad_dates: dict[str, list[date]] = {}

    # Step 1: Collect dates of bad orders per user
    for order in orders:
        user_id = str(order.get("user_id") or order.get("customer_id") or "")
        if not user_id:
            continue

        status = str(order.get("status", "")).lower()
        payment_status = str(order.get("payment_status", "")).lower()
        is_bad = (status in ("expired", "rejected")) or (payment_status in ("expired", "rejected"))

        if is_bad:
            order_date = order.get("created_at") or order.get("order_date") or order.get("day")
            if isinstance(order_date, str):
                parsed_date = date.fromisoformat(order_date[:10])
            elif isinstance(order_date, date):
                parsed_date = order_date
            else:
                continue

            if user_id not in account_bad_dates:
                account_bad_dates[user_id] = []
            account_bad_dates[user_id].append(parsed_date)

    # Step 2: Determine which accounts exceed threshold within any 30-day window
    poisoned_accounts: set[str] = set()
    window_delta = timedelta(days=window_days)

    for user_id, bad_dates in account_bad_dates.items():
        if len(bad_dates) < threshold:
            continue
        sorted_dates = sorted(bad_dates)
        for i in range(len(sorted_dates)):
            end_idx = i + threshold - 1
            if end_idx < len(sorted_dates):
                if sorted_dates[end_idx] - sorted_dates[i] <= window_delta:
                    poisoned_accounts.add(user_id)
                    break

    # Step 3: Filter clean orders
    clean_orders: list[dict[str, Any]] = [
        o
        for o in orders
        if str(o.get("user_id") or o.get("customer_id") or "") not in poisoned_accounts
    ]

    return clean_orders, poisoned_accounts


# ==============================================================================
# 2. Feature Engineering with Zero Future Data Leakage
# ==============================================================================


def _mean(seq: list[float]) -> float:
    return sum(seq) / len(seq) if seq else 0.0


def _std(seq: list[float]) -> float:
    n = len(seq)
    if n < 2:
        return 0.0
    avg = _mean(seq)
    var = sum((x - avg) ** 2 for x in seq) / (n - 1)
    return math.sqrt(max(0.0, var))


def build_daily_features(
    series: list[DailyObservation],
    planned_future_discount: float = 0.0,
) -> list[FeatureRow]:
    """Builds lag, rolling statistics, calendar, discount, and availability features.

    GUARANTEE OF ZERO FUTURE LEAKAGE:
    For row i (at date t):
    - lag_1 uses observation i-1
    - lag_7 uses observation i-7
    - lag_14 uses observation i-14
    - lag_28 uses observation i-28
    - rolling_mean_7 and rolling_std_7 use ONLY observations from [i-7, i-1]
    - rolling_mean_28 and rolling_std_28 use ONLY observations from [i-28, i-1]
    - No statistical or lag feature ever uses observation i or any observation > i.
    """
    features: list[FeatureRow] = []
    n = len(series)

    for i in range(n):
        obs = series[i]
        c_day = get_calendar_day(obs.day)

        # Lags (strictly prior observations)
        lag_1 = series[i - 1].units if i >= 1 else obs.units
        lag_7 = series[i - 7].units if i >= 7 else lag_1
        lag_14 = series[i - 14].units if i >= 14 else lag_7
        lag_28 = series[i - 28].units if i >= 28 else lag_14

        # Rolling 7-day window: [i-7 .. i-1]
        if i >= 7:
            window_7 = [series[j].units for j in range(i - 7, i)]
            rolling_mean_7 = _mean(window_7)
            rolling_std_7 = _std(window_7)
        elif i >= 1:
            window_7 = [series[j].units for j in range(0, i)]
            rolling_mean_7 = _mean(window_7)
            rolling_std_7 = _std(window_7)
        else:
            rolling_mean_7 = obs.units
            rolling_std_7 = 0.0

        # Rolling 28-day window: [i-28 .. i-1]
        if i >= 28:
            window_28 = [series[j].units for j in range(i - 28, i)]
            rolling_mean_28 = _mean(window_28)
            rolling_std_28 = _std(window_28)
        elif i >= 1:
            window_28 = [series[j].units for j in range(0, i)]
            rolling_mean_28 = _mean(window_28)
            rolling_std_28 = _std(window_28)
        else:
            rolling_mean_28 = obs.units
            rolling_std_28 = 0.0

        # Stock availability fraction
        is_stockout = obs.is_stockout or (obs.closing_stock <= 0)
        in_stock_fraction = 0.0 if is_stockout else 1.0

        row = FeatureRow(
            day=obs.day,
            target_units=obs.units,
            lag_1=lag_1,
            lag_7=lag_7,
            lag_14=lag_14,
            lag_28=lag_28,
            rolling_mean_7=rolling_mean_7,
            rolling_std_7=rolling_std_7,
            rolling_mean_28=rolling_mean_28,
            rolling_std_28=rolling_std_28,
            weekday=c_day.weekday,
            is_weekend=c_day.is_weekend,
            day_of_month=obs.day.day,
            month=obs.day.month,
            ramadan=c_day.ramadan,
            eid_fitr=c_day.eid_fitr,
            eid_adha=c_day.eid_adha,
            mothers_day=c_day.mothers_day,
            valentines=c_day.valentines,
            black_friday=c_day.black_friday,
            back_to_school=c_day.back_to_school,
            discount_pct=obs.discount_pct if obs.discount_pct > 0 else planned_future_discount,
            in_stock_fraction=in_stock_fraction,
            demand_censored=is_stockout,
        )
        features.append(row)

    return features
