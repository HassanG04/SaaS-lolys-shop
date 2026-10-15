"""Recency, Frequency, Monetary (RFM) customer segmentation module.

Rules per ADR-0004 & analytics-plan.md Section 8:
- Quintile-based scoring (1 to 5) for Recency, Frequency, Monetary.
- Classify customers into 5 canonical segments:
  * champions: high recency (4-5), high frequency (4-5), high monetary (4-5)
  * loyal: moderate-to-high recency (3-5), moderate-to-high frequency (3-5)
  * promising: high recency (4-5), lower frequency (1-2)
  * at_risk: low recency (1-2), high frequency (3-5)
  * lost: low recency (1-2), low frequency (1-2)
- Privacy rule: groups of fewer than 5 customers merge into 'other' ("أخرى").
- Output contains only aggregate numbers (customer_count, total_revenue, avg_order_value)
  and zero personal data (zero customer IDs, names, phones, or emails).
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any


@dataclass(frozen=True)
class CustomerOrderRecord:
    customer_id: str
    order_date: date | datetime
    order_total: float


@dataclass(frozen=True)
class SegmentAggregate:
    segment: str
    customer_count: int
    total_revenue: float
    avg_order_value: float


def _assign_quintiles(values: list[float], reverse: bool = False) -> list[int]:
    """Assign quintile scores 1-5 based on empirical rank.

    If reverse is True, lowest numerical value gets score 5 (e.g. for Recency days).
    Ties share identical rank.
    """
    n = len(values)
    if n == 0:
        return []
    if n == 1:
        return [5]

    # Create sorted indices
    indexed = sorted(enumerate(values), key=lambda x: x[1], reverse=reverse)
    scores = [1] * n

    for rank, (original_idx, _) in enumerate(indexed):
        # Position from 0 to 1
        pos = rank / n
        if pos < 0.2:
            scores[original_idx] = 1
        elif pos < 0.4:
            scores[original_idx] = 2
        elif pos < 0.6:
            scores[original_idx] = 3
        elif pos < 0.8:
            scores[original_idx] = 4
        else:
            scores[original_idx] = 5

    # If reverse (where low value is best, e.g. Recency days), invert scores so best = 5
    if reverse:
        scores = [6 - s for s in scores]

    return scores


def classify_rfm_segment(r: int, f: int, m: int) -> str:
    """Classify a customer given R, F, M scores from 1 to 5."""
    if r >= 4 and f >= 4:
        return "champions"
    if r >= 3 and f >= 3:
        return "loyal"
    if r >= 4 and f <= 2:
        return "promising"
    if r <= 2 and f >= 3:
        return "at_risk"
    if r <= 2 and f <= 2:
        return "lost"
    # Fallback classifications for middle cases
    if r >= 3:
        return "promising" if f <= 2 else "loyal"
    return "at_risk" if f >= 3 else "lost"


def compute_rfm_segments(
    records: Iterable[CustomerOrderRecord | dict[str, Any]],
    as_of_date: date | None = None,
    min_group_size: int = 5,
) -> list[SegmentAggregate]:
    """Compute RFM segments from customer orders and enforce privacy threshold.

    Arguments:
        records: Collection of CustomerOrderRecord or dicts with customer_id, order_date, order_total.
        as_of_date: Reference date for recency calculation. Defaults to latest order date.
        min_group_size: Minimum customer count required per segment. Segments with fewer
                        customers are merged into 'other' per SEC/privacy rules.

    Returns:
        List of SegmentAggregate objects containing strictly aggregated statistics.
    """
    # 1. Aggregate per customer
    customer_data: dict[str, dict[str, Any]] = {}
    parsed_records: list[CustomerOrderRecord] = []

    for r in records:
        if isinstance(r, dict):
            c_id = str(r["customer_id"])
            od = r["order_date"]
            if isinstance(od, datetime):
                d = od.date()
            elif isinstance(od, date):
                d = od
            else:
                d = datetime.fromisoformat(str(od)).date()
            tot = float(r["order_total"])
            parsed_records.append(
                CustomerOrderRecord(customer_id=c_id, order_date=d, order_total=tot)
            )
        else:
            d = r.order_date.date() if isinstance(r.order_date, datetime) else r.order_date
            parsed_records.append(
                CustomerOrderRecord(
                    customer_id=r.customer_id, order_date=d, order_total=float(r.order_total)
                )
            )

    if not parsed_records:
        return []

    # Determine reference date
    max_date = max(r.order_date for r in parsed_records)
    ref_date = as_of_date or max_date

    for r in parsed_records:
        if r.customer_id not in customer_data:
            customer_data[r.customer_id] = {
                "latest_date": r.order_date,
                "frequency": 0,
                "monetary": 0.0,
            }
        c = customer_data[r.customer_id]
        if r.order_date > c["latest_date"]:
            c["latest_date"] = r.order_date
        c["frequency"] += 1
        c["monetary"] += r.order_total

    customer_ids = list(customer_data.keys())
    recencies = [(ref_date - customer_data[cid]["latest_date"]).days for cid in customer_ids]
    frequencies = [customer_data[cid]["frequency"] for cid in customer_ids]
    monetaries = [customer_data[cid]["monetary"] for cid in customer_ids]

    # 2. Score quintiles
    r_scores = _assign_quintiles(recencies, reverse=True)
    f_scores = _assign_quintiles(frequencies, reverse=False)
    m_scores = _assign_quintiles(monetaries, reverse=False)

    # 3. Classify customers into raw segment groups
    segment_counts: dict[str, int] = {
        "champions": 0,
        "loyal": 0,
        "promising": 0,
        "at_risk": 0,
        "lost": 0,
    }
    segment_revenue: dict[str, float] = {
        "champions": 0.0,
        "loyal": 0.0,
        "promising": 0.0,
        "at_risk": 0.0,
        "lost": 0.0,
    }
    segment_orders: dict[str, int] = {
        "champions": 0,
        "loyal": 0,
        "promising": 0,
        "at_risk": 0,
        "lost": 0,
    }

    for idx in range(len(customer_ids)):
        r_s, f_s, m_s = r_scores[idx], f_scores[idx], m_scores[idx]
        seg = classify_rfm_segment(r_s, f_s, m_s)
        segment_counts[seg] += 1
        segment_revenue[seg] += monetaries[idx]
        segment_orders[seg] += frequencies[idx]

    # 4. Enforce privacy rule: merge groups < min_group_size into 'other'
    final_segments: list[SegmentAggregate] = []
    other_count = 0
    other_revenue = 0.0
    other_orders = 0

    order_preference = ["champions", "loyal", "promising", "at_risk", "lost"]

    for seg in order_preference:
        count = segment_counts[seg]
        rev = segment_revenue[seg]
        orders_cnt = segment_orders[seg]

        if count < min_group_size and count > 0:
            other_count += count
            other_revenue += rev
            other_orders += orders_cnt
        elif count >= min_group_size:
            aov = round(rev / orders_cnt, 2) if orders_cnt > 0 else 0.0
            final_segments.append(
                SegmentAggregate(
                    segment=seg,
                    customer_count=count,
                    total_revenue=round(rev, 2),
                    avg_order_value=aov,
                )
            )

    if other_count > 0:
        aov = round(other_revenue / other_orders, 2) if other_orders > 0 else 0.0
        final_segments.append(
            SegmentAggregate(
                segment="other",
                customer_count=other_count,
                total_revenue=round(other_revenue, 2),
                avg_order_value=aov,
            )
        )

    return final_segments
