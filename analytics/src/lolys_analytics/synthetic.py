"""Deterministic synthetic shop data generator for Lolys' Accessories & Home.

Simulates realistic retail time-series including:
- Long-term growth trend
- Day-of-week seasonality (Egyptian weekend peaks on Friday/Saturday)
- Calendar event uplifts (Ramadan, Eid, Mother's Day, Valentine's Day, Black Friday)
- Promotional discounts
- Mixed demand profiles: fast-moving vs. intermittent/lumpy items
- Stock-out censoring
- Wholesale outlier orders
- Malicious/poisoned customer accounts with repeated expirations/rejections
"""

from __future__ import annotations

import math
import random
from dataclasses import asdict, dataclass
from datetime import date, datetime, timedelta
from typing import Any

from lolys_analytics.config import CleaningConfig, SyntheticConfig


@dataclass
class SyntheticOrderItem:
    product_id: int
    category_id: int
    quantity: int
    unit_price: float
    list_price: float


@dataclass
class SyntheticOrder:
    order_id: int
    customer_id: str
    created_at: datetime
    status: str  # 'confirmed', 'shipped', 'delivered', 'cancelled', 'pending_approval'
    payment_method: str  # 'cod', 'instapay'
    payment_status: str  # 'paid', 'pending', 'under_review', 'rejected'
    items: list[SyntheticOrderItem]


@dataclass
class DailySalesRecord:
    day: date
    product_id: int
    category_id: int
    units: int
    revenue: float
    orders: int
    avg_discount_pct: float


@dataclass
class DailyStockRecord:
    day: date
    product_id: int
    closing_stock: int
    stockout_flag: bool


@dataclass
class ProductProfile:
    id: int
    category_id: int
    name: str
    base_price: float
    is_intermittent: bool
    base_daily_rate: float


@dataclass
class SyntheticDataset:
    seed: int
    start_date: date
    end_date: date
    orders: list[SyntheticOrder]
    daily_sales: list[DailySalesRecord]
    daily_stock: list[DailyStockRecord]
    products: list[ProductProfile]
    summary: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        """Convert dataset to JSON-serializable dictionary."""
        return {
            "seed": self.seed,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "summary": self.summary,
            "products": [asdict(p) for p in self.products],
            "daily_sales": [
                {
                    "day": r.day.isoformat(),
                    "product_id": r.product_id,
                    "category_id": r.category_id,
                    "units": r.units,
                    "revenue": round(r.revenue, 2),
                    "orders": r.orders,
                    "avg_discount_pct": round(r.avg_discount_pct, 2),
                }
                for r in self.daily_sales
            ],
            "daily_stock": [
                {
                    "day": s.day.isoformat(),
                    "product_id": s.product_id,
                    "closing_stock": s.closing_stock,
                    "stockout_flag": s.stockout_flag,
                }
                for s in self.daily_stock
            ],
        }


def _get_calendar_uplift(d: date, config: SyntheticConfig) -> float:
    """Calculate multiplier for Egyptian / Hijri holiday events."""
    uplift = 1.0

    # Ramadan (approx 2026-02-18 to 2026-03-19)
    if date(2026, 2, 18) <= d <= date(2026, 3, 19):
        uplift *= 1.0 + config.ramadan_uplift

    # Eid al-Fitr (approx 2026-03-20 to 2026-03-23)
    if date(2026, 3, 20) <= d <= date(2026, 3, 23):
        uplift *= 1.0 + config.eid_uplift

    # Eid al-Adha (approx 2026-05-27 to 2026-05-30)
    if date(2026, 5, 27) <= d <= date(2026, 5, 30):
        uplift *= 1.0 + config.eid_uplift

    # Mother's Day (21 March)
    if d.month == 3 and d.day == 21:
        uplift *= 1.0 + config.mothers_day_uplift

    # Valentine's Day (14 February)
    if d.month == 2 and d.day == 14:
        uplift *= 1.0 + config.valentines_uplift

    # Black Friday (fourth Friday of November)
    if d.month == 11 and d.weekday() == 4 and d.day >= 22:
        uplift *= 1.0 + config.black_friday_uplift

    return uplift


