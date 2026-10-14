"""Calendar event modeling, Hijri conversion, and Egyptian retail event schedules.

Covers Ramadan, Eid al-Fitr, Eid al-Adha, Mother's Day, Valentine's Day,
Black Friday, and Back-to-School periods with a committed official-dates table
for 2026-2028 and algorithmic astronomical conversions.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

# Committed official dates for Egyptian / Hijri events (Dar al-Ifta moon sightings)
# Matching postgres analytics.calendar seed in migration 20261014230000_analytics_foundation.sql
COMMITTED_OFFICIAL_EVENTS: dict[int, dict[str, Any]] = {
    2026: {
        "ramadan": (date(2026, 2, 18), date(2026, 3, 19)),
        "eid_fitr": (date(2026, 3, 20), date(2026, 3, 23)),
        "eid_adha": (date(2026, 5, 27), date(2026, 5, 30)),
        "mothers_day": date(2026, 3, 21),
        "valentines": date(2026, 2, 14),
        "black_friday": date(2026, 11, 27),
        "back_to_school": (date(2026, 9, 15), date(2026, 9, 30)),
    },
    2027: {
        "ramadan": (date(2027, 2, 8), date(2027, 3, 9)),
        "eid_fitr": (date(2027, 3, 10), date(2027, 3, 13)),
        "eid_adha": (date(2027, 5, 16), date(2027, 5, 19)),
        "mothers_day": date(2027, 3, 21),
        "valentines": date(2027, 2, 14),
        "black_friday": date(2027, 11, 26),
        "back_to_school": (date(2027, 9, 15), date(2027, 9, 30)),
    },
    2028: {
        "ramadan": (date(2028, 1, 28), date(2028, 2, 26)),
        "eid_fitr": (date(2028, 2, 27), date(2028, 3, 1)),
        "eid_adha": (date(2028, 5, 5), date(2028, 5, 8)),
        "mothers_day": date(2028, 3, 21),
        "valentines": date(2028, 2, 14),
        "black_friday": date(2028, 11, 24),
        "back_to_school": (date(2028, 9, 15), date(2028, 9, 30)),
    },
}


@dataclass(frozen=True)
class CalendarDay:
    """Strongly typed representation of a calendar day and its event flags."""

    day: date
    weekday: int  # 0=Sunday, 1=Monday, ..., 6=Saturday (matches PostgreSQL DOW extract)
    iso_weekday: int  # 1=Monday, ..., 7=Sunday
    is_weekend: bool  # Friday & Saturday in Egypt
    ramadan: bool
    eid_fitr: bool
    eid_adha: bool
    mothers_day: bool
    valentines: bool
    black_friday: bool
    back_to_school: bool
    event_name: str | None


def gregorian_to_jd(year: int, month: int, day: int) -> int:
    """Converts a Gregorian date to Julian Day number (integer)."""
    if month <= 2:
        year -= 1
        month += 12
    a = year // 100
    b = 2 - a + (a // 4)
    return int(365.25 * (year + 4716)) + int(30.6001 * (month + 1)) + day + b - 1524


def jd_to_gregorian(jd: int) -> date:
    """Converts a Julian Day number to a Gregorian date."""
    l_val = jd + 68569
    n = (4 * l_val) // 146097
    l_val = l_val - (146097 * n + 3) // 4
    i = (4000 * (l_val + 1)) // 1461001
    l_val = l_val - (1461 * i) // 4 + 31
    j = (80 * l_val) // 2447
    day = l_val - (2447 * j) // 80
    l_val = j // 11
    month = j + 2 - 12 * l_val
    year = 100 * (n - 49) + i + l_val
    return date(year, month, day)


def jd_to_hijri(jd: int) -> tuple[int, int, int]:
    """Converts a Julian Day number to tabular Islamic calendar (year, month, day)."""
    jd_int = int(jd)
    l_val = jd_int - 1948440 + 10632
    n = (l_val - 1) // 10631
    l_val = l_val - 10631 * n + 354
    j = ((10985 - l_val) // 5316) * ((50 * l_val) // 17719) + (l_val // 5670) * (
        (43 * l_val) // 15238
    )
    l_val = l_val - ((30 - j) // 15) * ((17719 * j) // 50) - (j // 16) * ((15238 * j) // 43) + 29
    month = (24 * l_val) // 709
    day = l_val - (709 * month) // 24
    year = 30 * n + j - 30
    return year, month, day


def hijri_to_jd(year: int, month: int, day: int) -> int:
    """Converts tabular Islamic date (year, month, day) to Julian Day number."""
    return (
        day
        + int(29.5001 * (month - 1) + 0.99)
        + 354 * (year - 1)
        + (3 + (11 * year)) // 30
        + 1948438
    )


def gregorian_to_hijri(d: date) -> tuple[int, int, int]:
    """Converts a Gregorian date to Hijri (year, month, day)."""
    jd = gregorian_to_jd(d.year, d.month, d.day)
    return jd_to_hijri(jd)


def hijri_to_gregorian(year: int, month: int, day: int) -> date:
    """Converts a Hijri date to Gregorian date."""
    jd = hijri_to_jd(year, month, day)
    return jd_to_gregorian(jd)


def get_black_friday(year: int) -> date:
    """Returns the date of Black Friday for a given year (last Friday of November)."""
    # In Egypt / retail, Black Friday is the last Friday in November (between Nov 22 and Nov 28)
    for day in range(22, 29):
        candidate = date(year, 11, day)
        if candidate.weekday() == 4:  # Friday in Python (0=Mon, 4=Fri)
            return candidate
    # Fallback to Nov 27
    return date(year, 11, 27)


def get_mothers_day(year: int) -> date:
    """Egyptian Mother's Day is always 21 March."""
    return date(year, 3, 21)


