from pydantic import BaseModel


class AdminStats(BaseModel):
    overallSuccessRate: int
    successTrend: str
    totalHabits: int
    activeUsers: int


class ReportHabit(BaseModel):
    name: str
    total: int


class AdminReport(BaseModel):
    totalUsers: int
    totalHabits: int
    totalCompleted: int
    totalSlots: int
    successRate: int
    successTrend: str
    dailyCounts: list[int]
    topHabits: list[ReportHabit]
