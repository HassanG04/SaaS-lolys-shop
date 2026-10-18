"""Customer cohort retention analysis module.

Rules per ADR-0004 & analytics-plan.md Section 8:
- Customers grouped by first-order month (cohort_month, e.g. 2026-01-01).
- For each subsequent month (period_months = 0, 1, 2, ...):
  * cohort_size: total distinct customers who placed their first order in cohort_month.
  * active_customers: distinct cohort customers who ordered in cohort_month + period_months.
  * retention_rate: active_customers / cohort_size.
- Output contains only aggregate counts and rates; zero customer personal information.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any


@dataclass(frozen=True)
class CustomerActivity:
    customer_id: str
    order_date: date | datetime


@dataclass(frozen=True)
class CohortRetentionPeriod:
    cohort_month: date
    period_months: int
    cohort_size: int
    active_customers: int
    retention_rate: float


def _to_month_start(d: date | datetime | str) -> date:
    """Normalize date to first day of month."""
    if isinstance(d, datetime):
        return date(d.year, d.month, 1)
    if isinstance(d, date):
        return date(d.year, d.month, 1)
    # Parse string (ISO format or YYYY-MM-DD)
    parsed = datetime.fromisoformat(str(d)).date()
    return date(parsed.year, parsed.month, 1)


def _month_diff(start: date, end: date) -> int:
    """Calculate integer month difference between two dates."""
    return (end.year - start.year) * 12 + (end.month - start.month)


def compute_cohort_retention(
    records: Iterable[CustomerActivity | dict[str, Any]],
) -> list[CohortRetentionPeriod]:
    """Compute monthly cohort retention matrix.

    Arguments:
        records: Collection of CustomerActivity or dicts with 'customer_id' and 'order_date'.

    Returns:
        List of CohortRetentionPeriod objects sorted by cohort_month asc, period_months asc.
    """
    # 1. Gather all activity per customer
    customer_months: dict[str, set[date]] = {}

    for r in records:
        if isinstance(r, dict):
            cid = str(r["customer_id"])
            m = _to_month_start(r["order_date"])
        else:
            cid = r.customer_id
            m = _to_month_start(r.order_date)

        if cid not in customer_months:
            customer_months[cid] = set()
        customer_months[cid].add(m)

    if not customer_months:
        return []

    # 2. Identify first order month for each customer
    customer_first_month: dict[str, date] = {
        cid: min(months) for cid, months in customer_months.items()
    }

    # 3. Group customers by cohort month
    cohort_members: dict[date, set[str]] = {}
    for cid, first_m in customer_first_month.items():
        if first_m not in cohort_members:
            cohort_members[first_m] = set()
        cohort_members[first_m].add(cid)

    # 4. For each cohort, compute retention across periods
    results: list[CohortRetentionPeriod] = []

    for cohort_m in sorted(cohort_members.keys()):
        members = cohort_members[cohort_m]
        cohort_size = len(members)

        # Find all subsequent months where any member had activity
        max_active_month = max(max(customer_months[cid]) for cid in members)
        max_period = _month_diff(cohort_m, max_active_month)

        for period in range(max_period + 1):
            # Target month is cohort_m + period months
            target_year = cohort_m.year + (cohort_m.month - 1 + period) // 12
            target_month_num = (cohort_m.month - 1 + period) % 12 + 1
            target_m = date(target_year, target_month_num, 1)

            active_count = sum(1 for cid in members if target_m in customer_months[cid])
            retention_rate = active_count / cohort_size if cohort_size > 0 else 0.0

            results.append(
                CohortRetentionPeriod(
                    cohort_month=cohort_m,
                    period_months=period,
                    cohort_size=cohort_size,
                    active_customers=active_count,
                    retention_rate=round(retention_rate, 4),
                )
            )

    return results
