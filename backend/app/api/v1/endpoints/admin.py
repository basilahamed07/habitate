from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.schemas.admin import AdminReport, AdminStats
from app.services import habit_service, sleep_service, user_service
from app.core.database import get_db
from app.utils.dependencies import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    _admin=Depends(require_admin),
    db: Session = Depends(get_db)
) -> AdminStats:
    users = user_service.list_users(db)
    user_ids = [user.id for user in users]
    report = habit_service.get_admin_report(db, user_ids)
    active_users = sum(1 for user in users if user.status == "active")
    return AdminStats(
        overallSuccessRate=report["successRate"],
        successTrend=report["successTrend"],
        totalHabits=report["totalHabits"],
        activeUsers=active_users
    )


@router.get("/report", response_model=AdminReport)
async def get_admin_report(
    _admin=Depends(require_admin),
    db: Session = Depends(get_db)
) -> AdminReport:
    user_ids = [user.id for user in user_service.list_users(db)]
    report = habit_service.get_admin_report(db, user_ids)
    sleep_report = sleep_service.get_admin_sleep_report(db, user_ids)
    report["sleepReport"] = sleep_report
    return AdminReport(**report)
