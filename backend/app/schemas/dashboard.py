from pydantic import BaseModel


class ProgressBar(BaseModel):
    label: str
    value: int


class DashboardStats(BaseModel):
    successRate: int
    successTrend: str
    streakDays: int
    completedHabits: int
    totalHabits: int
    activeUsers: int
    totalHabitsTracked: int


class DashboardResponse(BaseModel):
    stats: DashboardStats
    progressBars: list[ProgressBar]
    dailyCounts: list[int]
    successRate: int
    month: str
    availableMonths: list[str]
