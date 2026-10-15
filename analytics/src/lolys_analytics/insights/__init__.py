"""Descriptive analytics and customer insights module for Lolys' Accessories & Home."""

from __future__ import annotations

from lolys_analytics.insights.basket import compute_basket_pairs
from lolys_analytics.insights.cohorts import compute_cohort_retention
from lolys_analytics.insights.rfm import compute_rfm_segments

__all__ = [
    "compute_basket_pairs",
    "compute_cohort_retention",
    "compute_rfm_segments",
]
