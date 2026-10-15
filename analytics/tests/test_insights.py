"""Unit tests for descriptive insights modules (RFM, Basket, Cohorts, and Persistence).

Verifies:
1. RFM quintile calculations and classification into canonical segments.
2. Privacy rule enforcement (< 5 customers merged into 'other', zero PII).
3. Market basket affinity support, confidence, and lift calculation on hand-computed data.
4. Monthly cohort retention matrix and retention rates on hand-computed data.
5. write_insights transaction atomicity and schema compliance.
"""

from __future__ import annotations

import datetime as dt
import unittest
from typing import Any

from lolys_analytics.insights.basket import BasketPair, compute_basket_pairs
from lolys_analytics.insights.cohorts import CohortRetentionPeriod, compute_cohort_retention
from lolys_analytics.insights.rfm import (
    CustomerOrderRecord,
    SegmentAggregate,
    classify_rfm_segment,
    compute_rfm_segments,
)
from lolys_analytics.write import write_insights


class TestRFMSegmentation(unittest.TestCase):
    def test_classify_rfm_segment_rules(self) -> None:
        self.assertEqual(classify_rfm_segment(5, 5, 5), "champions")
        self.assertEqual(classify_rfm_segment(4, 4, 3), "champions")
        self.assertEqual(classify_rfm_segment(3, 3, 3), "loyal")
        self.assertEqual(classify_rfm_segment(5, 1, 2), "promising")
        self.assertEqual(classify_rfm_segment(1, 4, 4), "at_risk")
        self.assertEqual(classify_rfm_segment(1, 1, 1), "lost")

    def test_privacy_threshold_merges_small_segments_into_other(self) -> None:
        # Create 12 customers: 6 champions and 3 at_risk and 3 lost
        # With min_group_size = 5, the at_risk and lost segments (< 5) must merge into 'other'
        records: list[CustomerOrderRecord] = []
        ref_date = dt.date(2026, 6, 1)

        # 6 frequent, recent, high spenders (Champions)
        for i in range(1, 7):
            cid = f"cust_champ_{i}"
            records.append(CustomerOrderRecord(cid, dt.date(2026, 5, 30), 500.0))
            records.append(CustomerOrderRecord(cid, dt.date(2026, 5, 20), 500.0))
            records.append(CustomerOrderRecord(cid, dt.date(2026, 5, 10), 500.0))
            records.append(CustomerOrderRecord(cid, dt.date(2026, 5, 1), 500.0))

        # 3 customers with old orders but high frequency (At Risk)
        for i in range(1, 4):
            cid = f"cust_risk_{i}"
            records.append(CustomerOrderRecord(cid, dt.date(2026, 1, 10), 300.0))
            records.append(CustomerOrderRecord(cid, dt.date(2026, 1, 20), 300.0))
            records.append(CustomerOrderRecord(cid, dt.date(2026, 2, 1), 300.0))

        # 3 single old low orders (Lost)
        for i in range(1, 4):
            cid = f"cust_lost_{i}"
            records.append(CustomerOrderRecord(cid, dt.date(2026, 1, 5), 50.0))

        segments = compute_rfm_segments(records, as_of_date=ref_date, min_group_size=5)
        # Any segment with < 5 must not appear under its raw name if merged
        for s in segments:
            if s.segment != "other":
                self.assertGreaterEqual(s.customer_count, 5)

        # 'other' should absorb the remaining customers (< 5)
        other_seg = next((s for s in segments if s.segment == "other"), None)
        self.assertIsNotNone(other_seg)
        self.assertEqual(sum(s.customer_count for s in segments), 12)
        self.assertEqual(other_seg.customer_count, 7)

        # Assert zero PII
        for s in segments:
            self.assertIsInstance(s.customer_count, int)
            self.assertIsInstance(s.total_revenue, float)
            self.assertIsInstance(s.avg_order_value, float)
            self.assertFalse(hasattr(s, "customer_id"))
            self.assertFalse(hasattr(s, "email"))

    def test_empty_records_returns_empty_list(self) -> None:
        self.assertEqual(compute_rfm_segments([]), [])


