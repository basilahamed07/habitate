from datetime import date, datetime, timedelta
import calendar
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.habit import Habit
from app.models.habit_monthly_bits import HabitMonthlyBits
from app.models.user import User

DAYS = min(settings.TRACK_WINDOW_DAYS, 31)
STREAK_TARGET = 0.8

progress_bars = [
    {"label": "Hydration", "value": 78},
    {"label": "Movement", "value": 64},
    {"label": "Mindfulness", "value": 52},
    {"label": "Nutrition", "value": 71}
]


def _month_start(value: date) -> date:
    return value.replace(day=1)


def _format_month(value: date) -> str:
    return value.strftime("%Y-%m")


def _parse_month(value: Optional[str]) -> date:
    if not value:
        return _month_start(date.today())
    parsed = datetime.strptime(value, "%Y-%m").date()
    return _month_start(parsed)


def parse_month(value: Optional[str]) -> date:
    return _parse_month(value)


def month_days(value: date) -> int:
    return _month_days(value)


def _month_days(value: date) -> int:
    return calendar.monthrange(value.year, value.month)[1]


def _bits_to_list(bits_value: Optional[object]) -> list[bool]:
    if bits_value is None:
        bits_str = ""
    elif isinstance(bits_value, memoryview):
        bits_str = bits_value.tobytes().decode()
    elif isinstance(bits_value, (bytes, bytearray)):
        bits_str = bits_value.decode()
    else:
        bits_str = str(bits_value)
    bits_str = bits_str.strip()
    normalized = "".join(char for char in bits_str if char in ("0", "1")).ljust(31, "0")[:31]
    return [char == "1" for char in normalized]


def _list_to_bits(values: list[bool]) -> str:
    bits = "".join("1" if value else "0" for value in values[:31])
    return bits.ljust(31, "0")


def _get_window_dates() -> list[date]:
    end_date = date.today()
    start_date = end_date - timedelta(days=DAYS - 1)
    return [start_date + timedelta(days=offset) for offset in range(DAYS)]


def _load_month_bits(
    db: Session, habit_ids: list[int], months: list[date]
) -> dict[tuple[int, date], list[bool]]:
    if not habit_ids or not months:
        return {}
    rows = (
        db.query(HabitMonthlyBits)
        .filter(HabitMonthlyBits.habit_id.in_(habit_ids), HabitMonthlyBits.month.in_(months))
        .all()
    )
    return {(row.habit_id, row.month): _bits_to_list(row.day_bits) for row in rows}


def _build_habit_matrix(
    habits: list[Habit],
    bits_map: dict[tuple[int, date], list[bool]],
    window_dates: list[date]
) -> list[dict]:
    habit_matrix = []
    for habit in habits:
        days = []
        for current_date in window_dates:
            month_key = _month_start(current_date)
            bits = bits_map.get((habit.id, month_key))
            if bits:
                days.append(bits[current_date.day - 1])
            else:
                days.append(False)
        habit_matrix.append({"id": habit.id, "habit": habit.name, "days": days})
    return habit_matrix


def _build_month_matrix(
    habits: list[Habit],
    bits_map: dict[tuple[int, date], list[bool]],
    month_key: date,
    day_count: int
) -> list[dict]:
    habit_matrix = []
    for habit in habits:
        bits = bits_map.get((habit.id, month_key), [False] * 31)
        days = bits[:day_count]
        if len(days) < day_count:
            days = days + [False] * (day_count - len(days))
        habit_matrix.append({"id": habit.id, "habit": habit.name, "days": days})
    return habit_matrix


def _get_daily_counts(matrix: list[dict], day_count: int) -> tuple[list[int], int]:
    counts = [0] * day_count
    completed = 0
    for row in matrix:
        for index, done in enumerate(row["days"]):
            if done:
                counts[index] += 1
                completed += 1
    return counts, completed


def _calculate_success_rate(counts: list[int], habit_count: int) -> int:
    if habit_count <= 0 or not counts:
        return 0
    total_slots = habit_count * len(counts)
    return round((sum(counts) / total_slots) * 100)


def _calculate_success_trend(daily_counts: list[int], habit_count: int) -> str:
    if habit_count <= 0 or not daily_counts:
        return "+0%"
    window_len = min(7, len(daily_counts))
    current_counts = daily_counts[-window_len:]
    previous_counts = daily_counts[-2 * window_len:-window_len]
    current_rate = _calculate_success_rate(current_counts, habit_count)
    previous_rate = _calculate_success_rate(previous_counts, habit_count) if previous_counts else 0
    diff = current_rate - previous_rate
    sign = "+" if diff >= 0 else ""
    return f"{sign}{diff}%"


