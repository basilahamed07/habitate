from datetime import date
from typing import Iterable


def format_date(value: date) -> str:
    return value.isoformat()


def clamp(value: int, min_value: int, max_value: int) -> int:
    return max(min_value, min(value, max_value))


def sum_iter(items: Iterable[int]) -> int:
    return sum(items)
