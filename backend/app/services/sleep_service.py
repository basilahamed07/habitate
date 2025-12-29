from datetime import date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.sleep_entry import SleepEntry
from app.models.user import User

DAYS = min(settings.TRACK_WINDOW_DAYS, 31)

BUCKETS = [
    {"label": "0-3 hrs", "min": 0.0, "max": 3.0},
    {"label": "3-5 hrs", "min": 3.0, "max": 5.0},
    {"label": "5-7 hrs", "min": 5.0, "max": 7.0},
    {"label": "7-9 hrs", "min": 7.0, "max": 9.0},
    {"label": "9+ hrs", "min": 9.0, "max": None}
]


def _get_window_dates() -> list[date]:
    end_date = date.today()
    start_date = end_date - timedelta(days=DAYS - 1)
    return [start_date + timedelta(days=offset) for offset in range(DAYS)]


def _bucket_for_hours(hours: float) -> int:
    for index, bucket in enumerate(BUCKETS):
        min_hours = bucket["min"]
        max_hours = bucket["max"]
        if max_hours is None:
            if hours >= min_hours:
                return index
        else:
            if hours >= min_hours and hours < max_hours:
                return index
    return 0


def list_sleep(db: Session, user_id: int) -> dict:
    window_dates = _get_window_dates()
    start_date = window_dates[0]
    end_date = window_dates[-1]
    rows = (
        db.query(SleepEntry)
        .filter(
            SleepEntry.user_id == user_id,
            SleepEntry.sleep_date >= start_date,
            SleepEntry.sleep_date <= end_date
        )
        .order_by(SleepEntry.sleep_date.asc())
        .all()
    )
    entry_map = {row.sleep_date: row for row in rows}
    daily_hours = []
    day_buckets = []
    for current_date in window_dates:
        entry = entry_map.get(current_date)
        if entry:
            hours = float(entry.duration_hours)
            daily_hours.append(hours)
            day_buckets.append(_bucket_for_hours(hours))
        else:
            daily_hours.append(None)
            day_buckets.append(-1)

    logged_entries = [hours for hours in daily_hours if hours is not None]
    total_logged = len(logged_entries)
    average_hours = round(sum(logged_entries) / total_logged, 2) if total_logged else 0.0
    best_sleep = round(max(logged_entries), 2) if total_logged else 0.0

    bucket_counts = [0] * len(BUCKETS)
    for hours in logged_entries:
        bucket_counts[_bucket_for_hours(hours)] += 1

    categories = []
    for index, bucket in enumerate(BUCKETS):
        count = bucket_counts[index]
        percent = round((count / total_logged) * 100) if total_logged else 0
        categories.append(
            {
                "index": index,
                "label": bucket["label"],
                "minHours": bucket["min"],
                "maxHours": bucket["max"],
                "count": count,
                "percent": percent
            }
        )

    entries = [
        {"id": row.id, "date": row.sleep_date, "hours": float(row.duration_hours)}
        for row in rows
    ]

    return {
        "entries": entries,
        "dailyHours": daily_hours,
        "dayBuckets": day_buckets,
        "categories": categories,
        "averageHours": average_hours,
        "totalEntries": total_logged,
        "bestSleep": best_sleep,
        "days": DAYS
    }


def upsert_sleep(db: Session, user_id: int, sleep_date: date, hours: float) -> SleepEntry:
    entry = (
        db.query(SleepEntry)
        .filter(SleepEntry.user_id == user_id, SleepEntry.sleep_date == sleep_date)
        .first()
    )
    if entry:
        entry.duration_hours = hours
        db.commit()
        db.refresh(entry)
        return entry

    entry = SleepEntry(user_id=user_id, sleep_date=sleep_date, duration_hours=hours)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def delete_sleep(db: Session, user_id: int, entry_id: int) -> bool:
    entry = (
        db.query(SleepEntry)
        .filter(SleepEntry.id == entry_id, SleepEntry.user_id == user_id)
        .first()
    )
    if not entry:
        return False
    db.delete(entry)
    db.commit()
    return True


def get_admin_sleep_report(db: Session, user_ids: list[int]) -> dict:
    if not user_ids:
        return {"averageHours": 0.0, "totalEntries": 0, "totalHours": 0.0, "topSleepers": []}

    window_dates = _get_window_dates()
    start_date = window_dates[0]
    end_date = window_dates[-1]

    stats = (
        db.query(
            SleepEntry.user_id.label("user_id"),
            User.full_name.label("name"),
            User.email.label("email"),
            func.avg(SleepEntry.duration_hours).label("avg_hours"),
            func.count(SleepEntry.id).label("entries")
        )
        .join(User, User.id == SleepEntry.user_id)
        .filter(
            SleepEntry.user_id.in_(user_ids),
            SleepEntry.sleep_date >= start_date,
            SleepEntry.sleep_date <= end_date
        )
        .group_by(SleepEntry.user_id, User.full_name, User.email)
        .order_by(func.avg(SleepEntry.duration_hours).desc())
        .all()
    )

    top_sleepers = [
        {
            "name": row.name,
            "email": row.email,
            "averageHours": round(float(row.avg_hours), 2) if row.avg_hours else 0.0,
            "totalEntries": int(row.entries)
        }
        for row in stats[:5]
    ]

    overall = (
        db.query(
            func.avg(SleepEntry.duration_hours),
            func.count(SleepEntry.id),
            func.sum(SleepEntry.duration_hours)
        )
        .filter(
            SleepEntry.user_id.in_(user_ids),
            SleepEntry.sleep_date >= start_date,
            SleepEntry.sleep_date <= end_date
        )
        .first()
    )
    average_hours = round(float(overall[0]), 2) if overall and overall[0] else 0.0
    total_entries = int(overall[1]) if overall and overall[1] else 0
    total_hours = round(float(overall[2]), 2) if overall and overall[2] else 0.0

    return {
        "averageHours": average_hours,
        "totalEntries": total_entries,
        "totalHours": total_hours,
        "topSleepers": top_sleepers
    }