def get_valentines_day(year: int) -> date:
    """Valentine's Day is always 14 February."""
    return date(year, 2, 14)


def get_back_to_school_range(year: int) -> tuple[date, date]:
    """Egyptian back-to-school period runs 15 to 30 September."""
    return date(year, 9, 15), date(year, 9, 30)


def estimate_hijri_events_algorithmic(gregorian_year: int) -> dict[str, tuple[date, date]]:
    """Calculates algorithmic Gregorian date ranges for major Hijri events in a Gregorian year."""
    # Hijri year approximately corresponds to (gregorian_year - 622) * 33 // 32
    # Estimate Hijri year starting around gregorian_year
    approx_hijri_year = int((gregorian_year - 621.5) * (33.0 / 32.0))
    events: dict[str, tuple[date, date]] = {}

    for h_yr in (approx_hijri_year - 1, approx_hijri_year, approx_hijri_year + 1):
        # Ramadan: Month 9 (days 1 to 29 or 30)
        ram_start = hijri_to_gregorian(h_yr, 9, 1)
        ram_end = hijri_to_gregorian(h_yr, 9, 30)
        if ram_start.year == gregorian_year or ram_end.year == gregorian_year:
            events["ramadan"] = (ram_start, ram_end)

        # Eid al-Fitr: Month 10 (days 1 to 4)
        fitr_start = hijri_to_gregorian(h_yr, 10, 1)
        fitr_end = hijri_to_gregorian(h_yr, 10, 4)
        if fitr_start.year == gregorian_year or fitr_end.year == gregorian_year:
            events["eid_fitr"] = (fitr_start, fitr_end)

        # Eid al-Adha: Month 12 (days 10 to 13)
        adha_start = hijri_to_gregorian(h_yr, 12, 10)
        adha_end = hijri_to_gregorian(h_yr, 12, 13)
        if adha_start.year == gregorian_year or adha_end.year == gregorian_year:
            events["eid_adha"] = (adha_start, adha_end)

    return events