def _get_day_of_week_factor(weekday: int) -> float:
    """Egyptian weekly shopping pattern: Friday (4) and Saturday (5) peak."""
    factors = {
        0: 0.90,  # Monday
        1: 0.92,  # Tuesday
        2: 0.95,  # Wednesday
        3: 1.05,  # Thursday (weekend buildup)
        4: 1.35,  # Friday (peak family / shopping day)
        5: 1.25,  # Saturday (weekend)
        6: 0.85,  # Sunday
    }
    return factors.get(weekday, 1.0)


def generate_synthetic_data(
    days: int = 180,
    seed: int = 42,
    start_date: date | None = None,
    config: SyntheticConfig | None = None,
) -> SyntheticDataset:
    """Generate deterministic synthetic store dataset.

    Exercises all cleaning rules:
    - Normal sales filtering (COD confirmed/delivered, InstaPay paid)
    - Stockout censoring (flagged days where stock hits 0)
    - Promotion discount percentages
    - Wholesale outlier orders (> 99th percentile)
    - Poisoned customer accounts (>= 3 expired/rejected orders in 30 days)
    """
    cfg = config or SyntheticConfig()
    rng = random.Random(seed)

    if start_date is None:
        # Default start: 2026-01-01
        start_date = date(2026, 1, 1)

    end_date = start_date + timedelta(days=days - 1)

    # 1. Generate Product Catalog (25 items across 5 categories)
    # 15 fast/steady movers, 10 intermittent/slow movers
    products: list[ProductProfile] = []
    prod_id = 1
    for cat_id in range(1, cfg.num_categories + 1):
        for item_idx in range(1, (cfg.num_products // cfg.num_categories) + 1):
            is_intermittent = item_idx > 3  # 2 out of 5 in each category are intermittent
            base_price = round(rng.uniform(75.0, 450.0), 2)
            base_daily_rate = rng.uniform(0.15, 0.40) if is_intermittent else rng.uniform(1.2, 3.8)
            products.append(
                ProductProfile(
                    id=prod_id,
                    category_id=cat_id,
                    name=f"Product {prod_id}",
                    base_price=base_price,
                    is_intermittent=is_intermittent,
                    base_daily_rate=base_daily_rate,
                )
            )
            prod_id += 1

    # 2. Identify Poisoned Accounts
    poisoned_customers = {f"bad_user_{i}" for i in range(1, cfg.poisoned_accounts_count + 1)}
    regular_customer_pool = [f"cust_{i:04d}" for i in range(1, 150)]

    orders: list[SyntheticOrder] = []
    order_id_counter = 1000

    outlier_orders_count = 0
    cancelled_orders_count = 0
    rejected_orders_count = 0
    poisoned_orders_count = 0

    # Running inventory for stock tracking
    current_inventory = {p.id: rng.randint(40, 80) for p in products}

    daily_sales: list[DailySalesRecord] = []
    daily_stock: list[DailyStockRecord] = []

    stockout_days_count = 0
    promo_days_count = 0

    # 3. Simulate day-by-day
    for day_offset in range(days):
        current_day = start_date + timedelta(days=day_offset)
        dow_factor = _get_day_of_week_factor(current_day.weekday())
        cal_uplift = _get_calendar_uplift(current_day, cfg)
        trend_factor = 1.0 + (day_offset * cfg.trend_daily_growth)

        # Decide if today has a shop-wide promotion
        is_promo_day = (day_offset % 28) in (13, 14) or (cal_uplift > 1.3)
        if is_promo_day:
            promo_days_count += 1
            daily_discount = round(rng.uniform(10.0, 25.0), 1)
        else:
            daily_discount = 0.0

        # Simulate orders on current_day
        expected_orders = cfg.base_daily_orders * dow_factor * cal_uplift * trend_factor
        num_orders_today = max(2, int(rng.gauss(expected_orders, math.sqrt(expected_orders))))

        # Track daily sales totals for verified sales
        day_units: dict[int, int] = {p.id: 0 for p in products}
        day_rev: dict[int, float] = {p.id: 0.0 for p in products}
        day_order_count: dict[int, int] = {p.id: 0 for p in products}
        day_discounts: dict[int, list[float]] = {p.id: [] for p in products}

        # Check for restocks (every ~14 days if stock is low)
        for p in products:
            if current_inventory[p.id] < 10 and rng.random() < 0.6:
                current_inventory[p.id] += rng.randint(25, 50)

        for _ in range(num_orders_today):
            order_id_counter += 1

            # Decide customer
            is_poisoned = (
                rng.random() < 0.08 and len(poisoned_customers) > 0 and day_offset % 20 < 10
            )
            if is_poisoned:
                cust_id = rng.choice(list(poisoned_customers))
                poisoned_orders_count += 1
            else:
                cust_id = rng.choice(regular_customer_pool)

            # Order status determination
            if is_poisoned:
                # Poisoned account repeatedly rejects or lets orders expire
                status = "cancelled"
                payment_method = "instapay"
                payment_status = "rejected" if rng.random() < 0.7 else "pending"
                rejected_orders_count += 1
            else:
                r_status = rng.random()
                if r_status < 0.78:
                    status = "delivered"
                    payment_method = rng.choice(["cod", "instapay"])
                    payment_status = "paid"
                elif r_status < 0.90:
                    status = "confirmed"
                    payment_method = rng.choice(["cod", "instapay"])
                    payment_status = "paid" if payment_method == "instapay" else "pending"
                else:
                    status = "cancelled"
                    payment_method = "cod"
                    payment_status = "pending"
                    cancelled_orders_count += 1

            # Select items in order
            items: list[SyntheticOrderItem] = []
            # Choose 1 to 3 distinct products
            order_prods = rng.sample(products, k=rng.randint(1, 3))

            is_outlier = rng.random() < cfg.outlier_rate and not is_poisoned

            for p in order_prods:
                # Intermittent products have high probability of 0 sales
                if p.is_intermittent and rng.random() > 0.35:
                    continue

                if is_outlier:
                    qty = rng.randint(25, 60)  # Extreme wholesale anomaly (>99th percentile)
                    outlier_orders_count += 1
                else:
                    qty = rng.choice([1, 1, 1, 2, 2, 3])

                # Check inventory constraint
                if current_inventory[p.id] <= 0:
                    continue  # Stocked out

                qty = min(qty, current_inventory[p.id])
                if qty <= 0:
                    continue

                # Apply discount
                item_discount = daily_discount if is_promo_day else 0.0
                unit_price = round(p.base_price * (1.0 - (item_discount / 100.0)), 2)

                items.append(
                    SyntheticOrderItem(
                        product_id=p.id,
                        category_id=p.category_id,
                        quantity=qty,
                        unit_price=unit_price,
                        list_price=p.base_price,
                    )
                )

                # If this order counts as confirmed sale, subtract from stock and aggregate
                counts_as_sale = status in ("delivered", "confirmed", "shipped") and (
                    (payment_method == "cod") or (payment_status == "paid")
                )

                if counts_as_sale:
                    current_inventory[p.id] -= qty
                    day_units[p.id] += qty
                    day_rev[p.id] += unit_price * qty
                    day_order_count[p.id] += 1
                    day_discounts[p.id].append(item_discount)

            if items:
                order_time = datetime(
                    current_day.year,
                    current_day.month,
                    current_day.day,
                    rng.randint(9, 22),
                    rng.randint(0, 59),
                )
                orders.append(
                    SyntheticOrder(
                        order_id=order_id_counter,
                        customer_id=cust_id,
                        created_at=order_time,
                        status=status,
                        payment_method=payment_method,
                        payment_status=payment_status,
                        items=items,
                    )
                )

        # Record daily stock and daily sales per product
        for p in products:
            closing_stock = max(0, current_inventory[p.id])
            is_stockout = closing_stock == 0
            if is_stockout:
                stockout_days_count += 1

            daily_stock.append(
                DailyStockRecord(
                    day=current_day,
                    product_id=p.id,
                    closing_stock=closing_stock,
                    stockout_flag=is_stockout,
                )
            )

            # Record sales if any units were sold
            units_sold = day_units[p.id]
            if units_sold > 0:
                avg_disc = (
                    sum(day_discounts[p.id]) / len(day_discounts[p.id])
                    if day_discounts[p.id]
                    else 0.0
                )
                daily_sales.append(
                    DailySalesRecord(
                        day=current_day,
                        product_id=p.id,
                        category_id=p.category_id,
                        units=units_sold,
                        revenue=day_rev[p.id],
                        orders=day_order_count[p.id],
                        avg_discount_pct=avg_disc,
                    )
                )

    summary = {
        "days": days,
        "seed": seed,
        "total_orders": len(orders),
        "valid_sales_rows": len(daily_sales),
        "total_stock_snapshots": len(daily_stock),
        "outlier_orders_count": outlier_orders_count,
        "cancelled_orders_count": cancelled_orders_count,
        "rejected_orders_count": rejected_orders_count,
        "poisoned_orders_count": poisoned_orders_count,
        "stockout_events_count": stockout_days_count,
        "promotional_days_count": promo_days_count,
        "intermittent_products_count": sum(1 for p in products if p.is_intermittent),
    }

    return SyntheticDataset(
        seed=seed,
        start_date=start_date,
        end_date=end_date,
        orders=orders,
        daily_sales=daily_sales,
        daily_stock=daily_stock,
        products=products,
        summary=summary,
    )


def apply_cleaning_rules(
    dataset: SyntheticDataset, config: CleaningConfig | None = None
) -> dict[str, Any]:
    """Demonstrate and verify all cleaning rules against the synthetic dataset.

    Returns summary of cleaning actions taken:
    1. Sales filter: exclude cancelled or rejected payment orders
    2. Poison filter: detect & exclude accounts with >= 3 expired/rejected in 30 days
    3. Winsorization: clip units at 99th percentile
    4. Stock-out censoring: flag masked rows where closing_stock == 0
    """
    cfg = config or CleaningConfig()

    # Rule 1: Sales filter
    valid_orders = [
        o
        for o in dataset.orders
        if o.status not in ("cancelled", "rejected")
        and o.payment_status != "rejected"
        and (o.payment_method == "cod" or o.payment_status == "paid")
    ]
    excluded_sales_orders = len(dataset.orders) - len(valid_orders)

    # Rule 2: Poisoned account detection
    # Count rejections/expirations per customer
    bad_order_counts: dict[str, int] = {}
    for o in dataset.orders:
        if o.status == "cancelled" or o.payment_status == "rejected":
            bad_order_counts[o.customer_id] = bad_order_counts.get(o.customer_id, 0) + 1

    poisoned_detected = {
        cust_id
        for cust_id, count in bad_order_counts.items()
        if count >= cfg.poison_threshold_rejected_or_expired
    }

    # Rule 3: Winsorization at 99th percentile
    all_units = [r.units for r in dataset.daily_sales]
    all_units_sorted = sorted(all_units)
    idx_99 = int(len(all_units_sorted) * cfg.winsorize_percentile)
    p99_threshold = all_units_sorted[min(idx_99, len(all_units_sorted) - 1)] if all_units else 0

    clipped_points = sum(1 for u in all_units if u > p99_threshold)

    # Rule 4: Stock-out censoring
    stockout_rows = [s for s in dataset.daily_stock if s.stockout_flag]

    return {
        "total_raw_orders": len(dataset.orders),
        "excluded_sales_orders": excluded_sales_orders,
        "clean_orders": len(valid_orders),
        "poisoned_accounts_detected": list(poisoned_detected),
        "winsorize_p99_threshold": p99_threshold,
        "winsorize_clipped_points": clipped_points,
        "stockout_days_flagged": len(stockout_rows),
    }