class TestMarketBasketAnalysis(unittest.TestCase):
    def test_hand_computed_basket_metrics(self) -> None:
        # 5 orders:
        # Order 0: {1, 2}
        # Order 1: {1, 2, 3}
        # Order 2: {1, 2}
        # Order 3: {1, 3}
        # Order 4: {2, 4}
        orders = [
            [1, 2],
            [1, 2, 3],
            [1, 2],
            [1, 3],
            [2, 4],
        ]
        # Pair (1, 2):
        # joint_count = 3 (orders 0, 1, 2)
        # support = 3 / 5 = 0.60
        # item 1 occurs in 4 orders (0, 1, 2, 3)
        # item 2 occurs in 4 orders (0, 1, 2, 4)
        # conf(1->2) = 3 / 4 = 0.75
        # conf(2->1) = 3 / 4 = 0.75 -> max = 0.75
        # lift = (3 * 5) / (4 * 4) = 15 / 16 = 0.9375
        pairs = compute_basket_pairs(orders, min_support=0.01, min_orders=1)
        pair_1_2 = next((p for p in pairs if p.product_a_id == 1 and p.product_b_id == 2), None)
        self.assertIsNotNone(pair_1_2)
        self.assertAlmostEqual(pair_1_2.support, 0.60, places=3)
        self.assertAlmostEqual(pair_1_2.confidence, 0.75, places=3)
        self.assertAlmostEqual(pair_1_2.lift, 0.9375, places=3)
        self.assertEqual(pair_1_2.sample_orders, 3)

    def test_lift_greater_than_one(self) -> None:
        # 10 orders: items 10 and 20 only appear together in 4 orders, never alone
        # item 30 appears in the other 6 orders
        orders = [
            [10, 20],
            [10, 20],
            [10, 20],
            [10, 20],
            [30],
            [30],
            [30],
            [30],
            [30],
            [30],
        ]
        # Pair (10, 20):
        # joint = 4, total = 10, count(10) = 4, count(20) = 4
        # lift = (4 * 10) / (4 * 4) = 40 / 16 = 2.5
        pairs = compute_basket_pairs(orders, min_support=0.05, min_orders=2)
        self.assertEqual(len(pairs), 1)
        p = pairs[0]
        self.assertEqual((p.product_a_id, p.product_b_id), (10, 20))
        self.assertEqual(p.support, 0.4)
        self.assertEqual(p.confidence, 1.0)
        self.assertEqual(p.lift, 2.5)

    def test_threshold_filtering(self) -> None:
        # Pair with 1 order out of 100 has support 0.01 (< 0.02) and sample 1 (< 5)
        orders = [[1, 2]] + [[3]] * 99
        pairs = compute_basket_pairs(orders, min_support=0.02, min_orders=5)
        self.assertEqual(len(pairs), 0)