def cross_check_events(year: int) -> dict[str, dict[str, Any]]:
    """Compares committed official dates against algorithmic calculations.

    Returns a report showing match status and day delta (official moon sighting
    typically varies by at most +/- 1 day from the tabular calendar).
    """
    if year not in COMMITTED_OFFICIAL_EVENTS:
        raise ValueError(f"Year {year} is not in committed official events table.")

    official = COMMITTED_OFFICIAL_EVENTS[year]
    algo = estimate_hijri_events_algorithmic(year)
    results: dict[str, dict[str, Any]] = {}

    for event_key in ("ramadan", "eid_fitr", "eid_adha"):
        off_start, off_end = official[event_key]
        if event_key in algo:
            algo_start, algo_end = algo[event_key]
            delta_start = (off_start - algo_start).days
            delta_end = (off_end - algo_end).days
            results[event_key] = {
                "official": (off_start.isoformat(), off_end.isoformat()),
                "algorithmic": (algo_start.isoformat(), algo_end.isoformat()),
                "delta_start_days": delta_start,
                "delta_end_days": delta_end,
                "aligned": abs(delta_start) <= 2 and abs(delta_end) <= 2,
            }
        else:
            results[event_key] = {
                "official": (off_start.isoformat(), off_end.isoformat()),
                "algorithmic": None,
                "aligned": False,
            }

    return results


def get_calendar_day(d: date) -> CalendarDay:
    """Builds a CalendarDay record with all event and weekend flags for a given date.

    Uses committed official dates if the year is in COMMITTED_OFFICIAL_EVENTS,
    falling back to algorithmic calculations for other years.
    """
    # PostgreSQL DOW: 0=Sunday, 1=Monday, ..., 6=Saturday
    # Python weekday(): 0=Monday, 6=Sunday
    pg_weekday = (d.weekday() + 1) % 7
    iso_weekday = d.isoweekday()
    is_weekend = pg_weekday in (5, 6)  # Friday (5) & Saturday (6)

    # Fixed date events
    is_mothers_day = d.month == 3 and d.day == 21
    is_valentines = d.month == 2 and d.day == 14
    is_back_to_school = d.month == 9 and 15 <= d.day <= 30

    # Black Friday
    black_friday_date = get_black_friday(d.year)
    is_black_friday = d == black_friday_date

    # Hijri events: prefer committed official table, else algorithmic
    ramadan = False
    eid_fitr = False
    eid_adha = False

    if d.year in COMMITTED_OFFICIAL_EVENTS:
        off = COMMITTED_OFFICIAL_EVENTS[d.year]
        ramadan = off["ramadan"][0] <= d <= off["ramadan"][1]
        eid_fitr = off["eid_fitr"][0] <= d <= off["eid_fitr"][1]
        eid_adha = off["eid_adha"][0] <= d <= off["eid_adha"][1]
    else:
        algo = estimate_hijri_events_algorithmic(d.year)
        if "ramadan" in algo:
            ramadan = algo["ramadan"][0] <= d <= algo["ramadan"][1]
        if "eid_fitr" in algo:
            eid_fitr = algo["eid_fitr"][0] <= d <= algo["eid_fitr"][1]
        if "eid_adha" in algo:
            eid_adha = algo["eid_adha"][0] <= d <= algo["eid_adha"][1]

    event_name = None
    if ramadan:
        event_name = "ramadan"
    elif eid_fitr:
        event_name = "eid_fitr"
    elif eid_adha:
        event_name = "eid_adha"
    elif is_mothers_day:
        event_name = "mothers_day"
    elif is_valentines:
        event_name = "valentines"
    elif is_black_friday:
        event_name = "black_friday"
    elif is_back_to_school:
        event_name = "back_to_school"

    return CalendarDay(
        day=d,
        weekday=pg_weekday,
        iso_weekday=iso_weekday,
        is_weekend=is_weekend,
        ramadan=ramadan,
        eid_fitr=eid_fitr,
        eid_adha=eid_adha,
        mothers_day=is_mothers_day,
        valentines=is_valentines,
        black_friday=is_black_friday,
        back_to_school=is_back_to_school,
        event_name=event_name,
    )


def generate_calendar_range(start_date: date, end_date: date) -> list[CalendarDay]:
    """Generates consecutive CalendarDay records between start_date and end_date (inclusive)."""
    days: list[CalendarDay] = []
    current = start_date
    one_day = timedelta(days=1)
    while current <= end_date:
        days.append(get_calendar_day(current))
        current += one_day
    return days
