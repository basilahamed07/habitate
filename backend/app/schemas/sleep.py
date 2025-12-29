from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class SleepEntryBase(BaseModel):
    id: int
    date: date
    hours: float


class SleepCreate(BaseModel):
    date: date
    hours: float = Field(..., ge=0, le=24)


class SleepCategory(BaseModel):
    index: int
    label: str
    minHours: float
    maxHours: Optional[float] = None
    count: int
    percent: int


class SleepResponse(BaseModel):
    entries: list[SleepEntryBase]
    dailyHours: list[Optional[float]]
    dayBuckets: list[int]
    categories: list[SleepCategory]
    averageHours: float
    totalEntries: int
    bestSleep: float
    days: int
