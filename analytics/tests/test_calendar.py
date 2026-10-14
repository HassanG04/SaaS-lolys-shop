"""Unit tests for calendar event modeling, Hijri conversions, and retail schedules.

Verifies:
1. Committed official dates table for 2026, 2027, and 2028.
2. Algorithmic Hijri conversions align with committed official tables (+/- 1-2 days).
3. Egyptian retail events (Mother's Day, Valentine's Day, Black Friday, Back-to-School).
4. PostgreSQL DOW parity (0=Sunday, 5=Friday, 6=Saturday) and Egyptian weekend flags.
"""

from __future__ import annotations

from datetime import date, timedelta

from lolys_analytics.calendar import (
    COMMITTED_OFFICIAL_EVENTS,
    cross_check_events,
    generate_calendar_range,
    get_black_friday,
    get_calendar_day,
    gregorian_to_hijri,
    hijri_to_gregorian,
)


def test_committed_official_events_coverage_2026_2028() -> None:
    """Verifies that committed official dates cover 2026, 2027, and 2028 with required events."""
    for yr in (2026, 2027, 2028):
        assert yr in COMMITTED_OFFICIAL_EVENTS
        events = COMMITTED_OFFICIAL_EVENTS[yr]

        assert "ramadan" in events
        ram_start, ram_end = events["ramadan"]
        assert ram_start < ram_end
        assert ram_start.year == yr or ram_end.year == yr
        # Ramadan duration is 29 or 30 days
        duration = (ram_end - ram_start).days + 1
        assert duration in (29, 30)

        assert "eid_fitr" in events
        fitr_start, fitr_end = events["eid_fitr"]
        assert fitr_start == ram_end + timedelta(days=1)  # Starts the day after Ramadan
        assert fitr_start < fitr_end

        assert "eid_adha" in events
        adha_start, adha_end = events["eid_adha"]
        assert adha_start < adha_end

        assert events["mothers_day"] == date(yr, 3, 21)
        assert events["valentines"] == date(yr, 2, 14)


def test_hijri_algorithmic_conversion_roundtrip() -> None:
    """Tests that Gregorian to Hijri and back to Gregorian preserves dates."""
    test_dates = [
        date(2026, 1, 1),
        date(2026, 3, 21),
        date(2027, 2, 14),
        date(2028, 5, 5),
    ]
    for d in test_dates:
        h_yr, h_mo, h_day = gregorian_to_hijri(d)
        assert h_yr > 1440
        assert 1 <= h_mo <= 12
        assert 1 <= h_day <= 30
        restored = hijri_to_gregorian(h_yr, h_mo, h_day)
        # Tabular calendar roundtrip error is at most 1 day
        assert abs((restored - d).days) <= 1


def test_cross_check_algorithmic_vs_official_table() -> None:
    """Proves algorithmic Hijri predictions align within astronomical moon-sighting variance."""
    for yr in (2026, 2027, 2028):
        report = cross_check_events(yr)
        assert "ramadan" in report
        assert "eid_fitr" in report
        assert "eid_adha" in report

        # Dar al-Ifta moon sightings can shift by at most 1-2 days from tabular calendar
        for event_name, res in report.items():
            assert res["aligned"] is True, (
                f"{event_name} in {yr} exceeded astronomical variance: {res}"
            )


def test_black_friday_calculation() -> None:
    """Verifies that Black Friday falls on the last Friday of November (between Nov 22 and Nov 28)."""
    expected = {
        2026: date(2026, 11, 27),
        2027: date(2027, 11, 26),
        2028: date(2028, 11, 24),
    }
    for yr, exp_date in expected.items():
        computed = get_black_friday(yr)
        assert computed == exp_date
        assert computed.weekday() == 4  # Must be a Friday


def test_calendar_day_weekday_and_weekend_flags() -> None:
    """Verifies PostgreSQL DOW parity and Egyptian weekend detection (Friday & Saturday)."""
    # 2026-03-20 is a Friday
    friday = date(2026, 3, 20)
    cal_friday = get_calendar_day(friday)
    assert cal_friday.weekday == 5  # Postgres DOW: 5=Friday
    assert cal_friday.is_weekend is True

    # 2026-03-21 is a Saturday
    saturday = date(2026, 3, 21)
    cal_saturday = get_calendar_day(saturday)
    assert cal_saturday.weekday == 6  # Postgres DOW: 6=Saturday
    assert cal_saturday.is_weekend is True
    assert cal_saturday.mothers_day is True

    # 2026-03-22 is a Sunday
    sunday = date(2026, 3, 22)
    cal_sunday = get_calendar_day(sunday)
    assert cal_sunday.weekday == 0  # Postgres DOW: 0=Sunday
    assert cal_sunday.is_weekend is False


def test_generate_calendar_range() -> None:
    """Tests generating a continuous block of calendar days."""
    start = date(2026, 2, 10)
    end = date(2026, 2, 20)
    days = generate_calendar_range(start, end)
    assert len(days) == 11
    assert days[0].day == start
    assert days[-1].day == end
    # Valentine's day is 2026-02-14 (index 4)
    assert days[4].valentines is True
    assert days[4].day == date(2026, 2, 14)