def _get_available_months(db: Session, user_id: int) -> list[str]:
    month_rows = (
        db.query(HabitMonthlyBits.month)
        .join(Habit, Habit.id == HabitMonthlyBits.habit_id)
        .filter(Habit.user_id == user_id)
        .distinct()
        .all()
    )
    months = {_month_start(row.month) for row in month_rows}
    months.add(_month_start(date.today()))
    return [_format_month(value) for value in sorted(months, reverse=True)]


def _ensure_month_tracking(db: Session, habits: list[Habit], month_key: date) -> None:
    if not habits:
        return
    habit_ids = [habit.id for habit in habits]
    existing = (
        db.query(HabitMonthlyBits.habit_id)
        .filter(HabitMonthlyBits.habit_id.in_(habit_ids), HabitMonthlyBits.month == month_key)
        .all()
    )
    existing_ids = {row.habit_id for row in existing}
    for habit_id in habit_ids:
        if habit_id in existing_ids:
            continue
        db.add(HabitMonthlyBits(habit_id=habit_id, month=month_key, day_bits="0" * 31))
    db.commit()


def _get_month_habits(db: Session, user_id: int, month_key: date, is_current: bool) -> list[Habit]:
    if is_current:
        habits = (
            db.query(Habit)
            .filter(Habit.user_id == user_id, Habit.is_active.is_(True))
            .order_by(Habit.id.asc())
            .all()
        )
        _ensure_month_tracking(db, habits, month_key)
        return habits
    return (
        db.query(Habit)
        .join(HabitMonthlyBits, HabitMonthlyBits.habit_id == Habit.id)
        .filter(Habit.user_id == user_id, HabitMonthlyBits.month == month_key)
        .order_by(Habit.id.asc())
        .all()
    )


def list_habits(db: Session, user_id: int, month: Optional[date] = None) -> dict:
    month_key = _month_start(month or date.today())
    is_current = month_key == _month_start(date.today())
    habits = _get_month_habits(db, user_id, month_key, is_current)
    day_count = _month_days(month_key)
    bits_map = _load_month_bits(db, [habit.id for habit in habits], [month_key])
    habit_matrix = _build_month_matrix(habits, bits_map, month_key, day_count)
    return {
        "habits": [habit.name for habit in habits],
        "habitMatrix": habit_matrix,
        "days": day_count,
        "month": _format_month(month_key),
        "availableMonths": _get_available_months(db, user_id)
    }


def add_habit(db: Session, user_id: int, name: str) -> dict:
    habit = Habit(user_id=user_id, name=name, is_active=True)
    db.add(habit)
    db.commit()
    db.refresh(habit)
    month_key = _month_start(date.today())
    db.add(HabitMonthlyBits(habit_id=habit.id, month=month_key, day_bits="0" * 31))
    db.commit()
    data = list_habits(db, user_id, month_key)
    new_row = next((row for row in data["habitMatrix"] if row["id"] == habit.id), None)
    return {"habitMatrix": data["habitMatrix"], "habit": new_row}


def toggle_habit(
    db: Session,
    user_id: int,
    habit_id: int,
    day_index: int,
    done: Optional[bool],
    month: Optional[date]
) -> Optional[dict]:
    month_key = _month_start(month or date.today())
    if month_key != _month_start(date.today()):
        return None
    habit = (
        db.query(Habit)
        .filter(Habit.id == habit_id, Habit.user_id == user_id, Habit.is_active.is_(True))
        .first()
    )
    if not habit:
        return None
    day_count = _month_days(month_key)
    if day_index < 0 or day_index >= day_count:
        return None
    record = (
        db.query(HabitMonthlyBits)
        .filter(HabitMonthlyBits.habit_id == habit_id, HabitMonthlyBits.month == month_key)
        .first()
    )
    if not record:
        record = HabitMonthlyBits(habit_id=habit_id, month=month_key, day_bits="0" * 31)
        db.add(record)
    bits = _bits_to_list(record.day_bits)
    bit_index = day_index
    if done is None:
        bits[bit_index] = not bits[bit_index]
    else:
        bits[bit_index] = done
    record.day_bits = _list_to_bits(bits)
    db.commit()
    data = list_habits(db, user_id, month_key)
    return {"habitMatrix": data["habitMatrix"]}