class TestCohortRetention(unittest.TestCase):
    def test_hand_computed_cohort_matrix(self) -> None:
        # Cohort 2026-01:
        # User A: 2026-01-10, 2026-02-15, 2026-03-01
        # User B: 2026-01-20, 2026-03-12
        # User C: 2026-01-25
        # Total cohort size = 3
        # Period 0 (Jan): 3 / 3 = 1.0
        # Period 1 (Feb): 1 / 3 = 0.3333 (User A)
        # Period 2 (Mar): 2 / 3 = 0.6667 (User A, User B)
        # Cohort 2026-02:
        # User D: 2026-02-05, 2026-03-10
        # Total cohort size = 1
        # Period 0 (Feb): 1 / 1 = 1.0
        # Period 1 (Mar): 1 / 1 = 1.0
        records = [
            {"customer_id": "A", "order_date": "2026-01-10"},
            {"customer_id": "A", "order_date": "2026-02-15"},
            {"customer_id": "A", "order_date": "2026-03-01"},
            {"customer_id": "B", "order_date": "2026-01-20"},
            {"customer_id": "B", "order_date": "2026-03-12"},
            {"customer_id": "C", "order_date": "2026-01-25"},
            {"customer_id": "D", "order_date": "2026-02-05"},
            {"customer_id": "D", "order_date": "2026-03-10"},
        ]

        matrix = compute_cohort_retention(records)

        # Cohort Jan (2026-01-01)
        jan_c = [m for m in matrix if m.cohort_month == dt.date(2026, 1, 1)]
        self.assertEqual(len(jan_c), 3)  # periods 0, 1, 2
        p0, p1, p2 = jan_c[0], jan_c[1], jan_c[2]
        self.assertEqual(p0.period_months, 0)
        self.assertEqual(p0.cohort_size, 3)
        self.assertEqual(p0.active_customers, 3)
        self.assertEqual(p0.retention_rate, 1.0)

        self.assertEqual(p1.period_months, 1)
        self.assertEqual(p1.active_customers, 1)
        self.assertAlmostEqual(p1.retention_rate, 0.3333, places=3)

        self.assertEqual(p2.period_months, 2)
        self.assertEqual(p2.active_customers, 2)
        self.assertAlmostEqual(p2.retention_rate, 0.6667, places=3)

        # Cohort Feb (2026-02-01)
        feb_c = [m for m in matrix if m.cohort_month == dt.date(2026, 2, 1)]
        self.assertEqual(len(feb_c), 2)  # periods 0, 1
        fp0, fp1 = feb_c[0], feb_c[1]
        self.assertEqual(fp0.period_months, 0)
        self.assertEqual(fp0.cohort_size, 1)
        self.assertEqual(fp0.active_customers, 1)
        self.assertEqual(fp0.retention_rate, 1.0)

        self.assertEqual(fp1.period_months, 1)
        self.assertEqual(fp1.cohort_size, 1)
        self.assertEqual(fp1.active_customers, 1)
        self.assertEqual(fp1.retention_rate, 1.0)


class MockDbCursor:
    def __init__(self) -> None:
        self.queries: list[tuple[str, tuple[Any, ...]]] = []

    def execute(self, sql: str, params: tuple[Any, ...] = ()) -> None:
        self.queries.append((sql, params))

    def fetchone(self) -> dict[str, Any]:
        return {"id": 1}

    def __enter__(self) -> MockDbCursor:
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        pass


class MockDbConnection:
    def __init__(self) -> None:
        self.cursor_instance = MockDbCursor()
        self.committed = False
        self.rolled_back = False

    def cursor(self) -> MockDbCursor:
        return self.cursor_instance

    def commit(self) -> None:
        self.committed = True

    def rollback(self) -> None:
        self.rolled_back = True


class TestWriteInsights(unittest.TestCase):
    def test_write_insights_executes_queries_and_commits(self) -> None:
        conn = MockDbConnection()
        basket = [BasketPair(1, 2, 0.1, 0.5, 1.5, 10)]
        cohorts = [CohortRetentionPeriod(dt.date(2026, 1, 1), 0, 5, 5, 1.0)]
        segments = [SegmentAggregate("champions", 10, 5000.0, 500.0)]

        write_insights(
            conn,
            basket_pairs=basket,
            cohort_periods=cohorts,
            customer_segments=segments,
        )

        self.assertTrue(conn.committed)
        self.assertFalse(conn.rolled_back)
        executed_sqls = " ".join(q[0] for q in conn.cursor_instance.queries)
        self.assertIn("analytics.basket_pairs", executed_sqls)
        self.assertIn("analytics.cohort_retention", executed_sqls)
        self.assertIn("analytics.customer_segments", executed_sqls)

    def test_write_insights_rolls_back_on_exception(self) -> None:
        conn = MockDbConnection()

        def failing_execute(sql: str, params: tuple[Any, ...] = ()) -> None:
            raise RuntimeError("Database connection severed")

        conn.cursor_instance.execute = failing_execute  # type: ignore[assignment]

        with self.assertRaises(RuntimeError):
            write_insights(conn, basket_pairs=[BasketPair(1, 2, 0.1, 0.5, 1.5, 10)])

        self.assertTrue(conn.rolled_back)
        self.assertFalse(conn.committed)


if __name__ == "__main__":
    unittest.main()
