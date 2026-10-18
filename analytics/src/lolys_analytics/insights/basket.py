"""Market basket analysis (product affinity / co-occurrence) module.

Rules per ADR-0004 & analytics-plan.md Section 8:
- Product pairs with support at least 2% (0.02) or at least 5 orders.
- Computes support, confidence, and lift.
- Feeds "frequently bought together" suggestions.
- Output contains only product IDs, support, confidence, lift, sample_orders
  and zero personal customer information.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass
from itertools import combinations
from typing import Any


@dataclass(frozen=True)
class BasketPair:
    product_a_id: int
    product_b_id: int
    support: float
    confidence: float
    lift: float
    sample_orders: int


def compute_basket_pairs(
    orders: Iterable[Iterable[int] | dict[str, Any]],
    min_support: float = 0.02,
    min_orders: int = 5,
) -> list[BasketPair]:
    """Compute product pairs meeting support or order count threshold.

    Arguments:
        orders: Collection of orders, where each order is an iterable of product_ids
                or a dict containing a 'product_ids' or 'items' key.
        min_support: Minimum support threshold (default 0.02 = 2%).
        min_orders: Minimum joint order count threshold (default 5).

    Returns:
        List of BasketPair objects sorted by lift descending.
    """
    cleaned_orders: list[set[int]] = []

    for o in orders:
        if isinstance(o, dict):
            if "product_ids" in o:
                pids = {int(p) for p in o["product_ids"]}
            elif "items" in o:
                pids = {
                    int(it["product_id"] if isinstance(it, dict) else it.product_id)
                    for it in o["items"]
                }
            else:
                pids = set()
        else:
            pids = {int(p) for p in o}

        if len(pids) >= 1:
            cleaned_orders.append(pids)

    total_orders = len(cleaned_orders)
    if total_orders == 0:
        return []

    # Count single product occurrences
    product_counts: Counter[int] = Counter()
    for pids in cleaned_orders:
        product_counts.update(pids)

    # Count pair co-occurrences
    pair_counts: Counter[tuple[int, int]] = Counter()
    for pids in cleaned_orders:
        if len(pids) >= 2:
            sorted_pids = sorted(pids)
            for a, b in combinations(sorted_pids, 2):
                pair_counts[(a, b)] += 1

    results: list[BasketPair] = []

    for (a, b), joint_count in pair_counts.items():
        support = joint_count / total_orders
        if support >= min_support or joint_count >= min_orders:
            count_a = product_counts[a]
            count_b = product_counts[b]

            # Confidence is max of A->B and B->A for the undirected pair
            conf_a_to_b = joint_count / count_a if count_a > 0 else 0.0
            conf_b_to_a = joint_count / count_b if count_b > 0 else 0.0
            confidence = max(conf_a_to_b, conf_b_to_a)

            # Lift = S(A, B) / (S(A) * S(B)) = (joint_count * total_orders) / (count_a * count_b)
            if count_a > 0 and count_b > 0:
                lift = (joint_count * total_orders) / (count_a * count_b)
            else:
                lift = 0.0

            results.append(
                BasketPair(
                    product_a_id=a,
                    product_b_id=b,
                    support=round(support, 4),
                    confidence=round(confidence, 4),
                    lift=round(lift, 4),
                    sample_orders=joint_count,
                )
            )

    # Sort by lift descending, then joint count descending
    results.sort(key=lambda x: (x.lift, x.sample_orders), reverse=True)
    return results