def get_dashboard(db: Session, user_id: int, month: Optional[date] = None) -> dict:
    month_key = _month_start(month or date.today())
    is_current = month_key == _month_start(date.today())
    habits = _get_month_habits(db, user_id, month_key, is_current)
    day_count = _month_days(month_key)
    bits_map = _load_month_bits(db, [habit.id for habit in habits], [month_key])
    habit_matrix = _build_month_matrix(habits, bits_map, month_key, day_count)
    daily_counts, completed = _get_daily_counts(habit_matrix, day_count)
    if is_current and daily_counts:
        current_day = min(date.today().day, day_count)
        effective_counts = daily_counts[:current_day]
    else:
        effective_counts = daily_counts
    total_habits = len(habit_matrix)
    total_slots = total_habits * len(effective_counts)
    success_rate = round((sum(effective_counts) / total_slots) * 100) if total_slots else 0
    success_trend = _calculate_success_trend(effective_counts, total_habits)
    if not daily_counts:
        today_index = 0
    elif is_current:
        today_index = min(len(daily_counts) - 1, date.today().day - 1)
    else:
        today_index = len(daily_counts) - 1
    completed_habits = daily_counts[today_index] if daily_counts else 0
    streak_days = 0
    if total_habits > 0 and effective_counts:
        for day_index in range(len(effective_counts) - 1, -1, -1):
            daily_rate = effective_counts[day_index] / total_habits
            if daily_rate >= STREAK_TARGET:
                streak_days += 1
            else:
                break

    active_users = db.query(User).filter(User.status == "active").count()
    total_habits_tracked = db.query(Habit).filter(Habit.is_active.is_(True)).count()

    stats = {
        "successRate": success_rate,
        "successTrend": success_trend,
        "streakDays": streak_days,
        "completedHabits": completed_habits,
        "totalHabits": total_habits,
        "activeUsers": active_users,
        "totalHabitsTracked": total_habits_tracked
    }
    return {
        "stats": stats,
        "progressBars": progress_bars,
        "dailyCounts": daily_counts,
        "successRate": success_rate,
        "month": _format_month(month_key),
        "availableMonths": _get_available_months(db, user_id)
    }


def get_habit_count(db: Session, user_id: int) -> int:
    return db.query(Habit).filter(Habit.user_id == user_id, Habit.is_active.is_(True)).count()


def delete_habit(db: Session, user_id: int, habit_id: int) -> bool:
    habit = (
        db.query(Habit)
        .filter(Habit.id == habit_id, Habit.user_id == user_id, Habit.is_active.is_(True))
        .first()
    )
    if not habit:
        return False
    habit.is_active = False
    db.commit()
    return True


def get_admin_report(db: Session, user_ids: list[int]) -> dict:
    if not user_ids:
        return {
            "totalUsers": 0,
            "totalHabits": 0,
            "totalCompleted": 0,
            "totalSlots": 0,
            "successRate": 0,
            "dailyCounts": [0] * DAYS,
            "topHabits": []
        }
    habits = (
        db.query(Habit)
        .filter(Habit.user_id.in_(user_ids), Habit.is_active.is_(True))
        .all()
    )
    habit_ids = [habit.id for habit in habits]
    window_dates = _get_window_dates()
    months = sorted({_month_start(item) for item in window_dates})
    bits_map = _load_month_bits(db, habit_ids, months)

    daily_counts = [0] * DAYS
    habit_totals: dict[str, int] = {}
    for habit in habits:
        days = _build_habit_matrix([habit], bits_map, window_dates)[0]["days"]
        done_count = sum(1 for value in days if value)
        habit_totals[habit.name] = habit_totals.get(habit.name, 0) + done_count
        for index, done in enumerate(days):
            if done:
                daily_counts[index] += 1

    total_habits = len(habits)
    total_completed = sum(daily_counts)
    total_slots = total_habits * DAYS
    success_rate = round((total_completed / total_slots) * 100) if total_slots else 0
    success_trend = _calculate_success_trend(daily_counts, total_habits)
    top_habits = sorted(
        [{"name": name, "total": total} for name, total in habit_totals.items()],
        key=lambda item: item["total"],
        reverse=True
    )[:10]

    return {
        "totalUsers": len(user_ids),
        "totalHabits": total_habits,
        "totalCompleted": total_completed,
        "totalSlots": total_slots,
        "successRate": success_rate,
        "successTrend": success_trend,
        "dailyCounts": daily_counts,
        "topHabits": top_habits
    }
