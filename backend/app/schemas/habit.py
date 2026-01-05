from typing import Optional

from pydantic import BaseModel


class HabitRow(BaseModel):
    id: int
    habit: str
    days: list[bool]


class HabitsResponse(BaseModel):
    habits: list[str]
    habitMatrix: list[HabitRow]
    days: int
    month: str
    availableMonths: list[str]


class HabitCreate(BaseModel):
    name: str
    userId: Optional[str] = None


class HabitToggle(BaseModel):
    dayIndex: int
    done: Optional[bool] = None
    userId: Optional[str] = None
    month: Optional[str] = None
